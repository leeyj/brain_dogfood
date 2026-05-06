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

### [static/js/components/ComposerManager.js](file:///c:/project/my_util/memo_server/static/js/components/ComposerManager.js)
- `isSaving` 플래그를 도입하여 저장 프로세스가 진행 중인 경우 추가 요청을 무시하도록 가드 로직 추가.
- `finally` 블록을 사용하여 성공/실패 여부와 관계없이 플래그를 초기화하도록 보장.

## 4. 영향도
- **긍정적**: 단축키 사용 시 데이터 정합성 보장 및 서버 불필요 요청 감소.
- **부작용 없음**: 기존의 마우스 클릭 저장 및 기타 단축키 기능은 그대로 유지됨.

## 5. 해결 사항
- `Ctrl+Enter` 입력 시 메모가 정확히 한 번만 저장됨을 확인.
- 저장 중 버튼 연타 시에도 중복 생성이 방지됨.
