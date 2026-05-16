# 20260516_bugfix_frontend_component_reference_error.md

## 1. 버그 개요
- **일시**: 2026-05-16
- **유형**: 프론트엔드 런타임 오류 (ReferenceError, TypeError)
- **증상**: 
    - 사이드바 '파일' 클릭 시 `ModalManager is not defined` 발생.
    - '이번주 메모' 또는 '오늘의 메모' 클릭 시 `WeeklyManager.formatDate` 또는 `WeeklyManager.getCurrentWeek is not a function` 발생.

## 2. 영향도
- **상**: 핵심 내비게이션 및 필터링 기능 작동 불능. 사용자가 특정 기간의 메모를 조회하거나 첨부파일 라이브러리를 열 수 없음.

## 3. 원인 분석
- **임포트 누락**: `static/app.js`에서 `ModalManager`를 사용하고 있으나, 상단에 `import` 구문이 누락되어 전역 범위에서 찾을 수 없음.
- **메서드 위치 변경 미반영**: 최근 리팩토링 과정에서 `WeeklyManager`에 있던 날짜 유틸리티 기능들이 `DateUtils`로 이관되었으나, `app.js`의 콜백 로직에서는 여전히 `WeeklyManager`를 통해 호출하고 있었음.
- **초기화 시점 문제**: `WeeklyManager`가 동적 임포트(Dynamic Import)로 로드되기 전이나 로드된 후에도 명시적인 메서드 정의가 없어 호출 시 오류 발생.

## 4. 수정 사항
- **파일**: [app.js](file:///c:/project/my_util/memo_server/static/app.js)
    - `ModalManager` 및 `DateUtils` 임포트 구문 추가.
    - `updateSidebarCallback` 내 로직 수정:
        - `WeeklyManager.getCurrentWeek` -> `DateUtils.getWeekRange` (반환되는 `startStr`, `endStr` 활용)
        - `WeeklyManager.formatDate` -> `DateUtils.getTodayStr` 또는 `DateUtils.format`

## 5. 해결 사항 및 결과
- `ModalManager`가 정상적으로 참조되어 첨부파일 모달이 열림.
- 날짜 필터링 로직이 `DateUtils`를 사용하여 안정적으로 동작함.
- 브라우저 콘솔의 관련 런타임 오류가 모두 제거됨.
