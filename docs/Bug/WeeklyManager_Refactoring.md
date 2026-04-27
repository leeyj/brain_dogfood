# WeeklyManager 컴포넌트화 및 리팩토링

## 1. 개요
`WeeklyManager.js`의 구조를 개선하여 유지보수성을 높이고, 디자인을 고도화함.

## 2. 변경 내용 및 조치 사항
- **JS 리팩토링**:
    - 객체 리터럴 내부에 `state` 객체를 도입하여 상태 관리 체계화.
    - `render()` 메서드를 `_renderHeader`, `_renderDays`, `_renderDayItem` 등 내부 메서드로 분리하여 가독성 향상.
    - `window.HeatmapManager` 접근 시 옵셔널 체이닝(`?.`)을 적용하여 안정성 확보.
    - 이벤트 바인딩 로직을 `_bindEvents`로 통합.
- **CSS 고도화**:
    - `backdrop-filter: blur()`를 활용한 글래스모피즘 효과 적용.
    - `transition` 및 `transform`을 활용한 부드러운 마이크로 인터랙션(호버 효과 등) 추가.
    - 활성 상태(`active`) 및 오늘 날짜(`today`) 시인성 강화.

## 3. 향후 주의 사항
- `AppService`의 전역 상태(`currentFilterDate`, `currentStartDate` 등)와 동기화되도록 설계되었으므로, 필터 로직 변경 시 `WeeklyManager.render()` 호출 여부를 확인해야 함.
- Heatmap 데이터가 로드되지 않은 상태에서 렌더링될 경우 도트 레벨이 0으로 표시되므로, 데이터 로드 후 `render()` 재호출이 필요함.
