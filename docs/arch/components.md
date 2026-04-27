# 🧱 컴포넌트 명세서 (Frontend Component Reference) (v8.1+)

이 문서는 프로젝트의 모든 프론트엔드 모듈과 컴포넌트의 역할, 위계 구조를 정의합니다.

---

## 1. 코어 엔진 (Core Engine)

### [AppService.js](../../static/js/AppService.js)
- **역할**: 애플리케이션의 컨트롤 타워. 중앙 상태(State) 관리 및 비즈니스 로직 오케스트레이션.
- **부모**: 없음
- **주요 메서드**:
    - `refreshData()`: 모든 데이터 및 필터 초기화 후 로딩
    - `setFilter(params)`: 필터 조건 변경 및 UI 동기화
    - `loadMore()`: 다음 페이지 페이징 데이터 로딩

### [API.js](../../static/js/api.js)
- **역할**: 백엔드 서버와의 HTTP 통신 전담.
- **부모**: `AppService`
- **주요 메서드**:
    - `fetchMemos(filters)`: 필터링된 메모 목록 조회
    - `fetchMemo(id)`: 특정 메모 상세 조회 (내부 ID 사용)
    - `saveMemo(data, id)`: 메모 저장/수정
    - `decryptMemo(id, pw)`: 암호화된 내용 해독 요청

### [UI.js](../../static/js/ui.js)
- **역할**: 범용 UI 유틸리티 및 렌더링 헬퍼.
- **부모**: `AppService`
- **주요 메서드**:
    - `renderMemos()`: 전달받은 데이터를 레이아웃 엔진에 전달
    - `setHasMore(bool)`: 하단 무한 스크롤 센티넬 상태 제어

### [external/](../../app/routes/external/) (Server-side Package)
- **역할**: 외부 애플리케이션(Obsidian 등) 전용 API 엔드포인트 패키지.
- **구성 모듈**:
    - `memo_routes.py`: 외부용 메모 CRUD 및 검색.
    - `file_routes.py`: 외부용 파일 업로드 및 보안 저장.
    - `meta_routes.py`: 태그 및 카테고리 목록 제공.
    - `utils.py`: 마크다운 및 본문 파싱 유틸리티.
- **보안**: 모든 엔드포인트는 `api_key_required` 데코레이터를 통해 토큰 검증 수행.

---

## 2. 레이아웃 시스템 (Layout System)

### [LayoutManager.js](../../static/js/components/LayoutManager.js)
- **역할**: 현재 활성화된 레이아웃(그리드/리스트)을 관리하고 전환 제어.
- **부모**: `UI.js`
- **자식**: `MasonryLayout`, `ListLayout`

### [MasonryLayout.js](../../static/js/components/layouts/MasonryLayout.js)
- **역할**: 핀터레스트 스타일의 카드형 레이아웃 렌더링.
- **부모**: `LayoutManager`

### [ListLayout.js](../../static/js/components/layouts/ListLayout.js)
- **역할**: 한 줄씩 요약된 고밀도 리스트 형태의 레이아웃 렌더링.
- **부모**: `LayoutManager`

---

## 3. 기능 매니저 (Functional Managers)

### [WeeklyManager.js](../../static/js/components/WeeklyManager.js)
- **역할**: 주간 달력 UI 제공 및 날짜별 활동량(Dot) 표시.
- **부모**: `AppService`
- **관계**: `HeatmapManager`의 데이터를 참조하여 활동량 레벨 결정.

### [HeatmapManager.js](../../static/js/components/HeatmapManager.js)
- **역할**: 사이드바의 연간 활동 히트맵 렌더링 및 데이터 관리.
- **부모**: `AppService`

### [ModalManager.js](../../static/js/components/ModalManager.js)
- **역할**: 모든 공통 모달(상세보기, 설정, 카테고리 등)의 열기/닫기 및 생명주기 관리.
- **부모**: `AppService`

### [RelationManager.js](../../static/js/components/RelationManager.js)
- **역할**: '관계 포커스 모드' 담당. 메모 간의 화살표(SVG) 시각화 및 하이라이트 제어.
- **부모**: `AppService`

---

## 4. 개별 UI 컴포넌트 (UI Components)

### [MemoCard.js](../../static/js/components/MemoCard.js)
- **역할**: 개별 메모 카드의 뼈대 생성 및 클릭 이벤트 바인딩.
- **부모**: `MasonryLayout`, `ListLayout`
- **자식**: `MemoCardParts`, `AttachmentBox`

### [MemoCardParts.js](../../static/js/components/MemoCardParts.js)
- **역할**: 메모 카드의 내부 구성 요소(헤더, 본문, 태그, 푸터) 렌더링 담당.
- **부모**: `MemoCard`

### [AttachmentBox.js](../../static/js/components/AttachmentBox.js)
- **역할**: 메모에 첨부된 파일 목록(이미지, 파일 아이콘 등) 렌더링.
- **부모**: `MemoCard`

---

## 5. 유틸리티 (Utilities)

- **[I18nManager.js](../../static/js/utils/I18nManager.js)**: 다국어(KO/EN) 번역 텍스트 매핑.
- **[ShortcutManager.js](../../static/js/utils/ShortcutManager.js)**: 전역 단축키 이벤트 등록 및 처리.
- **[SlashRegistry.js](../../static/js/utils/SlashRegistry.js)**: 슬래시 명령어(/) 정의 및 엔진 등록.
