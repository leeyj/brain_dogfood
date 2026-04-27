# 버그 리포트: SQL 쿼리 중앙 집중화 및 주간 달력 기한 도트 표시 오류

- **날짜**: 2026-04-24
- **작성자**: Antigravity (AI Assistant)

## 1. 버그 내용

### 1.1 SQL 리팩토링 후 문법 오류 (Syntax Error)
- **증상**: `memo_repo.py` 파일 로드 시 `Simple statements must be separated by newlines or semicolons` 등의 문법 에러 발생.
- **원인**: 
    - 클래스 독스트링(`"""`)이 닫히지 않은 상태에서 코드가 이어져 이후 로직이 문자열로 취급됨.
    - 리팩토링 중 도려내지 못한 코드 파편이 잔류함.
    - `ai.py` 등에서 `request` 객체 임포트 누락.

### 1.2 주간 달력 기한 만료 도트(Red Dot) 미표시
- **증상**: 오늘 기한인 메모가 존재함에도 주간 달력 상단 요일 옆에 붉은색 알림 도트가 나타나지 않음.
- **원인**:
    - **CSS**: 상위 컨테이너(`.wk-days`)의 `overflow: hidden`으로 인해 절대 좌표로 배치된 도트(`.wk-deadline-dot`)가 잘림.
    - **통계 로직**: 히트맵 데이터 로딩 타이밍(365일 vs 30일)이 엇갈리면서 `WeeklyManager`가 갱신되지 않음.
    - **데이터**: DB의 `due_date` 형식과 JS의 날짜 매칭 오차 가능성.

## 2. 조치 사항

### 2.1 코드 안정화
- `memo_repo.py`의 모든 독스트링 형식을 정수화하고 잔류 파편 코드를 제거함.
- `python -m py_compile`을 통해 전체 파일의 문법 정합성을 검증함.
- `ai.py` 등 누락된 Flask 필수 객체(`request`) 임포트를 보강함.

### 2.2 기한 표시 시스템 복구
- **SQL**: `queries.py`의 `GET_HEATMAP` 쿼리에서 `date()` 함수를 사용하여 날짜 형식을 강제하고, `CAST`를 통해 정수형 반환을 보장함.
- **CSS**: `.wk-days`의 `overflow: hidden`을 제거하여 시각적 가시성을 확보함.
- **JS**: `HeatmapManager`에 데이터 갱신 전역 이벤트(`heatmapDataRefreshed`)를 도입하고, `WeeklyManager`가 이를 구독하여 즉시 렌더링하도록 개선함.

## 3. 향후 주의사항
- **CSS Layout**: `position: absolute`를 사용하는 자식 요소가 있을 경우 부모의 `overflow: hidden` 설정이 시각적 버그를 유발할 수 있음을 항상 고려할 것.
- **Event Driven UI**: 비동기 데이터 로딩이 수반되는 여러 컴포넌트 간의 상태 동기화는 명시적인 이벤트 시스템을 사용하여 레이스 컨디션을 방지할 것.
- **SQL Centralization**: 쿼리 수정 시 `queries.py`를 중심으로 변경하되, 연관된 서비스 레이어(`MemoService`)의 데이터 매핑 형식을 엄격히 준수할 것.
