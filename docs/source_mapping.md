# 🔗 소스 매핑 및 호출 관계 (v13.4)

본 문서는 프론트엔드 컴포넌트와 백엔드 API, 그리고 내부 함수 간의 호출 관계와 인터페이스를 기술합니다.

## 📱 1. 프론트엔드 모듈간 관계

| 모듈 (Component) | 기능 설명 | 주요 호출 (Callee) |
| :--- | :--- | :--- |
| `app.js` | **Orchestrator** | `Visualizer`, `DrawerManager`, `ModalManager`, `API` |
| `Visualizer.js` | **Nebula Engine** | `D3.js`, `ModalManager.open()`, `AppService` |
| `DrawerManager.js` | **Explorer** | `AppService.filterMemos()`, `ModalManager` |
| `ModalManager.js` | **Viewer** | `utils.parseInternalLinks()`, `utils.fixImagePaths()` |
| `ComposerManager.js` | **Editor** | `API.saveMemo()`, `AttachmentBox` |

---

## ⚙️ 2. 백엔드 핵심 함수 매핑

### 2.1 보안 및 유틸리티
| 함수명 | 모듈 | 역할 | 호출자 |
| :--- | :--- | :--- | :--- |
| `decrypt_file` | `app/security.py` | 첨부파일 물리 복호화 | `file.py:download_file` |
| `extract_links` | `app/utils.py` | `[[#ID]]` 패턴 추출 | `memo.py:create/update` |

### 2.2 운영 도구 (Ops)
| 파일명 | 역할 | 주요 로직 |
| :--- | :--- | :--- |
| `deploy.py` | **정밀 배포** | SSH/SFTP 기반 Surgical Cleanup & Upload |
| `backup.py` | **백업** | 핵심 자산(.env, DB, Uploads) Tarball 생성 |

---

## 🌐 3. 클라이언트-서버 통신 파라미터 (API Flow)

### 3.1 `GET /api/download/<filename>` (보안 하향 링크)
- **Caller**: `ModalManager.js` (Inline Images) or `AttachmentBox.js`
- **Security**: `session['logged_in']` 확인 -> `is_encrypted` 상태에 따른 접근 제어.
- **Header**: 이미지인 경우 `Content-Disposition: inline`.

### 3.2 `PUT /api/memos/<id>` (수정 및 보안 전이)
- **Status Change**: 암호화 해제 저장 시 `is_encrypted: 0`으로 DB 상태 업데이트.
- **Process**: `memo.py:update_memo`에서 `password` 유무에 따른 Re-encryption 수행.
