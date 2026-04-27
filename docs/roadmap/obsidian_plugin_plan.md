# 뇌사료 ↔ 옵시디언 플러그인 연동 구현 계획

> 작성일: 2026-04-16  
> 작업 경로: `c:\project\my_util\memo_server`  
> 서버 주소: `your-server-ip:5093`  
> 원격 경로: `/home/your-username/Script/memo_server`

---

## 1. 제품 컨셉 (확정)

```
뇌사료 단독:       웹 기반 빠른 캡처 메모 + AI 태깅/요약
뇌사료 + 옵시디언: 뇌사료(INPUT/캡처) → 옵시디언(PROCESS/정리/아카이브/그래프)
```

**포지셔닝 핵심:**
- 뇌사료는 옵시디언의 "웹 프론트엔드 + AI 레이어" 역할
- 옵시디언 사용자의 고질적 불편(로컬 파일 기반 → 모바일/웹 접근 어려움)을 해결
- 뇌사료 → 옵시디언은 **단방향 동기화** (뇌사료가 Single Source of Truth)
- 옵시디언은 읽기/정리 전용 뷰로 사용

---

## 2. 현재 아키텍처 현황

### 2-1. 서버 구조 (Flask + Blueprint)
```
app/
├── __init__.py          # create_app(), Blueprint 등록, 보안 미들웨어
├── constants.py         # GROUP_DEFAULT="default", GROUP_FILES="files", GROUP_DONE="done"
├── database.py          # SQLite, DB_PATH=data/memos.db
├── auth.py              # @login_required 데코레이터 (세션 기반)
├── security.py          # Fernet 암호화/복호화 (PBKDF2 + ENCRYPTION_SEED)
├── ai.py                # Gemini AI 태깅/요약
└── routes/
    ├── __init__.py      # register_blueprints(app) ← 여기에 새 Blueprint 추가
    ├── memo.py          # /api/memos CRUD
    ├── file.py          # /api/files 업로드/다운로드
    ├── ai.py            # /api/ai
    ├── auth.py          # /login /logout
    ├── settings.py      # /api/settings
    └── main.py          # / 메인 페이지
```

### 2-2. DB 스키마 (SQLite: data/memos.db)
```sql
memos(
    id, title, content, summary, color,
    is_pinned, status,           -- status: 'active' | 'done'
    group_name,                  -- 'default' | 'files' | 'done' | 사용자 정의
    is_encrypted,                -- 0 | 1
    created_at, updated_at
)
tags(id, memo_id, name, source)          -- source: 'user' | 'ai'
attachments(id, memo_id, filename, original_name, file_type, size, created_at)
memo_links(id, source_id, target_id)    -- 백링크/전방링크
```

### 2-3. 현재 인증 방식
- **세션 기반** (`session['logged_in']`) — 브라우저 전용
- API Token 인증 **없음** → Phase 1에서 추가 필요

### 2-4. 암호화 방식
```python
# app/security.py
# PBKDF2(password + ENCRYPTION_SEED) → Fernet 키 → 본문 암호화
# .env의 ENCRYPTION_SEED 필수
encrypt_content(content, password)
decrypt_content(encrypted_data, password)  # 실패 시 None 반환
```
암호화 메모는 `is_encrypted=1`, 복호화는 `/api/memos/{id}/decrypt` POST로 처리.

---

## 3. 구현 계획 (3단계)

---

### Phase 1. API Token 인증 추가 (뇌사료 서버)

**목적:** 세션 없이 외부에서 API를 호출할 수 있도록 Token 인증 추가  
**원칙:** 기존 `@login_required` 데코레이터를 건드리지 않고 새 데코레이터 추가

#### 1-1. `.env`에 토큰 추가
```env
# .env (기존 항목 유지, 아래 추가)
OBSIDIAN_API_TOKEN=your_secret_token_here
```

#### 1-2. `app/auth.py`에 토큰 인증 데코레이터 추가
```python
def token_required(view):
    """API Token 기반 인증 데코레이터 (Obsidian 플러그인 전용)"""
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        token = request.headers.get('X-API-Token') or request.args.get('token')
        expected = os.getenv('OBSIDIAN_API_TOKEN', '')
        if not expected or token != expected:
            return jsonify({'error': 'Unauthorized'}), 401
        return view(**kwargs)
    return wrapped_view
```

#### 1-3. 새 Blueprint 파일 생성: `app/routes/sync.py`
```python
# app/routes/sync.py
# 옵시디언 동기화 전용 Blueprint

sync_bp = Blueprint('sync', __name__)

# GET /api/sync/export
# 전체 메모 목록 반환 (암호화 메모는 플레이스홀더 처리)
# 쿼리파라미터: since=2024-01-01T00:00:00 (증분 동기화용)

# POST /api/sync/decrypt/<id>
# 단일 암호화 메모 복호화 반환
# 헤더: X-Memo-Password: 비밀번호

# GET /api/sync/groups
# 그룹 목록 반환
```

#### 1-4. `app/routes/__init__.py`에 Blueprint 등록
```python
from .sync import sync_bp
app.register_blueprint(sync_bp)
```

**완료 기준:** `curl -H "X-API-Token: xxx" http://서버/api/sync/export` 가 JSON 반환

---

### Phase 2. Python 동기화 스크립트 (로컬 실행)

**목적:** 뇌사료 API를 호출해서 옵시디언 Vault에 .md 파일로 저장  
**실행 방식:** Windows Task Scheduler 또는 cron으로 주기 실행 (5~10분)  
**위치:** 프로젝트 루트의 `obsidian_sync/` 폴더

#### 2-1. 파일 구조
```
obsidian_sync/
├── obsidian_sync.py     # 메인 동기화 스크립트
├── config.json          # 설정 파일
└── last_sync.txt        # 마지막 동기화 시각 저장 (증분 동기화용)
```

#### 2-2. `obsidian_sync/config.json`
```json
{
    "server_url": "http://your-server-ip:5093",
    "api_token": "your_secret_token_here",
    "vault_path": "C:/Users/your-username/Documents/ObsidianVault/뇌사료",
    "sync_interval_minutes": 10,
    "encrypted_memo_handling": "placeholder",
    "frontmatter": true,
    "group_to_folder": {
        "default": "inbox",
        "files": "files",
        "done": "archive"
    }
}
```

#### 2-3. 변환 규칙 (뇌사료 → .md)

| 뇌사료 필드 | 옵시디언 변환 |
|---|---|
| `title` | 파일명 + H1 헤더 |
| `content` | 본문 (HTML → Markdown 변환) |
| `tags` | frontmatter `tags:` + 본문 `#태그` |
| `group_name` | 하위 폴더 분류 |
| `backlinks` | 본문 하단 `[[링크제목]]` |
| `is_encrypted=1` | `[🔒 암호화된 메모 — 뇌사료에서 확인]` |
| `created_at` | frontmatter `date:` |
| `updated_at` | frontmatter `updated:` |
| `summary` | frontmatter `summary:` |

#### 2-4. 생성될 .md 예시
```markdown
---
id: 42
date: 2026-04-15
updated: 2026-04-16
tags: [python, flask, ai]
source: 뇌사료
group: default
---

# 메모 제목

본문 내용...

---
**Tags:** #python #flask #ai
**Links:** [[관련 메모 제목]]
**Source:** [뇌사료에서 열기](http://your-server-ip:5093)
```

**완료 기준:** 스크립트 실행 후 Vault 폴더에 .md 파일 생성 확인

---

### Phase 3. TypeScript 옵시디언 플러그인 (선택적 고도화)

**목적:** Phase 2가 안정화된 후, 옵시디언 내에서 직접 UI 제공  
**전제조건:** Phase 1, 2 완료 후 진행  
**개발 언어:** TypeScript (옵시디언 플러그인 필수)

#### 3-1. 플러그인 저장소 구조
```
obsidian-brainsryo-plugin/    # 별도 Git 저장소 권장
├── src/
│   ├── main.ts               # 플러그인 진입점
│   ├── api.ts                # 뇌사료 API 클라이언트
│   ├── converter.ts          # 뇌사료 JSON → Obsidian .md 변환
│   ├── settings.ts           # 플러그인 설정 UI
│   └── modal.ts              # 암호화 메모 비밀번호 입력 모달
├── manifest.json
├── package.json
└── tsconfig.json
```

#### 3-2. 플러그인 설정 항목 (UI)
```
뇌사료 서버 URL:  [http://your-server-ip:5093]
API Token:        [***************]
저장 폴더:        [뇌사료/]
동기화 주기:      [10분]
암호화 메모 처리: [플레이스홀더 ▼]  ← 또는 "비밀번호 입력"
자동 동기화:      [ON/OFF]
```

#### 3-3. 암호화 메모 처리 흐름 (플러그인 버전)
```
옵시디언에서 암호화 메모 클릭
  → 비밀번호 입력 모달 표시 (Obsidian Modal API)
  → POST /api/sync/decrypt/{id} (헤더: X-Memo-Password)
  → 복호화 성공 시 임시 .md 생성 후 표시
  → 닫으면 임시 파일 삭제 (디스크에 평문 저장 안 함)
```

#### 3-4. 개발 우선순위
1. 단방향 동기화 (뇌사료 → 옵시디언) 기본 버전
2. 설정 UI
3. 증분 동기화 (마지막 동기화 이후 변경분만)
4. 암호화 메모 지원 (비밀번호 모달)
5. (미래) 옵시디언 → 뇌사료 import 기능

---

## 4. 구현 순서 체크리스트

### Phase 1 — API Token (뇌사료 서버 수정)
- [ ] `.env`에 `OBSIDIAN_API_TOKEN` 추가
- [ ] `.env.example`에도 항목 추가 (값 없이)
- [ ] `app/auth.py`에 `token_required` 데코레이터 추가
- [ ] `app/routes/sync.py` 파일 생성
  - [ ] `GET /api/sync/export` 엔드포인트 (`since` 파라미터 지원)
  - [ ] `POST /api/sync/decrypt/<id>` 엔드포인트
  - [ ] `GET /api/sync/groups` 엔드포인트
- [ ] `app/routes/__init__.py`에 `sync_bp` 등록
- [ ] 서버 배포 (`python deploy.py` — 사용자 승인 필수)

### Phase 2 — Python 동기화 스크립트
- [ ] `obsidian_sync/` 폴더 생성
- [ ] `obsidian_sync/config.json` 작성
- [ ] `obsidian_sync/obsidian_sync.py` 작성
  - [ ] API 호출 (Token 인증)
  - [ ] HTML → Markdown 변환 (`markdownify` 라이브러리)
  - [ ] frontmatter 생성
  - [ ] 태그/백링크 변환
  - [ ] 그룹 → 폴더 분류
  - [ ] 증분 동기화 (`last_sync.txt`)
  - [ ] 암호화 메모 플레이스홀더 처리
- [ ] 스크립트 테스트 (실제 Vault에 파일 생성 확인)
- [ ] Windows Task Scheduler 등록

### Phase 3 — TypeScript 옵시디언 플러그인 (나중에)
- [ ] Node.js 개발 환경 세팅
- [ ] obsidian-sample-plugin 템플릿 클론
- [ ] API 클라이언트 구현
- [ ] 설정 UI 구현
- [ ] 동기화 로직 구현
- [ ] 암호화 메모 모달 구현
- [ ] 로컬 설치 테스트 (`.obsidian/plugins/` 복사)

---

## 5. API 스펙 (Phase 1에서 구현할 엔드포인트)

### `GET /api/sync/export`
```
Headers: X-API-Token: {OBSIDIAN_API_TOKEN}
Params:
  - since (optional): ISO 8601 datetime, 이 시각 이후 수정된 메모만 반환
  - limit (optional): 기본 1000
Response:
[
  {
    "id": 42,
    "title": "메모 제목",
    "content": "<p>HTML 본문</p>",
    "summary": "AI 요약",
    "tags": [{"name": "python", "source": "ai"}, ...],
    "group_name": "default",
    "is_encrypted": false,
    "is_pinned": false,
    "backlinks": [{"source_id": 10, "title": "다른 메모"}],
    "links": [{"target_id": 20, "title": "링크된 메모"}],
    "created_at": "2026-04-15T10:00:00",
    "updated_at": "2026-04-16T08:00:00"
  },
  // is_encrypted=true인 경우:
  {
    "id": 99,
    "title": "암호화된 메모",
    "content": null,
    "is_encrypted": true,
    ...
  }
]
```

### `POST /api/sync/decrypt/<id>`
```
Headers:
  X-API-Token: {OBSIDIAN_API_TOKEN}
  X-Memo-Password: {메모_비밀번호}
Response (성공): {"content": "복호화된 본문"}
Response (실패): {"error": "Invalid password"}, 403
```

### `GET /api/sync/groups`
```
Headers: X-API-Token: {OBSIDIAN_API_TOKEN}
Response: {"groups": ["default", "files", "done", "custom_group1", ...]}
```

---

## 6. 주의사항 및 설계 원칙

> **단방향 원칙:** 뇌사료 → 옵시디언 방향만 동기화.
> 옵시디언에서 .md를 수정해도 뇌사료 DB에는 반영되지 않음.
> 양방향 동기화는 충돌 처리 복잡도가 높아 Phase 3 이후 별도 검토.

> **암호화 메모 보안:**
> 복호화된 본문은 절대 디스크에 저장하지 않음.
> Phase 2 스크립트는 기본적으로 `encrypted_memo_handling: "placeholder"` 유지.

> **파일명 규칙:** 옵시디언 파일명 특수문자 금지 (`/ \ : * ? " < > |`)
> 뇌사료 제목의 해당 문자는 `_`로 치환. 중복 시 `제목_id42.md` 형식.

---

## 7. 작업 이어받기 안내 (다른 AI 인스턴스용)

1. **먼저 읽을 파일들:**
   - `app/auth.py` — 현재 인증 구조 확인
   - `app/routes/__init__.py` — Blueprint 등록 방식 확인
   - `app/routes/memo.py` — 기존 API 패턴 참고
   - `app/security.py` — 암호화/복호화 함수 확인
   - `.env` — `OBSIDIAN_API_TOKEN` 추가 여부 확인

2. **시작점:** Phase 1 체크리스트 항목 순서대로 진행

3. **배포 방법:** 수정 완료 후 `python deploy.py` 실행
   (반드시 사용자 승인 후 실행 — 사용자 규칙)

4. **테스트:**
   ```bash
   curl -H "X-API-Token: {토큰}" http://your-server-ip:5093/api/sync/export
   ```

5. **추가 의존성:** `pip install markdownify` (Phase 2 스크립트에서 필요)
