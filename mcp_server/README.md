# 뇌사료 MCP 서버 (Claude Desktop 연동)

Claude Desktop에서 뇌사료 메모를 검색·조회·작성할 수 있게 해 주는 로컬 MCP 서버입니다.

```
Claude Desktop ──stdio──▶ brain_mcp.py (내 PC) ──HTTP + Bearer──▶ 뇌사료 서버 /api/external/*
```

- 메모는 지금처럼 **내 뇌사료 서버에만 저장**됩니다. 이 스크립트는 DB를 직접 열지 않고 외부 연동 API만 호출합니다.
- **암호화 메모 본문은 절대 반환하지 않습니다.** 비밀번호를 받는 도구도 없습니다.
- **삭제 도구는 없습니다.** (완료 처리 `status="done"`만 가능)

## ⚠️ 알아둘 점 (프라이버시)

MCP 도구가 읽어온 메모 내용은 대화의 일부로 Claude(Anthropic API)에 전달됩니다.
저장소가 외부로 옮겨지는 것은 아니지만, **Claude가 읽은 메모는 그 대화 안에서 Anthropic으로 전송**됩니다.
민감한 메모는 다음 중 하나로 보호하세요.

| 방법 | 효과 |
|---|---|
| 뇌사료에서 메모 암호화 | MCP로 본문이 절대 나가지 않음 |
| `BRAIN_MCP_HIDE_GROUPS` | 지정 그룹의 메모는 검색·조회·작성 모두 불가 (존재 자체를 숨김) |
| `BRAIN_MCP_READ_ONLY=true` | 생성/수정 도구를 등록하지 않음 |
| Claude Desktop 도구 권한 | 도구 호출마다 승인하도록 설정 |

## 제공 도구

| 도구 | 설명 |
|---|---|
| `search_memos(query, tag, group, limit)` | 제목/본문 검색, 태그·그룹 필터 |
| `list_recent_memos(limit)` | 최근 수정 메모 목록 (본문 제외) |
| `read_memo(uuid)` | 메모 전체 내용 |
| `list_tags()` | 전체 태그 목록 |
| `create_memo(content, title, group, tags, due_date)` | 새 메모 *(쓰기)* |
| `append_to_memo(uuid, text)` | 본문 끝에 덧붙이기 *(쓰기)* |
| `update_memo(uuid, title, content, tags, due_date, status, is_pinned)` | 부분 수정, 완료 처리 *(쓰기)* |

## 설치

1. **서버**: 뇌사료 설정 → 외부 API 토큰(`config.json`의 `external_api_token`)이 설정돼 있어야 합니다.
   이번에 수정된 백엔드(`app/`)를 서버에 배포해야 `create_memo`의 태그 지정 등이 동작합니다.
2. **PC**: `pip install -r mcp_server/requirements.txt`
3. **Claude Desktop** → 설정 → 개발자 → *구성 편집*으로 `claude_desktop_config.json`을 열고 추가:

```json
{
  "mcpServers": {
    "brain-dogfood": {
      "command": "C:\\Python312\\python.exe",
      "args": ["C:\\project\\memo_server\\mcp_server\\brain_mcp.py"],
      "env": {
        "BRAIN_URL": "http://<서버주소>:5093",
        "BRAIN_TOKEN": "<external_api_token 값>",
        "BRAIN_MCP_HIDE_GROUPS": "",
        "BRAIN_MCP_READ_ONLY": "false"
      }
    }
  }
}
```

4. Claude Desktop을 완전히 종료 후 재시작 → 입력창의 도구 아이콘에 `brain-dogfood`가 보이면 성공.

사용 예: "뇌사료에서 지난주 회의 메모 찾아서 요약해줘", "장보기 메모에 '두부' 추가해줘", "이 대화 내용을 #아이디어 태그로 메모해줘"

## 보안 메모

- 토큰은 HTTP 평문으로 전송됩니다. 내부망 밖에서 접속한다면 HTTPS(리버스 프록시) 뒤에 두세요.
- 토큰이 유출되면 외부 API 전체(조회/수정)가 열리므로, 의심되면 뇌사료 설정에서 토큰을 재발급하세요.
- 로그는 stderr로만 출력되며 메모 본문은 기록하지 않습니다.
