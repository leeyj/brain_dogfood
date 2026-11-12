"""
뇌사료(Brain Dogfood) MCP 서버 — Claude Desktop 연동용 (stdio)

동작 방식
  Claude Desktop ──stdio──▶ 이 스크립트(내 PC) ──HTTP(Bearer)──▶ 뇌사료 서버(/api/external/*)

  - 메모 저장소는 기존 뇌사료 서버 그대로입니다. 이 스크립트는 DB를 직접 열지 않고
    외부 연동 API(external_api_token)만 사용합니다.
  - 암호화된 메모는 본문을 절대 반환하지 않으며, 비밀번호를 받는 도구도 없습니다.
  - 삭제 도구는 의도적으로 제공하지 않습니다.

환경 변수
  BRAIN_URL              뇌사료 서버 주소 (예: http://your-server-ip:5093)          [필수]
  BRAIN_TOKEN            config.json의 external_api_token 값                     [필수]
  BRAIN_MCP_READ_ONLY    "true"면 생성/수정 도구를 등록하지 않음 (기본 false)
  BRAIN_MCP_HIDE_GROUPS  쉼표로 구분한 그룹명. 해당 그룹 메모는 Claude에 노출하지 않음
  BRAIN_MCP_TIMEOUT      HTTP 타임아웃 초 (기본 15)
"""

import os
import sys
import logging
from typing import Literal, Optional

import httpx
from mcp.server.fastmcp import FastMCP

# stdio 전송에서는 stdout이 프로토콜 채널이므로 로그는 반드시 stderr로만 출력
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="[brain-mcp] %(message)s")
log = logging.getLogger("brain-mcp")

BRAIN_URL = os.getenv("BRAIN_URL", "").rstrip("/")
BRAIN_TOKEN = os.getenv("BRAIN_TOKEN", "")
READ_ONLY = os.getenv("BRAIN_MCP_READ_ONLY", "false").strip().lower() in ("1", "true", "yes")
HIDE_GROUPS = {g.strip() for g in os.getenv("BRAIN_MCP_HIDE_GROUPS", "").split(",") if g.strip()}
TIMEOUT = float(os.getenv("BRAIN_MCP_TIMEOUT", "15"))

mcp = FastMCP("brain-dogfood")


class BrainError(Exception):
    pass


def _client() -> httpx.Client:
    if not BRAIN_URL or not BRAIN_TOKEN:
        raise BrainError("BRAIN_URL / BRAIN_TOKEN 환경 변수가 설정되지 않았습니다 (claude_desktop_config.json의 env 확인).")
    return httpx.Client(
        base_url=BRAIN_URL,
        headers={"Authorization": f"Bearer {BRAIN_TOKEN}"},
        timeout=TIMEOUT,
    )


def _request(method: str, path: str, **kwargs):
    try:
        with _client() as c:
            r = c.request(method, path, **kwargs)
    except httpx.HTTPError as e:
        raise BrainError(f"뇌사료 서버에 연결할 수 없습니다 ({BRAIN_URL}): {e.__class__.__name__}")
    if r.status_code in (401, 403):
        raise BrainError("인증 실패: BRAIN_TOKEN이 서버 config.json의 external_api_token과 일치하는지 확인하세요.")
    if r.status_code == 404:
        raise BrainError("메모를 찾을 수 없습니다.")
    if r.status_code >= 400:
        try:
            msg = r.json().get("error", r.text)
        except ValueError:
            msg = r.text
        raise BrainError(f"서버 오류 ({r.status_code}): {msg}")
    return r.json()


def _hidden(group: Optional[str]) -> bool:
    return bool(group) and group in HIDE_GROUPS


def _fetch_memo(uuid: str) -> dict:
    memo = _request("GET", f"/api/external/memos/{uuid}/json")
    if _hidden(memo.get("group_name")):
        raise BrainError("메모를 찾을 수 없습니다.")  # 숨김 그룹은 존재 자체를 노출하지 않음
    return memo


def _user_tags(memo: dict) -> list:
    return [t["name"] for t in memo.get("tags", []) if t.get("source") in ("user", None)]


def _summary_line(m: dict) -> dict:
    return {k: m.get(k) for k in ("uuid", "title", "group", "tags", "category", "updated_at", "content_preview", "is_encrypted") if k in m}


# ─────────────────────────── 읽기 도구 ───────────────────────────

@mcp.tool()
def search_memos(query: str = "", tag: str = "", group: str = "all", limit: int = 20) -> list:
    """뇌사료 메모를 검색합니다 (제목/본문 부분 일치). 완료·보관·휴지통 메모는 제외됩니다.

    Args:
        query: 검색어. 비우면 최근 수정순 전체.
        tag: 태그로 필터 (예: "회의"). 지정 시 group은 무시됨.
        group: 그룹명 필터 (기본 "all").
        limit: 최대 개수 (1~50).
    Returns: uuid, title, group, tags, updated_at, content_preview 목록. 본문 전체는 read_memo로 조회.
    """
    params = {"q": query, "group": group or "all"}
    if tag:
        params["tag"] = tag.lstrip("#")
    rows = _request("GET", "/api/external/search", params=params)
    rows = [r for r in rows if not _hidden(r.get("group"))]
    return [_summary_line(r) for r in rows[: max(1, min(limit, 50))]]


@mcp.tool()
def list_recent_memos(limit: int = 20) -> list:
    """최근 수정된 활성 메모 목록을 반환합니다 (고정 메모 우선). 본문은 포함하지 않습니다.

    Args:
        limit: 최대 개수 (1~100).
    """
    rows = _request("GET", "/api/external/memos")
    rows = [r for r in rows if not _hidden(r.get("group"))]
    return [_summary_line(r) for r in rows[: max(1, min(limit, 100))]]


@mcp.tool()
def read_memo(uuid: str) -> dict:
    """uuid로 메모 하나의 전체 내용을 읽습니다. 암호화된 메모는 본문이 제공되지 않습니다.

    Args:
        uuid: search_memos / list_recent_memos 결과의 uuid.
    """
    m = _fetch_memo(uuid)
    result = {
        "uuid": m.get("uuid"),
        "title": m.get("title"),
        "group": m.get("group_name"),
        "category": m.get("category"),
        "status": m.get("status"),
        "is_pinned": bool(m.get("is_pinned")),
        "due_date": m.get("due_date"),
        "tags": [t["name"] for t in m.get("tags", [])],
        "attachments": [a.get("original_name") for a in m.get("attachments", [])],
        "created_at": m.get("created_at"),
        "updated_at": m.get("updated_at"),
    }
    if m.get("is_encrypted"):
        result["content"] = None
        result["note"] = "암호화된 메모입니다. 본문은 MCP로 제공되지 않습니다 (뇌사료 웹 UI에서 확인)."
    else:
        result["content"] = m.get("content") or ""
        if m.get("summary"):
            result["ai_summary"] = m.get("summary")
    return result


@mcp.tool()
def list_tags() -> list:
    """뇌사료에 존재하는 모든 태그 이름 목록을 반환합니다."""
    return _request("GET", "/api/external/tags")


# ─────────────────────────── 쓰기 도구 ───────────────────────────

def _guard_writable(memo: dict):
    if memo.get("is_encrypted"):
        raise BrainError("암호화된 메모는 MCP로 수정할 수 없습니다.")


def create_memo(
    content: str,
    title: str = "",
    group: str = "default",
    tags: Optional[list[str]] = None,
    due_date: Optional[str] = None,
) -> dict:
    """새 메모를 만듭니다 (Google Keep의 '메모 추가'와 동일한 용도).

    Args:
        content: 마크다운 본문. 본문 안의 #태그, [[#ID]] 링크도 인식됩니다.
        title: 제목. 비우면 본문 첫 줄로 자동 생성.
        group: 그룹명 (기본 "default").
        tags: 태그 목록 (예: ["장보기", "할일"]).
        due_date: 마감일 "YYYY-MM-DD".
    Returns: 생성된 메모의 uuid, title.
    """
    if _hidden(group):
        raise BrainError(f"'{group}' 그룹은 MCP에서 숨김 처리되어 있어 쓸 수 없습니다.")
    payload = {
        "title": title,
        "content": content,
        "group": group or "default",
        "tags": [t.lstrip("#") for t in (tags or []) if t.strip()],
    }
    if due_date:
        payload["due_date"] = due_date
    res = _request("POST", "/api/external/memos", json=payload)
    return {"uuid": res.get("uuid"), "title": res.get("title"), "message": "created"}


def append_to_memo(uuid: str, text: str) -> dict:
    """기존 메모 본문 끝에 내용을 덧붙입니다 (체크리스트 항목 추가, 메모 보충 등).

    Args:
        uuid: 대상 메모 uuid.
        text: 덧붙일 마크다운 텍스트.
    """
    memo = _fetch_memo(uuid)
    _guard_writable(memo)
    base = (memo.get("content") or "").rstrip()
    new_content = f"{base}\n\n{text.strip()}" if base else text.strip()
    _request("PATCH", f"/api/external/memos/{uuid}", json={
        "content": new_content,
        "tags": _user_tags(memo),  # 본문 갱신 시 기존 사용자 태그 유지
    })
    return {"uuid": uuid, "message": "appended"}


def update_memo(
    uuid: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    tags: Optional[list[str]] = None,
    due_date: Optional[str] = None,
    status: Optional[Literal["active", "done"]] = None,
    is_pinned: Optional[bool] = None,
) -> dict:
    """메모의 일부 필드를 수정합니다. 지정하지 않은 필드는 그대로 둡니다.
    content를 바꾸면 본문 전체가 교체되므로, 덧붙이기만 할 때는 append_to_memo를 쓰세요.

    Args:
        uuid: 대상 메모 uuid.
        title: 새 제목.
        content: 새 본문(전체 교체).
        tags: 새 사용자 태그 목록(전체 교체). AI 태그는 유지됨.
        due_date: 마감일 "YYYY-MM-DD" (빈 문자열이면 마감일 제거).
        status: "done"이면 완료 처리, "active"면 다시 활성화.
        is_pinned: 고정 여부.
    """
    memo = _fetch_memo(uuid)
    _guard_writable(memo)
    patch = {}
    if title is not None:
        patch["title"] = title
    if content is not None:
        patch["content"] = content
    if tags is not None:
        patch["tags"] = [t.lstrip("#") for t in tags if t.strip()]
    elif content is not None:
        patch["tags"] = _user_tags(memo)
    if due_date is not None:
        patch["due_date"] = due_date
    if status is not None:
        patch["status"] = status
    if is_pinned is not None:
        patch["is_pinned"] = is_pinned
    if not patch:
        return {"uuid": uuid, "message": "nothing to update"}
    _request("PATCH", f"/api/external/memos/{uuid}", json=patch)
    return {"uuid": uuid, "message": "updated", "fields": sorted(patch.keys())}


if not READ_ONLY:
    mcp.tool()(create_memo)
    mcp.tool()(append_to_memo)
    mcp.tool()(update_memo)


def main():
    log.info("server=%s read_only=%s hidden_groups=%s", BRAIN_URL or "(unset)", READ_ONLY, sorted(HIDE_GROUPS) or "-")
    mcp.run()  # stdio


if __name__ == "__main__":
    main()
