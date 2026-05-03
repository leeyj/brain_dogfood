# 프론트엔드 모듈 리팩토링 및 고도화 계획 (2026-05-03)

현재 시스템의 유지보수성을 높이고 코드 응집도를 개선하기 위한 모듈화 계획입니다.

## 📋 리팩토링 대상 분석

| 대상 모듈 | 주요 문제점 | 개선 방안 | 구현 난이도 | 사이드 이펙트 | 우선순위 |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **ThemeManager.js** | 테마 외에 전체 설정, 모달 제어, 하트비트 등이 섞여 있음 | `SettingsManager`와 `ThemeEngine`으로 분리 | 중 | 높음 (전역 설정 영향) | **완료** |
| **AppService.js** | 전역 상태(State)와 복잡한 필터링 로직이 결합됨 | `AppState`와 `FilterService`로 분리 | 중 | 매우 높음 (앱 전체 로직) | **완료** |
| **Visualizer.js** | D3.js 렌더링과 데이터 분석 로직이 혼재됨 | `GraphAnalyzer`와 `GraphRenderer`로 분리 | 상 | 낮음 (시각화 맵에 국한) | **완료** |
| **ShortcutManager.js** | DOM 쿼리 하드코딩 및 날짜 계산 로직 포함 | `DateUtils` 추출 및 `CommandRegistry` 도입 | 하 | 낮음 (단축키 동작) | **완료** |
| **MemoCardParts.js** | 다양한 UI 부품이 한 파일에 모여 있어 비대해짐 | 성격에 따라 `CardHeader`, `CardMeta` 등으로 추가 분할 | 하 | 낮음 (카드 렌더링) | **완료** |

---

## 🛠️ 상세 개선 방향

### 1. ThemeManager (설정 및 테마 분리)
- **SettingsManager (New)**: `API.fetchSettings`, `API.saveSettings` 호출 및 설정 모달 DOM 관리 전담.
- **ThemeEngine (New)**: CSS Variables 주입, 다크모드 감지, 색상 대비 계산(`getContrastColor`) 등 순수 테마 로직 전담.
- **SessionHeartbeat (New)**: `AppService.startSessionHeartbeat` 관련 주기적 인증 체크 로직 독립.

### 2. AppService (상태 및 필터 로직 분리)
- **AppState (New)**: 애플리케이션의 반응형 상태 값만 보유하는 단순 데이터 저장소.
- **FilterService (New)**: `setFilter` 내의 복잡한 날짜/그룹/카테고리 분기 로직 및 `loadMore` 조율 로직 전담.

### 3. Visualizer (시각화 엔진 분리)
- **GraphAnalyzer (New)**: 메모 간의 관계(Internal Links, Tags, Groups)를 분석하여 D3용 `nodes`와 `links` 배열을 생성하는 비즈니스 로직.
- **GraphRenderer (New)**: D3.js 시뮬레이션 설정, Zoom, Drag, SVG 요소 생성 등 순수 렌더링 로직.

### 4. ShortcutManager (데이터 기반 단축키 관리)
- **DateUtils (New)**: `today`, `this_week`, `formatDate` 등 날짜 관련 공통 함수 추출.
- **Registry Pattern**: 키 입력에 따른 실행 액션을 외부에서 등록받는 구조로 변경하여 하드코딩된 `document.getElementById` 호출 제거.

---

## 📅 향후 일정
1. **Phase 1**: `ThemeManager` 리팩토링 (가장 시급)
2. **Phase 2**: `AppService` 상태 분리 (시스템 안정성 강화)
3. **Phase 3**: 시각화 및 단축키 모듈 고도화
