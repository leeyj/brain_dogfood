# 기능 추가: 관계 포커스 모드 (Relation Focus Mode)

## 1. 개요 (Context)
메모 간의 연결 구조를 메인 화면에서 직관적으로 파악하기 어렵다는 사용자 피드백에 따라, 특정 메모와 연결된 다른 메모들을 시각적으로 강조하는 기능을 추가함.

## 2. 작업 내용 (Action)
- **단축키 도입**: `Ctrl + Alt + Click`을 통해 특정 메모를 중심으로 포커스 모드 토글 가능.
- **연결 분석 (RelationManager.js)**: 
    - Outgoing: 본문에 포함된 `[[#ID]]` 추출
    - Incoming: 다른 모든 메모 중 현재 메모 ID를 참조하는 것 검색
- **UI 하이라이트**:
    - `.relation-focused`: 선택된 메모 (강조 보더)
    - `.relation-neighbor`: 연결된 메모 (선명하게 유지)
    - `.relation-dimmed`: 관련 없는 메모 (흐릿하게 처리 및 블러 적용)
- **자동 초기화**: 필터 변경, 데이터 새로고침, ESC 키 입력, 배경 클릭 시 포커스 모드 자동 해제.

## 3. 조치 사항 (Technical Details)
- `static/js/components/RelationManager.js` 신규 생성하여 로직 분리.
- `static/js/components/MemoCard.js`에 단축키 이벤트 바인딩 추가.
- `static/css/components/memo.css`에 하이라이트용 CSS 클래스 추가.
- `AppService.js` 및 `MemoActionHandler.js`를 통해 전역 상태와 연동.

## 4. 향후 주의사항 (Notes)
- **암호화 메모**: 암호화된 메모리는 본문 검색이 불가능하므로 Outgoing 링크를 찾을 수 없음. (설계상 의도된 제한사항)
- **성능**: 현재 로드된 `AppService.state.allMemos` 캐시를 사용하므로 매우 빠르나, 수천 개의 메모가 한 화면에 렌더링될 경우 정규식 성능을 모니터링할 필요가 있음.
- **레이아웃**: `opacity`와 `filter`만 사용하므로 Masonry 레이아웃 연산에는 영향을 주지 않음.
