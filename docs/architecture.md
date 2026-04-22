# 🏢 시스템 아키텍처 및 폴더 구조 (v5.0+)

본 문서는 `뇌사료` 프로젝트의 물리적 파일 구조와 논리적 설계 아키텍처를 상세히 기술합니다.

## 📁 1. 폴더 구조 (Folder Structure)

| 경로 | 역할 | 상세 설명 |
| :--- | :--- | :--- |
| `/app` | **Backend Core** | Routes(라우트), Services(비즈니스 로직), Models(데이터베이스) 3레이어 구조 |
| `/static/js/components` | **UI Components** | 독립적 렌더링이 가능한 UI 조각 (MemoCard, AttachmentBox 등) |
| `/static/js/components/layouts` | **Layout Engines** | 슬롯 기반 레이아웃 전략 (GridLayout, ListLayout) |
| `/static/js/events` | **Event Handlers** | UI 이벤트 바인딩 및 단축키 관리 (ShortcutManager, UIEventBinder) |
| `/docs/Bug` | **Bug Reports** | 버그 이력 및 조치 사항 아카이브 |

---

## 🏗️ 2. 설계 아키텍처 (Design Architecture)

### 2.1 Backend: 3-Layer Architecture (v4.0+)
- **Models**: `memo_repo.py`를 통해 DB 쿼리 추상화. 날짜 범위 검색(`BETWEEN`) 지원.
- **Services**: `memo_service.py`에서 비즈니스 로직 및 필터링 전처리 수행.
- **Routes**: `memo.py`에서 Blueprint 기반의 RESTful API 엔드포인트 노출.

### 2.2 Frontend: Slot-based Layout Engine (v5.0+)
- **LayoutManager**: 메인 화면의 `#memoGrid` 영역을 추상화된 슬롯으로 취급합니다. 설정된 레이아웃(`Grid` 또는 `List`)에 따라 동적으로 렌더링 엔진을 교체합니다.
- **AppService (Central State)**: 모든 필터 상태(그룹, 날짜 범위, 검색어)와 메모 데이터를 중앙에서 관리하며, 상태 변경 시 레이아웃 엔진에 렌더링을 지시합니다.
- **WeeklyManager**: 검색창 하단 슬롯에 독립적으로 주입되어 주간 일정을 관리하며 `AppService`의 날짜 필터를 제어합니다.

### 2.3 Data Policy: English Constant Policy
- **데이터 정합성**: DB의 `group_name` 등은 **영문 상수**로 저장하고, UI 노출 시에만 i18n 엔진을 통해 번역합니다.

### 2.4 Ops & Reliability
- **Deploy Pipeline**: `deploy.py`를 통해 원격 홈 서버의 코드를 안전하게 교체하고 프로세스를 재기동하는 자동화 파이프라인을 운영합니다.
