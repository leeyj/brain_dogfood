# 🏢 시스템 아키텍처 및 폴더 구조 (v8.1+)

본 문서는 `뇌사료` 프로젝트의 물리적 파일 구조와 논리적 설계 아키텍처를 상세히 기술합니다.

---

## 📁 1. 폴더 구조 (Folder Structure)

| 경로 | 역할 | 상세 설명 |
| :--- | :--- | :--- |
| `/app/routes` | **API Endpoints** | Flask Blueprint 기반의 REST API 엔드포인트 정의 |
| `/app/routes/external` | **External API** | 외부 서드파티(Obsidian, Bot 등) 전용 모듈형 API 패키지 |
| `/app/services` | **Business Logic** | 암호화, 메타데이터 파싱, 검색 로직 등 핵심 서비스 |
| `/app/models` | **Data Access** | SQLite 데이터베이스 쿼리 추상화 (`MemoRepository`) |
| `/static/js/components` | **UI Managers** | 특정 도메인(Weekly, Sidebar, Modal 등)을 담당하는 매니저 객체 |
| `/static/js/components/layouts` | **Layout Engines** | MasonryGrid, List 레이아웃 엔진 |
| `/static/js/utils` | **Shared Utils** | 다국어(I18n), 단축키, 슬래시 명령어 유틸리티 |
| `/docs/arch` | **Architecture Docs** | v8.1에서 도입된 상세 설계 및 컴포넌트 명세서 |
| `/tools` | **Dev Tools** | 서버 배포(`deploy.py`) 및 동기화 도구 |

---

## 🏗️ 2. 설계 아키텍처 (Design Architecture)

### 2.1 Backend: 3-Layer Architecture
- **Models**: 데이터베이스 정규화 및 Bulk Fetch를 통한 N+1 문제 해결.
- **Services**: `MemoService`에서 데이터 전처리 및 보안(암호화) 로직 집중화.
- **Routes**: 기능별 라우트 분리를 통해 확장성 확보.
- **External API Layer**: 외부 앱 전용 모듈형 패키지(`external/`)를 통해 데이터 마샬링 및 API Key 보안 계층을 별도로 운영.

### 2.2 Frontend: Manager-Component Pattern (v8.1+)
- **AppState**: 애플리케이션의 반응형 전역 상태(`state`)를 보관하는 순수 데이터 저장소입니다.
- **FilterService**: 백엔드 통신 및 데이터 필터링 로직을 전담합니다.
- **AppService (Facade)**: 외부 모듈들이 `AppState`와 `FilterService`를 직접 의존하지 않도록 일관된 인터페이스를 제공하는 파사드 객체입니다. 모든 상태 변경은 이 파사드를 통합니다.
- **ThemeEngine & SettingsManager**: 테마 제어 및 전역 설정, 다크모드를 담당합니다.
- **Visualizer & GraphAnalyzer**: 데이터 분석과 SVG 렌더링을 분리한 시각화 엔진 계층입니다.
- **Manager Objects**: 특정 UI 영역을 전담하며, DOM 조작 로직을 컴포넌트 단위로 분리하여 관리합니다 (예: `WeeklyManager`, `SidebarManager`, `ComposerManager`).
- **UI Components**: `MemoCard`와 같이 독립적으로 렌더링 가능한 최소 단위의 UI 조각들입니다.

### 2.3 Unidirectional Data Flow (단방향 데이터 흐름)
UI 컴포넌트에서 발생한 이벤트는 항상 `AppService` 파사드와 `FilterService`를 통해 `AppState`를 변경하고, 변경된 상태가 다시 UI로 내려와 렌더링을 수행하는 구조를 지향합니다. 이는 복잡한 지식 네트워크 환경에서도 상태 정합성을 완벽하게 유지하게 해줍니다.

---

> [!TIP]
> 모듈 간의 상세한 위계 구조 및 동작 흐름은 [컴포넌트 명세서 (components.md)](./arch/components.md)와 [아키텍처 개요 (overview.md)](./arch/overview.md)를 참조하십시오.
