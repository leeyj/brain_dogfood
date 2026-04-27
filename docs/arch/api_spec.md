# 📡 API 규격서 (API Specification) (v8.1+)

이 문서는 뇌사료 프로젝트의 프론트엔드와 백엔드 간 통신 규약을 정의합니다.

---

## 1. 공통 사항
- **Base URL**: `/api`
- **Content-Type**: `application/json` (파일 업로드 제외)
- **인증(Auth)**: Flask 세션 기반. 모든 API는 로그인 세션이 유효해야 접근 가능합니다.
- **에러 응답**: 실패 시 `{"error": "메시지"}` 형식의 JSON과 적절한 HTTP 상태 코드를 반환합니다.
    - `401 Unauthorized`: 세션 만료 (로그인 필요)
    - `403 Forbidden`: 권한 없음 (예: 암호화 메모 해독 실패)
    - `404 Not Found`: 리소스를 찾을 수 없음
    - `400 Bad Request`: 요청 파라미터 누락 또는 형식 오류

---

## 2. 메모 관련 (Memo API)

### 2.1 메모 목록 조회
- **Method**: `GET`
- **Endpoint**: `/api/memos`
- **Query Parameters**:
    - `group` (string, default: 'all'): 필터 그룹 (`all`, `starred`, `today`, `files`, `completed`)
    - `query` (string): 검색 키워드
    - `category` (string): 카테고리 필터 (공백 시 전체)
    - `date` (string): 특정 날짜 (`YYYY-MM-DD`)
    - `start_date`, `end_date` (string): 주간 뷰 등 범위 검색용 시작/종료일
    - `limit` (int, default: 20): 한 번에 가져올 개수
    - `offset` (int, default: 0): 페이징 시작 오프셋
- **Success Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "title": "메모 제목",
        "content": "메모 내용 (암호화 시 masked)",
        "group_name": "일반",
        "category": "업무",
        "tags": "태그1,태그2",
        "created_at": "2024-04-24 10:00:00",
        "due_date": "2024-04-30",
        "is_encrypted": false,
        "is_starred": 0,
        "attachments": ["image.png", "document.pdf"]
      },
      ...
    ]
    ```

### 2.2 메모 상세 조회
- **Method**: `GET`
- **Endpoint**: `/api/memos/<int:memo_id>`
- **Success Response (200 OK)**: 단일 메모 객체 반환

### 2.3 메모 생성
- **Method**: `POST`
- **Endpoint**: `/api/memos`
- **Request Body**:
    ```json
    {
      "title": "제목",
      "content": "본문",
      "group": "일반",
      "category": "카테고리",
      "tags": "#태그",
      "due_date": "2024-05-01",
      "is_encrypted": false,
      "password": "..." (암호화 시 필요)
    }
    ```
- **Success Response (201 Created)**: `{"id": 123, "uuid": "...", "message": "Memo created"}`

### 2.4 메모 수정
- **Method**: `PUT`
- **Endpoint**: `/api/memos/<int:memo_id>`
- **Request Body**: (수정할 데이터 필드)
- **Success Response (200 OK)**: `{"message": "Updated"}`

### 2.5 메모 삭제
- **Method**: `DELETE`
- **Endpoint**: `/api/memos/<int:memo_id>`
- **Success Response (200 OK)**: `{"message": "Deleted memo and all associated files"}`

### 2.6 암호화 메모 해독
- **Method**: `POST`
- **Endpoint**: `/api/memos/<int:memo_id>/decrypt`
- **Request Body**: `{"password": "사용자 입력 비번"}`
- **Success Response (200 OK)**: `{"content": "해독된 실제 본문 내용"}`

---

## 3. 첨부파일 관련 (File API)

### 3.1 파일 목록 및 통계 조회
- **Method**: `GET`
- **Endpoint**: `/api/attachments`
- **Success Response (200 OK)**:
    ```json
    {
      "total_count": 5,
      "total_size": 1542031,
      "items": [
        {"name": "file.png", "size": 50021, "mtime": 1713912000, "type": "image"},
        ...
      ]
    }
    ```

### 3.2 파일 업로드
- **Method**: `POST`
- **Endpoint**: `/api/upload`
- **Content-Type**: `multipart/form-data`
- **Form Data**: `file` (Binary)
- **Success Response (200 OK)**: `{"filename": "...", "message": "File uploaded"}`

---

## 4. 시스템 및 통계 (System API)

### 4.1 인증 상태 확인 (Heartbeat)
- **Method**: `GET`
- **Endpoint**: `/api/auth/status`
- **Success Response (200 OK)**: `{"authenticated": true, "user": "admin"}`

### 4.2 활동 히트맵 데이터 조회
- **Method**: `GET`
- **Endpoint**: `/api/stats/heatmap`
- **Query Parameters**: `range` (int, default: 365)
- **Success Response (200 OK)**: `[{"date": "2024-04-24", "count": 5, "deadline_count": 1}, ...]`

---

## 5. 외부 연동 (External API - Obsidian 등)

외부 애플리케이션과의 동기화를 위한 전용 API입니다. API Key 인증이 필요합니다.

### 5.1 외부용 메모 목록 조회
- **Method**: `GET`
- **Endpoint**: `/api/external/memos`
- **Auth**: `X-API-Key` 헤더 필요
- **Success Response**: 동기화에 필요한 최소 메타데이터(`id`, `uuid`, `title`, `updated_at` 등) 배열

### 5.2 마크다운 기반 메모 조회/업데이트
- **Method**: `GET` / `POST`
- **Endpoint**: `/api/external/memos/<string:memo_uuid>`
- **Description**: 
    - `GET`: 메모를 Frontmatter가 포함된 마크다운 형식으로 반환합니다.
    - `POST`: 마크다운 본문을 전송하여 메모 내용을 업데이트합니다.
- **Success Response (GET)**: `{"markdown": "...", "uuid": "...", ...}`

### 5.3 JSON 기반 상세 조회 및 부분 업데이트
- **Method**: `GET` / `PATCH`
- **Endpoint**: `/api/external/memos/<string:memo_uuid>/json` (GET) 또는 `/api/external/memos/<string:memo_uuid>` (PATCH)
- **Description**: 순수 JSON 데이터를 조회하거나, 특정 필드(status, category 등)만 부분 업데이트합니다.

### 5.4 메타데이터 및 검색 API
- **Endpoint**: 
    - `GET /api/external/tags`: 전체 태그 목록
    - `GET /api/external/categories`: 전체 카테고리 목록
    - `GET /api/external/search?q=...`: 메모 검색

### 5.5 외부 전용 파일 업로드
- **Method**: `POST`
- **Endpoint**: `/api/external/upload`
- **Content-Type**: `multipart/form-data`
- **Success Response**: `{"url": "/api/download/uuid.ext", "filename": "..."}`

> [!TIP]
> 모든 API 호출 시 `_t={Date.now()}` 쿼리 파라미터를 추가하여 브라우저 캐시를 방지하는 것을 권장합니다.
