# 2026-11-13 백엔드 점검 수정 + Claude Desktop MCP 추가

## 수정한 버그

| # | 위치 | 증상 | 원인 | 조치 |
|---|---|---|---|---|
| 1 | `app/models/memo_repo.py` get_all | 주간 보기(start/end 범위)에서 **종료일 당일 작성 메모 누락** | `created_at`이 `YYYY-MM-DDTHH:MM:SS` 형식인데 `'end 23:59:59'`과 문자열 비교 → `'T' > ' '` | `substr(created_at,1,10) BETWEEN start AND end` |
| 2 | `memo_repo.update` | 메모를 편집·저장하면 **AI 태그가 전부 삭제** | 편집 화면은 user 태그만 보내는데 서버는 태그 전체 삭제 후 재삽입 | user 태그만 삭제 (`DELETE_USER_TAGS_BY_MEMO`) |
| 3 | `memo_repo.permanent_delete` | 영구 삭제 후 **태그·링크 고아 레코드, 첨부 파일 디스크 잔존** (로컬 DB에서 고아 태그 11, 고아 링크 2건 확인) | `PRAGMA foreign_keys` 미설정으로 CASCADE 미동작 | 태그·양방향 링크·첨부 행 명시 삭제 + 커밋 후 물리 파일 삭제 |
| 4 | `memo_service.update_memo` | 비밀번호 없이 `is_encrypted=true`로 수정 시 평문이 '암호화됨'으로 표시되어 **복호화·삭제 불가 상태로 잠김** | 업데이트 경로에 비밀번호 검증 없음 (생성 경로에는 있음) | 비암호화→암호화 전환 시 비밀번호 필수 |
| 5 | `external/memo_routes.py` create | Raw Markdown 본문으로 POST 시 **항상 500** | `group_name` 변수가 JSON 분기에서만 정의 → NameError | 기본값 정의 |
| 6 | `routes/system.py` update | git pull 실패 시 엉뚱한 오류 메시지 | `false` (JS 문법) → NameError | `False` |
| 7 | `routes/system.py` check-update | `1.10.0` vs `1.9.0` 업데이트 미감지 | 버전 문자열 사전순 비교 | 숫자 튜플 비교 |

기능 추가: 외부 API 메모 생성 시 `tags`, `category`, `due_date` 지정 지원 (MCP용).

## 기존 데이터 정리 (선택)

영구 삭제된 메모의 고아 레코드는 아래로 정리 가능 (운영 DB는 백업 후 실행):

```sql
DELETE FROM tags WHERE memo_id NOT IN (SELECT id FROM memos);
DELETE FROM memo_links WHERE source_id NOT IN (SELECT id FROM memos) OR target_id NOT IN (SELECT id FROM memos);
```

## 검증

로컬 DB 사본 + 격리 포트에서 E2E 26개 항목 통과 (MCP stdio 프로토콜 포함).

## MCP

`mcp_server/` 참고.

---

## 추가 수정 (같은 날)

### 첨부파일 무인증 다운로드 차단 (`routes/file.py`, `auth.py`)
- **증상**: `/api/download/<파일명>`이 비암호화 메모·미연결 파일을 로그인 없이 반환.
- **조치**: 모든 다운로드에 로그인 세션 또는 외부 API 토큰 필수(401). 토큰 검증을 `has_valid_api_token()`으로 통합하고 `hmac.compare_digest`로 상수 시간 비교.
- 영향 없음 확인: 웹 UI(세션 쿠키), 옵시디언 플러그인·`tools/obsidian_sync.py`(Bearer) 모두 기존대로 동작.

### 옵시디언 동기화 후 서버 재시작 시 첨부파일 삭제 (`external/memo_routes.py`)
- **증상**: 옵시디언 플러그인이 pull 시 `/api/download/x.png`를 `![[x.png]]`로 치환 → push(POST) 시 서버가 본문에 링크가 없다고 판단해 첨부 연결을 모두 해제 → 다음 서버 재시작 때 `init_db` 고아 정리가 **실제 파일 삭제**.
- **조치**: 외부 POST 수정은 기존 첨부를 유지하고 본문의 새 링크만 추가 연결.
- 이미 연결이 풀린 파일이 있다면 재시작 전까지는 `attachments.memo_id IS NULL`로 남아 있으므로 확인 가능.

### deploy.py 키 인증 전환
- 비밀번호 인증·평문 비밀번호 제거 → `~/.ssh/your-ssh-key` 키 (SSH_KEY_PATH로 변경 가능), ssh-agent 우선, passphrase 대화형.
- `AutoAddPolicy` → known_hosts 검증(`RejectPolicy`).
- 순서 변경: 정지 → 정지 확인 → 정리 → 업로드 → `__pycache__` 소거 → 기동. 각 원격 명령 exit code 확인, 실패 단계 안내.
- 업로드 제외 추가: `logs`(원격 로그 덮어쓰기 방지), `brain_dogfood_stable`, `obsidian-brainsryo-plugin`, `mcp_server`, `scratch`, `docs`, `*.db`, `*.bak`.
- `.sh` 업로드 시 CRLF→LF 정규화. `--dry-run` 옵션.

---

## 프론트엔드 빌드(Vite/npm) 폐지

### 배경
바닐라가 느렸던 원인은 '바닐라'가 아니라 ① import 연쇄 13단계(순차 왕복) ② `style.css`의 `@import` 11개(순차) ③ `Cache-Control: no-cache`로 매 방문 전 파일 재검증 ④ 무압축 ⑤ Werkzeug 개발 서버 운영이었음. 빌드는 ①②만 가렸고, 해시 파일명을 쓰면서도 `no-cache`라 캐시 이점이 없었음.

### 조치
- `app/assets.py` 신설: 콘텐츠 해시 버전 URL(`?v=`), **import map**(모듈 내부 상대 import·동적 import까지 버전 URL로 치환 — JS 소스 수정 불필요), 정적+동적 import 전체 **modulepreload**(65개 병렬), `?v=` 자산 1년 `immutable` 캐시, `/static/lib` 7일 캐시, **gzip**.
- `templates/index.html`: Vite 분기 제거, CSS를 개별 `<link>`로 병렬 로드(기존 cascade 순서 유지). `static/style.css` 삭제.
- `static/app.js`: 브라우저에서 불가능한 CSS import 제거 (DEBUG 모드에서 앱 로드 실패 원인이었음).
- `brain.py`: 운영(DEBUG=False)은 **waitress**로 구동, 미설치 시 Werkzeug 대체. `requirements.txt`에 `waitress` 추가.
- 삭제: `vite.config.js`, `package.json`, `package-lock.json`, `node_modules/`, `static/dist/`. Dockerfile 빌드 스테이지·deploy.py 빌드 단계 제거.

### 함께 발견·수정한 레이스 컨디션 (`static/app.js`)
- **증상**: 간헐적으로 메모 목록이 빈 화면 (`Cannot read properties of null (reading 'onTogglePin')`).
- **원인**: 카드 이벤트 핸들러를 등록하는 `initEventHandlers()`를 기다리지 않고 첫 데이터 렌더링이 진행됨. 핸들러 모듈이 메모 데이터보다 늦게 오면 실패. 빌드 시절에도 잠재해 있던 버그.
- **조치**: 첫 `refreshData()` 전에 `await eventHandlersReady`. 100ms 지연에서 10회 중 1회 실패 → 39회 연속 성공.

### 측정 (운영과 동일한 TLS + HTTP/2, Chromium, 왕복 지연 100ms, 3회 중앙값)
| | 기존(빌드) | 신규(무빌드) |
|---|---|---|
| 첫 방문 – 메모 표시 | 2064ms | **1366ms** |
| 재방문 – 메모 표시 | 1401ms | **1007ms** |
| 재방문 – load 이벤트 | 543ms | **165ms** |
| 재방문 – 서버 재검증(304) | 41건 | 14건 (도움말 이미지만) |

※ HTTP/1.1 직접 접속(포트 5093) + 고지연 환경에서는 브라우저 동시 연결 6개 제한으로 첫 방문이 느려짐. 내부망(지연 5ms)에서는 HTTP/1.1이어도 첫 방문 891→696ms, 재방문 412→244ms로 개선.

---

## 테마: 다크 선택 시 글자가 안 보임 (설정 모달)

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | 화이트 사용 중 설정에서 '다크' 선택 시 라벨이 배경에 묻힘 | 미리보기가 배경/카드 CSS 변수만 바꾸고 글자색(`--text`/`--muted`)은 저장 시에만 계산 | 색 적용을 `ThemeEngine.applyColors()`로 통합 → 미리보기·저장·복원 공용 |
| 2 | 설정에서 '화이트' 선택 시 배경·사이드바가 **검게** 미리보기 | `rgbaToHex()`가 hex를 숫자만 뽑아 rgb로 오인 (`#f1f5f9`→`rgb(1,5,9)`) | `toHex()` 추가, hex는 그대로 정규화 |
| 3 | 저장 없이 닫아도 미리보기 색이 남음 | 복원 로직 없음 | 모달 닫힘을 MutationObserver로 감지(닫기·바깥 클릭·ESC·백업 전환 모두) → 미저장 시 복원 |
| 4 | 다크에서 '테마 프리셋' 라벨(2.3:1)·저장 버튼(2.4:1) 흐림 | `--accent`(#475569) 고정값 | `--accent`/`--accent-hover`/신규 `--on-accent`를 배경 밝기에 맞춰 조정. 강조색 배경 위 글자 6곳(`white`/`var(--bg)` 하드코딩)을 `--on-accent`로 통일 |
| 5 | 커스텀(밝은 배경+어두운 메모지)에서 모달 글자 안 보임 (1.0:1) | 모달 배경은 `--bg`인데 글자색은 `--card` 기준 | `--text-bg`/`--text-card` 분리, `.modal-content` 내부에서 `--text`를 배경 기준으로 재정의 |

화이트 테마의 색상값은 기존과 동일 (변경 없음).

검증: Playwright로 WCAG 대비율 측정 22항목 통과. 다크 설정 라벨 17.1:1, 저장 버튼 7.0:1, 강조색 글자 최저 4.8:1 (기준 4.5:1).

---

## Stable 공개 저장소 동기화 도구 점검

`sync_stable.py → sanitize_stable.py → final_audit.py` 절차는 그대로 사용 가능 (스크래치 대상으로 재현해 검증). 공개 저장소 전체 이력(52커밋)에서 실제 비밀값 유출 없음 확인.

| 도구 | 문제 | 조치 |
|---|---|---|
| `sanitize_stable.py`, `final_audit.py` | 서버 비밀번호를 탐지용으로 **평문 하드코딩** (웹 관리자 비밀번호와 동일 값) | 하드코딩 제거, `tools/_secrets.py`가 `.env`·`config.json`의 실제 비밀값을 런타임에 읽어 정확 대조·치환 |
| 〃 | `.yml`·`.csv`·`Dockerfile` 등 일부 확장자 미검사 | 확장자 무관 전체 검사 (비밀값은 바이트 단위) |
| `final_audit.py` | 실패해도 종료 코드 0 | 실패 시 exit 1 |
| `download_data.py`, `sync_from_server.py` | 비밀번호 SSH + 호스트 키 무검증 → 키 인증 전환 후 **동작 불가** | `deploy.py`의 키 인증 접속 재사용, known_hosts 검증 |
| `obsidian_sync.py` | API 토큰 자리에 로그인 비밀번호 하드코딩 (실제 토큰과 불일치로 동작 불가) | `BRAIN_TOKEN` 환경변수 → `config.json`의 `external_api_token` |
| `sync_stable.py` | — | `.claude`/`.vscode`/`.idea` 제외 추가 (안전장치) |

검증: 감사 도구가 예전에 검사하지 않던 `.yml`에 심은 실제 비밀값을 탐지하고, 정화 도구가 치환함을 확인.
