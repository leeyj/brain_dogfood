# 🧠 뇌사료 x 옵시디언 통합 고도화 설계서 (Phase 2)

이 문서는 '뇌사료' 서버와 '옵시디언' 간의 완벽한 양방향 동기화 및 오프라인 보안 메모 시스템 구축을 위한 상세 설계를 다룹니다.

## 1. 핵심 목표
1. **양방향 동기화**: 옵시디언에서의 수정 사항을 서버에 실시간 반영.
2. **오프라인 보안**: 암호화된 메모를 로컬(옵시디언)에 암호문 상태로 저장하고, 필요 시 복호화하여 열람.
3. **자연스러운 연결**: 메모 간 링크(`[[#ID]]`)와 첨부파일을 옵시디언 네이티브 환경에 최적화.

---

## 2. 시스템 아키텍처

### A. 백엔드 (Flask API)
- **External API 확장**: `PUT` (수정), `POST` (생성), `DELETE` (삭제) 엔드포인트 추가.
- **보안 레이어**: `API Token` 기반 인증 유지 및 암호화 본문(Ciphertext) 전송 허용.
- **이미지 업로드 API**: 옵시디언에서 추가된 이미지를 서버로 전송받는 엔드포인트.

### B. 프론트엔드 (Obsidian Plugin)
- **언어/환경**: TypeScript, Obsidian Plugin API.
- **Sync Engine**: 서버 API와 통신하여 로컬 파일(`Vault`)을 최신 상태로 유지.
- **Crypto Engine**: 서버의 암호화 로직(AES-256-CBC 등)을 JS로 구현하여 로컬 복호화 지원.
- **Event Watcher**: 옵시디언 파일 저장 이벤트를 감지하여 서버로 자동 Push.

---

## 3. 상세 설계 내역

### 🛡️ 보안 및 암호화 (Security)
옵시디언 보관소의 보안을 위해 다음 규칙을 준수합니다.
- **At-Rest Encryption**: 로컬 `.md` 파일에는 평문이 아닌 **암호문(Ciphertext)**이 저장됩니다.
- **In-Memory Decryption**: 비밀번호는 파일에 저장되지 않으며, 플러그인 실행 중에만 메모리에 유지됩니다.
- **Algorithm Matching**: 
  - **Server**: Python `cryptography` 라이브러리 사용.
  - **Client**: `CryptoJS` 등을 사용하여 동일한 Key Derivation (PBKDF2) 및 AES 모드 구현.

### 🔄 동기화 로직 (Sync Logic)
- **State Tracking**: `last_sync.json` 파일을 통해 각 메모의 최종 동기화 시점을 기록합니다.
- **Conflict Resolution**: 서버와 로컬의 수정 시간이 다를 경우 '최근 수정본 우선(Last-win)' 정책을 기본으로 하되, 중요 메모는 백업본을 생성합니다.
- **Link Mapping**:
  - `[[#ID]]` (Server) ↔ `[[ID_Title]]` (Obsidian)
  - 저장 시 다시 ID 형식으로 역치환하여 서버로 전송.

---

## 4. 단계별 구현 로드맵

### Phase 2.1: 백엔드 쓰기 권한 개방
- [ ] `PUT /api/external/memos/<id>`: 메모 및 태그 수정 기능.
- [ ] `POST /api/external/memos`: 신규 메모 생성 기능.
- [ ] `POST /api/external/upload`: 이미지/첨부파일 업로드 기능.

### Phase 2.2: 옵시디언 플러그인 프로토타입 (Sync v1)
- [ ] 플러그인 기본 뼈대 생성 및 서버 설정 페이지 구현.
- [ ] 현재의 Python 스크립트 로직을 플러그인(TS)으로 이식 (일방향 읽기).
- [ ] 주기적 자동 동기화 기능 추가.

### Phase 2.3: 양방향 동기화 및 편집 (Sync v2)
- [ ] 파일 수정 감지 및 서버 Push 로직 구현.
- [ ] 신규 파일 생성 시 서버에 메모 등록.
- [ ] YAML Frontmatter 역파싱(Metadata 동기화).

### Phase 2.4: 오프라인 암호화 뷰어 (Final)
- [ ] JS 암호화 모듈 통합.
- [ ] `is_encrypted: true` 노트 오픈 시 비밀번호 입력창 호출.
- [ ] 복호화된 내용을 편집기에서 보여주는 전용 View/Decorator 구현.
