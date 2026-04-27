# [Implementation Plan v2] SQLite & UUID 기반 옵시디언 동기화 시스템

## 1. 목표
*   **ID 종속성 탈피**: 파일명이나 본문에 강제적인 ID를 노출하지 않는 깔끔한 환경 구축.
*   **강력한 데이터 무결성**: UUID와 로컬 DB 매핑을 통해 파일 이동 및 이름 변경에도 끊김 없는 동기화.
*   **충돌 안전 장치**: 로컬과 서버가 동시에 수정된 경우 데이터 유실을 완벽히 차단.
*   **휴지통 정책(Soft Delete)**: 실수 방지를 위해 물리적 삭제 대신 '삭제됨' 상태로 관리하여 복구 기회 제공.

---

## 2. 시스템 아키텍처

### A. 서버 측 (Server Side) - [준비 완료]
*   **UUID 지원**: 모든 메모는 고유한 UUID를 가짐.
*   **UUID API**: `/api/external/memos/<uuid>` 엔드포인트를 통한 조회/수정 지원.
*   **Quiet Migration**: 서버 기동 시 기존 데이터에 UUID를 자동으로 부여하는 로직 탑재.

### B. 옵시디언 플러그인 (Plugin Side) - [v2 신규 개발]
*   **Local DB (SQLite)**: `sql.js`를 사용하여 파일 경로와 UUID, 해시값을 관리.
*   **Event Handler**: 옵시디언의 `rename`, `modify`, `delete` 이벤트를 실시간 구독.
*   **Sync Engine**: 해시와 타임스탬프를 비교하여 Push/Pull/Conflict 결정.

---

## 3. 로컬 DB 설계 (`sync.db`)

| 테이블 | 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- | :--- |
| **memo_sync** | `local_path` | TEXT (PK) | 파일 상대 경로 (예: `Work/Project.md`) |
| | `uuid` | TEXT (Unique) | 서버 연동용 UUID |
| | `last_hash` | TEXT | 마지막 동기화 시점의 본문 해시 |
| | `last_sync_time` | DATETIME | 마지막 동기화 시점의 **서버 수정 시각** |
| | `sync_status` | TEXT | `synced`, `dirty`(수정됨), `conflict`(충돌) |

---

## 4. 동기화 및 충돌 해결 시나리오

| 상황 | 로컬 상태 | 서버 상태 | 결과 액션 |
| :--- | :--- | :--- | :--- |
| **Best: 로컬 수정** | 해시 변경 | 서버 시각 동일 | **Push**: 서버 데이터 업데이트 |
| **Best: 서버 수정** | 해시 동일 | 서버 시각 최신 | **Pull**: 로컬 파일 업데이트 |
| **Conflict: 동시 수정** | 해시 변경 | 서버 시각 최신 | **Conflict Handler** 실행 |

### 🗑️ 휴지통(Soft Delete) 정책
*   **삭제 요청 시**: 서버에서 데이터를 즉시 지우지 않고 `status = 'deleted'`로 변경합니다.
*   **로컬 반영**: 서버에서 삭제된 항목은 옵시디언 내에서도 삭제(또는 `.trash` 이동) 처리됩니다.
*   **복구**: 실수로 삭제한 경우 서버 UI에서 `active`로 되돌리면 다음 동기화 때 다시 로컬로 내려옵니다.

### 🛠️ 충돌 해결 전략 (Worst-Case 방어)
충돌 감지 시 **"충돌 복사본 생성"** 전략을 기본으로 채택합니다.
1.  현재 로컬 파일을 `파일명_conflict_20260426.md`로 백업.
2.  서버의 최신 내용을 원래 파일명(`파일명.md`)으로 다운로드.
3.  사용자에게 알림을 보내고, 두 파일을 비교하여 병합할 수 있도록 유도.

---

## 5. 단계별 구현 계획

1.  **Phase 1: 인프라 구축**
    *   플러그인 내 `sql.js` 설치 및 Wasm 초기화.
    *   `sync.db` 테이블 생성 및 기초 DAO(Data Access Object) 구현.
2.  **Phase 2: 마이그레이션 (Clean Up)**
    *   기존 `44_43_제목.md` 파일 스캔 및 ID 추출.
    *   DB 등록 후 파일명을 `제목.md`로 자동 정리.
3.  **Phase 3: 동기화 엔진 개발**
    *   해시 계산 로직 및 UUID 생성 로직 구현.
    *   Push/Pull/Conflict 판단 로직 및 복사본 생성 기능 개발.
4.  **Phase 4: 이벤트 연동**
    *   `rename` 이벤트 시 DB 경로 업데이트.
    *   `modify` 이벤트 시 실시간 해시 비교 및 상태 갱신.
