# 🏢 시스템 아키텍처 및 폴더 구조 (v5.0+)

본 문서는 `뇌사료` 프로젝트의 물리적 파일 구조와 논리적 설계 아키텍처를 상세히 기술합니다.

## 📁 1. 폴더 구조 (Folder Structure)

| 경로 | 역할 | 상세 설명 |
| :--- | :--- | :--- |
| `/app` | **Backend Core** | Flask 애플리케이션의 핵심 로직 및 라우트 |
| `/app/routes` | **Modular Routes** | 기능별로 분리된 API 엔드포인트 패키지 |
| `/data` | **Database Box** | SQLite3 DB 파일 (`memos.db`) 저장 위치 |
| `/docs` | **Documentation** | 시스템 기술 문서 및 가이드 |
| `/logs` | **Log Box** | 시스템 작동 및 접근 로그 (`app.log`) |
| `/static` | **Static Assets** | CSS, 이미지, 파비코 및 프론트엔드 JS |
| `/static/js/components` | **UI Components** | D3.js 시각화 모듈 및 UI 핵심 로직 |
| `/templates` | **HTML Templates** | Jinja2 기반 레이아웃 및 페이지 |
| `deploy.py` | **Ops Tool** | 수술적 정밀 배포 도구 (Surgical Deployment) |
| `backup.py` | **Disaster Recovery** | 핵심 데이터(DB, .env, 첨부파일) 증분 백업 도구 |

---

## 🏗️ 2. 설계 아키텍처 (Design Architecture)

### 2.1 Backend: Blueprint-based Modular Flask
- **패키지 구조**: `app/__init__.py`에서 중앙 집중식으로 앱을 생성하고, `routes/` 아래의 각 기능을 Blueprint로 등록합니다.
- **보안 실드 (Security Shield)**: `before_request` 단계에서 비정상적인 트래픽 및 파라미터를 필터링하는 로깅 시스템이 선제적으로 작동합니다.
- **성능 최적화 (Bulk Fetch)**: 다량의 메모리 조회 시 발생하는 N+1 문제를 방지하기 위해 태그, 첨부파일, 백링크 정보를 한꺼번에 Fetch하는 벌크 조회 로직이 적용되었습니다.

### 2.2 Frontend: Modular Component Architecture
- **지식 네뷸라 (Knowledge Nebula)**: D3.js의 물리 시뮬레이션 엔진을 도입하여 유기적인 성단 구조를 시각화합니다.
- **컴포넌트 중심 설계**: `HeatmapManager.js` (활동 시각화), `CalendarManager.js` (달력), `Visualizer.js` (그래프), `DrawerManager.js` (탐색기) 등으로 독립된 모듈 구조를 채택하여 유지보수성을 극대화했습니다.
- **레이아웃 혁명**: **무한 스크롤(Infinite Scroll)** 페이징 기법을 도입하여 수천 개의 지식 파편도 성능 저하 없이 탐색할 수 있습니다.
- **State Management**: `AppService.js`를 중앙 상태 관리 엔진으로 활용하여 데이터 요청과 UI 업데이트의 정합성을 유지합니다.

### 2.3 Ops & Reliability
- **Merged Configuration**: 개발/운영 환경의 환경변수를 한곳에서 관리하며, 배포 시 `.env` 파일을 통해 보안 설정이 주입됩니다.
- **Surgical Cleanup**: 배포 시 운영 데이터(DB, Uploads)는 보존하고 코드 영역만 정밀하게 교체하는 수술적 배포 방식을 채택했습니다.
- **Disaster Recovery**: `backup.py`를 통해 서버 침해나 시스템 붕괴 시에도 3대 핵심 자산(.env, DB, Uploads)만으로 즉시 복구가 가능한 구조를 갖췄습니다.
