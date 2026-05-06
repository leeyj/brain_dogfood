# 버그 수정 내역: Ctrl+Enter 메모 중복 저장 이슈

## 1. 개요
- **날짜**: 2026-05-06
- **이슈**: `Ctrl+Enter` 단축키로 메모 저장 시 메모가 두 번 생성되는 현상 발생.

## 2. 원인 분석
1. **이벤트 전파 이슈**:
   - `editor.js`에서 Toast UI 에디터용 `Ctrl+Enter` 핸들러가 실행된 후, 이벤트가 `document`까지 전파됨.
   - `ShortcutManager.js`의 전역 핸들러가 동일한 이벤트를 감지하여 저장 로직(`ComposerManager.handleSave`)을 다시 호출함.
2. **상태 관리 부재**:
   - `ComposerManager.handleSave`에 비동기 작업 중 중복 요청을 방지하는 가드 로직이 없었음.

## 3. 수정 사항
### [static/js/editor.js](file:///c:/project/my_util/memo_server/static/js/editor.js)
- `Ctrl+Enter` 감지 시 `e.preventDefault()` 및 `e.stopPropagation()`을 호출하여 전역 핸들러로의 이벤트 전파를 차단함.

### [static/js/components/CategoryManager.js](file:///c:/project/my_util/memo_server/static/js/components/CategoryManager.js)
- `isProcessing` 플래그를 도입하여 카테고리 추가/삭제/핀 토글 시 중복 요청이 발생하지 않도록 방어 로직 추가.

### [기타 컴포넌트]
- **SlashCommand.js**, **RelationManager.js**, **PasswordPromptModal.js**: 주요 키보드 이벤트(`ESC`, `Enter`) 핸들러에 `e.stopPropagation()`을 추가하여 전역 핸들러와의 충돌 방지.

## 4. 영향도
- **긍정적**: 시스템 전반의 UI 반응성 및 데이터 안정성 향상. 특히 빠른 조작 시에도 예상치 못한 동작(작성기 닫힘 등)이 발생하지 않음.
- **부작용 없음**: 기존 로직의 흐름을 유지하면서 안전 장치만 추가됨.

## 5. 해결 사항
- 모든 관련 지점에서 중복 요청 및 의도치 않은 이벤트 전파가 해결되었음을 확인.
