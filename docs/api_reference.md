# 📡 데이터베이스 및 API 명세서 (v5.0+)

본 문서는 `뇌사료` 프로젝트의 데이터 저장 구조(Schema)와 모든 외부 통신 인터페이스(API)를 상세히 기술합니다.

## 🗄️ 1. 데이터베이스 스키마 (DB Schema)
(스키마 내용은 이전 버전과 동일하며, 쿼리 로직이 최적화되었습니다.)

---

## 🌐 2. API 엔드포인트 명세 (주요 항목)

### 2.1 Memos & Search
- **`GET /api/memos`**: 필터링된 메모 목록 조회.
    - **Parameters**:
        - `group`: 필터링 그룹 (`all`, `files`, `done` 등)
        - `query`: 검색어 (제목, 내용, 태그 포함)
        - `date`: 특정 날짜 전방 일치 검색 (`YYYY-MM-DD`)
        - `start_date` / `end_date` **(v5.0)**: 날짜 범위 검색을 위한 시작/종료일. 주간 뷰 연동 시 필수.
        - `limit` / `offset`: 페이징 처리를 위한 매개변수.
- **`GET /api/memos/<int:memo_id>`**: 특정 메모의 상세 정보 및 본문 조회.
- **`POST /api/memos/<id>/decrypt`**: 암호화된 본문을 비밀번호로 복호화.

### 2.2 Settings & Configuration
| Method | URL | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | - | 테마, 언어, 고급 기능 활성화 상태 조회 |
| `POST` | `/api/settings` | `lang`, `enable_categories`, `bg_color` 등 | 서버 설정을 영구 업데이트 |

> **v5.0 변경점**: 주간 관리를 위해 `start_date`, `end_date` 파라미터가 추가되었으며, API 호출 시 `null` 값은 빈 문자열로 처리해야 합니다.
