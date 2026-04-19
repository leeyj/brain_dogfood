# 💡 지식 작성기(Composer) 파일 첨부 버튼 누락 및 모바일 UI 개선

- **날짜**: 2026-04-19
- **작성자**: Antigravity (AI Agent)

## 1. 개요
지식 작성기(Composer)에서 드래그 앤 드롭 방식 외에 파일을 직접 선택할 수 있는 물리적 버튼이 없어 접근성이 낮음. 특히 모바일 환경에서 아이콘만 있을 경우 조작 오탐점이 높고 가시성이 떨어지는 문제 발생.

## 2. 조치 사항
- **UI 개선**:
  - `templates/components/composer.html` 내부에 클립(📎) 아이콘 버튼 및 숨겨진 `input[type="file"]` 추가.
  - 모바일 해상도(768px 이하)에서만 나타나는 텍스트 레이블("파일추가") 추가.
- **다국어 지원(i18n)**:
  - `static/locales/ko.json`, `en.json`에 `composer_attach_file`, `composer_attach_label` 키 추가.
- **로직 최적화**:
  - `static/js/editor.js`: 드롭 이벤트와 버튼 클릭 이벤트를 공통으로 처리하기 위한 `handleFiles()` 함수 추출.
  - `static/js/components/ComposerManager.js`: 신규 버튼과 파일 인풋 간의 이벤트 바인딩 처리.
- **스타일링**:
  - `static/css/layout.css`: 기본 레이블 숨김 처리.
  - `static/css/mobile.css`: 모바일 환경에서 레이블 노출 및 터치 영역 최적화.

## 3. 결과 및 검증
- 홈 서버 배포 완료.
- 데스크톱: 툴팁 지원 및 깔끔한 아이콘 UI 확인.
- 모바일: 텍스트 레이블 노출로 조작 편의성 증대 확인.

## 4. 향후 주의 사항
- `action-btn` 스타일 변경 시 모바일에서의 `min-width`, `min-height`가 `44px` 이상 유지되는지 확인 필요 (Apple/Google UI 가이드라인 준수).
