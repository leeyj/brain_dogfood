# 📡 데이터베이스 및 API 명세서 (v13.5)

본 문서는 `뇌사료` 프로젝트의 데이터 저장 구조(Schema)와 모든 외부 통신 인터페이스(API)를 상세히 기술합니다.

## 🗄️ 1. 데이터베이스 스키마 (DB Schema)

### 1.1 `memos` 테이블
메모의 핵심 데이터를 저장합니다.
| 컬럼명 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | 자동 증가 고유 아이디 |
| `title` | TEXT | - | 메모 제목 |
| `content` | TEXT | - | 메모 본문 (암호화 시 바이너리 텍스트) |
| `is_encrypted` | BOOLEAN | 0 | 암호화 여부 |

### 1.2 `memo_links` 테이블 (v7.0 추가)
메모 간의 `[[#ID]]` 링크 및 시각화 인력을 관리합니다.
| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `source_id` | INTEGER | 링크를 건 메모 ID |
| `target_id` | INTEGER | 링크 대상 메모 ID |

---

## 🌐 2. API 엔드포인트 전수 명세

### 2.1 Memos & Analysis
| Method | URL | Description |
| :--- | :--- | :--- |
| `GET` | `/api/memos` | 전체 메모 목록, 태그, 첨부파일, **백링크** 정보 통합 조회 |
| `POST` | `/api/memos/<id>/decrypt` | 비밀번호 검증 및 본문 일시 복호화 |
| `GET` | `/api/stats/heatmap` | 최근 N일간의 일자별 메모 작성 수(통계) 조회 (`days` 파라미터 지원) |

### 2.2 Assets (제한적 접근)
| Method | URL | Security Policy | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/download/<filename>` | **세션 필수(로그인 상호작용)** | 이미지/파일 다운로드. 이미지인 경우 `inline` 처리 및 암호화 메모 관련 파일은 로그인 미달 시 403 차단. |
| `POST` | `/api/upload` | `login_required` | 파일 업로드 및 서버 측 마스터 키 암호화 저장. |

### 2.3 Settings & Ops (v11.0 추가)
| Method | URL | Description |
| :--- | :--- | :--- |
| `GET` | `/api/settings` | 서버 사이드 테마 및 전역 설정 조회 |
| `POST` | `/api/settings` | UI 테마 설정을 서버에 영구 기록 |
