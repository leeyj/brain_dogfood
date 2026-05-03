# 버그 수정 내역 (2026-05-04)

## 개요
- **이슈:** `ThemeManager.js`를 삭제하고 모듈을 분리한 후, 브라우저 콘솔에서 `ThemeManager.js`에 대한 404 (NOT FOUND) 에러 발생.
- **원인:** 메인 진입점인 `static/app.js` 파일에 삭제된 `ThemeManager.js`의 `import` 구문이 남아 있어서 발생한 문제.

## 영향도
- 앱 실행 시점에 404 에러가 발생하나, `ThemeManager` 객체 자체는 `app.js` 내에서 직접 호출되지 않아 기능상 치명적인 오작동은 없었음.
- 그러나 콘솔 에러가 발생하여 디버깅 및 사용자 경험에 혼선을 줄 수 있음.

## 수정 사항
- `static/app.js`에서 불필요해진 `import { ThemeManager } from './js/components/ThemeManager.js';` 구문 제거.

## 해결 완료
- 콘솔 에러 제거 완료 및 정상 작동 확인.
