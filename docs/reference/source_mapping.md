# 🔗 소스 매핑 및 호출 관계 (v8.1+)

본 문서는 프론트엔드 컴포넌트와 백엔드 API, 그리고 내부 함수 간의 호출 관계와 인터페이스를 기술합니다.

---

## 📱 1. 프론트엔드 모듈간 관계

| 모듈 (Component) | 역할 | 주요 호출 (Callee) |
| :--- | :--- | :--- |
| `AppService.js` | **Facade Engine** | `AppState`, `FilterService`, `UI`, `WeeklyManager`, `SidebarManager` |
| `AppState.js` | **State Store** | 순수 데이터 보관 (의존성 없음) |
| `FilterService.js` | **Data Logic** | `API`, `AppState` |
| `UI.js` | **Orchestrator** | `LayoutManager`, `SettingsManager`, `ThemeEngine`, `ModalManager`, `VisualLinker` |
| `WeeklyManager.js` | **Weekly View** | `AppService.setFilter()`, `HeatmapManager` (Data 참조) |
| `LayoutManager.js` | **Layout System** | `MasonryLayout`, `ListLayout`, `MemoCard` |
| `VisualLinker.js` | **Wiring Engine** | `AppService`, `RelationManager`, `UI` |
| `ModalManager.js` | **Modal UI** | `API.decryptMemo()`, `AppService.refreshData()` |
| `Visualizer.js` | **Coordinator** | `GraphAnalyzer`, `GraphRenderer` |

---

## ⚙️ 2. 백엔드 핵심 함수 매핑

### 2.1 보안 및 데이터 처리
| 함수명 | 위치 | 역할 | 주요 호출처 |
| :--- | :--- | :--- | :--- |
| `MemoService.create_memo` | `app/services/memo_service.py` | 메타데이터 파싱 및 저장 로직 총괄 | `routes/memo.py` |
| `MemoRepository.get_all` | `app/models/memo_repo.py` | 복합 필터링 쿼리 및 Bulk Fetch 수행 | `MemoService` |
| `encrypt_content` | `app/security.py` | AES-256 기반 본문 암호화 | `MemoService` |
| `extract_links` | `app/utils.py` | 본문 내 `[[#ID]]` 패턴 및 외부 URL 추출 | `MemoService` |

### 2.2 운영 도구 (Ops Tools)
| 파일명 | 경로 | 역할 |
| :--- | :--- | :--- |
| `deploy.py` | `/` (root) | 원격 홈 서버 정밀 배포 자동화 (SSH/SFTP) |
| `sync_from_server.py` | `/tools/` | 서버의 실데이터(DB, Uploads)를 로컬로 동기화 |

---

## 🌐 3. 클라이언트-서버 통신 파라미터 (API Flow)

### 3.1 `GET /api/memos` (데이터 로딩)
- **Caller**: `AppService.js`
- **Logic**: 무한 스크롤을 위한 `limit`, `offset` 처리와 `group`, `date`, `category` 필터링 수행.

### 3.2 `POST /api/memos/<id>/decrypt` (보안 해독)
- **Caller**: `ModalManager.js`
- **Logic**: 사용자가 입력한 비밀번호를 서버에 전송하여 AES 해독 후 평문 반환. 성공 시 `unlockedMemos` 상태 업데이트.

---

> [!NOTE]
> 상세한 모듈별 책임과 메서드 리스트는 [컴포넌트 명세서 (components.md)](./arch/components.md)를 참조하십시오.
