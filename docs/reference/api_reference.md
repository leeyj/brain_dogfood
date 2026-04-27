# 📡 데이터베이스 및 API 명세서 (v8.1+)

본 문서는 `뇌사료` 프로젝트의 데이터 저장 구조(Schema)와 모든 외부 통신 인터페이스(API)를 상세히 기술합니다.

---

## 📑 목차 (Table of Contents)
1. [**데이터베이스 스키마 (DB Schema)**](#-1-데이터베이스-스키마-db-schema)
2. [**내부 API 엔드포인트 (Internal API)**](#-2-api-엔드포인트-명세)
3. [**외부 연동 API (External API)**](#-3-외부-연동-api-external-api---api-key-required)

---

## 🗄️ 1. 데이터베이스 스키마 (DB Schema)

### 1.1 `memos` (핵심 메모 정보)
메모의 본문과 상태, 각종 메타데이터를 저장하는 메인 테이블입니다.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, 자동 증가 (내부 참조용) |
| `uuid` | TEXT | 전역 고유 식별자 (**외부 연동 핵심 키**, v8.2+) |
| `title` | TEXT | 메모 제목 (비어있을 경우 본문 요약으로 자동 생성) |
| `content` | TEXT | 메모 본문 (암호화 시 AES-256 암호문 저장) |
| `summary` | TEXT | AI 요약 또는 본문 추출 요약 |
| `color` | TEXT | 카드 배경색 (Hex Color, 기본: #2c3e50) |
| `is_pinned` | BOOLEAN | 상단 고정 여부 (1: 고정, 0: 일반) |
| `status` | TEXT | 상태 (`active`, `done`, `archived`) |
| `group_name` | TEXT | 그룹 이름 (DB에는 영문 상수로 저장) |
| `is_encrypted` | BOOLEAN | 암호화 여부 (1: 암호화됨) |
| `category` | TEXT | 카테고리 태그 |
| `due_date` | TEXT | 마감일 (`YYYY-MM-DD` 형식) |
| `created_at` | TIMESTAMP | 레코드 생성 일시 |
| `updated_at` | TIMESTAMP | 최종 수정 일시 |

### 1.2 `tags` (정규화된 태그 정보)
메모에 포함된 해시태그(`#tag`)를 관리합니다.
- `memo_id`: 대상 메모의 ID (FK)
- `name`: 태그 이름 (유니크하지 않음)
- `source`: 생성 출처 (`user`: 사용자 입력, `ai`: AI 자동 추출)

### 1.3 `attachments` (첨부파일 정보)
메모에 연결된 파일 및 이미지 정보를 관리합니다.
- `memo_id`: 소속된 메모 ID (삭제 시 NULL 처리될 수 있음)
- `filename`: 서버 내 물리 파일명
- `original_name`: 업로드 당시의 원본 파일명
- `file_type`: 파일 종류 (`image`, `file` 등)
- `size`: 파일 크기 (Bytes)

### 1.4 `memo_links` (메모 간 상호 연결)
본문 내 `[[#ID]]` 형식의 링크를 분석하여 저장한 관계 테이블입니다.
- `source_id`: 링크를 보낸 메모 (Source)
- `target_id`: 링크 대상이 된 메모 (Target)

---

## 🌐 2. API 엔드포인트 명세

### 2.1 Memos & Search
- **`GET /api/memos`**: 필터링된 메모 목록 조회.
    - **Parameters**: `group`, `query`, `date`, `start_date`, `end_date`, `category`, `limit`, `offset`
- **`GET /api/memos/<id>`**: 특정 메모 상세 조회.
- **`POST /api/memos`**: 신규 메모 생성.
- **`PUT /api/memos/<id>`**: 메모 내용 및 상태 수정.
- **`DELETE /api/memos/<id>`**: 메모 및 관련 첨부파일 물리적 삭제.
- **`POST /api/memos/<id>/decrypt`**: 암호화된 본문을 비밀번호로 해독 요청.

### 2.2 Stats & Assets
- **`GET /api/stats/heatmap`**: 연간 활동량 히트맵 데이터 조회.
- **`GET /api/attachments`**: 업로드된 모든 파일 목록 및 용량 통계 조회.
- **`POST /api/upload`**: 신규 파일 업로드.

### 2.3 Settings & Configuration
- **`GET /api/settings`**: 현재 서버 설정(테마, 언어, 레이아웃 옵션 등) 조회.
- **`POST /api/settings`**: 서버 설정 업데이트 및 영구 저장.

---

## 🔌 3. 외부 연동 API (External API - API Key Required)

모든 외부 API 요청은 `X-API-Key` 헤더에 유효한 API Key가 포함되어야 합니다.

#### 3.1 외부용 메모 목록 조회 (`GET /api/external/memos`)
동기화에 필요한 최소한의 메타데이터 목록을 반환합니다.
- **Success Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "title": "업무 보고서",
        "updated_at": "2024-04-27 10:00:00",
        "is_encrypted": false,
        "group": "work"
      },
      ...
    ]
    ```

#### 3.2 메모 상세 조회 (JSON) (`GET /api/external/memos/<uuid>/json`)
메모의 모든 필드와 연관 데이터(태그, 첨부파일)를 JSON 형식으로 반환합니다.
- **Success Response (200 OK)**:
    ```json
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "title": "업무 보고서",
      "content": "보고서 본문 내용입니다. #중요",
      "category": "리서치",
      "group_name": "work",
      "is_pinned": 1,
      "is_encrypted": 0,
      "tags": [
        {"name": "중요", "source": "user"}
      ],
      "attachments": [
        {"filename": "uuid-file.png", "original_name": "image.png", "size": 1024}
      ],
      "created_at": "2024-04-27 10:00:00",
      "updated_at": "2024-04-27 10:00:00"
    }
    ```

#### 3.3 메모 상세 조회 (Markdown) (`GET /api/external/memos/<uuid>`)
옵시디언 등 마크다운 기반 앱을 위해 Frontmatter가 포함된 텍스트를 반환합니다.
- **Success Response (200 OK)**:
    ```json
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "markdown": "---\nuuid: 550e8400...\ntitle: 업무 보고서\n---\n\n보고서 본문 내용입니다. #중요",
      "filename": "550e8400-e29b-41d4-a716-446655440000.md"
    }
    ```

#### 3.4 메모 생성 (`POST /api/external/memos`)
JSON 또는 마크다운 원문을 통해 새 메모를 생성합니다.
- **Request Body (JSON)**:
    ```json
    {
      "title": "디스코드 입력",
      "content": "봇에서 보낸 메시지입니다. @default #bot",
      "category": "수집",
      "group": "default"
    }
    ```
- **Success Response (201 Created)**:
    ```json
    {
      "id": 124,
      "uuid": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "title": "디스코드 입력",
      "message": "Memo created successfully"
    }
    ```

#### 3.5 부분 업데이트 (PATCH) (`PATCH /api/external/memos/<uuid>`)
본문 수정 없이 특정 메타데이터만 변경할 때 사용합니다.
- **Request Body (JSON)**:
    ```json
    {
      "status": "done",
      "is_pinned": true,
      "category": "완료됨"
    }
    ```
- **Success Response (200 OK)**: `{"message": "Memo patched successfully", "uuid": "..."}`

#### 3.6 메타데이터 조회 (`GET /api/external/tags`, `GET /api/external/categories`)
시스템 전체에 등록된 태그 및 카테고리 목록을 배열로 반환합니다.
- **Success Response (200 OK)**: `["태그1", "태그2"]` 또는 `["카테고리1", "카테고리2"]`

#### 3.7 통합 검색 (`GET /api/external/search`)
키워드, 그룹, 태그를 조합하여 메모를 검색합니다.
- **Query Parameters**:
    - `q`: 검색어 (제목/본문 포함 여부)
    - `group`: 특정 그룹 필터 (예: `work`, `daily`)
    - `tag`: 특정 태그 필터 (예: `아이디어`)
- **Success Response (200 OK)**:
    ```json
    [
      {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "title": "검색된 메모 제목",
        "content_preview": "본문 내용 중 앞부분 일부...",
        "category": "업무",
        "tags": ["중요", "회의"],
        "updated_at": "2024-04-27 10:00:00",
        "group": "work"
      },
      ...
    ]
    ```

---

> [!IMPORTANT]
> **v8.1 보안 정책**: 암호화된 메모(`is_encrypted: 1`)는 본문 조회가 제한되며, 수정(`PUT`) 시에도 반드시 유효한 `password`가 Body에 포함되어야 합니다.
