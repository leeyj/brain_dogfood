# 버그 수정 내역 (2026-05-04)

## 개요
- **이슈:** `https://www.google-analytics.com/collect...` 로밍 이미지 로드 시 Content Security Policy (CSP) 에러 발생.
- **원인:** Memo Server에서 사용하는 마크다운 에디터 모듈(ToastUI Editor) 내부에 자체 사용량 통계 수집 코드(Google Analytics)가 포함되어 있음. Memo Server의 강력한 보안 정책(`img-src 'self' data: blob:`)이 외부 이미지 로딩을 차단하여 발생한 정상적인 방어 로그임.

## 영향도
- 외부로 데이터가 새어나가는 것을 브라우저 CSP가 성공적으로 막아냈다는 증거이며, 메모 서버의 기능이나 보안에 전혀 악영향을 주지 않음. (무해한 에러 로그)

## 수정 사항
- 콘솔이 지저분해지는 것을 방지하기 위해 `static/js/editor.js`의 `toastui.Editor` 초기화 옵션에 `usageStatistics: false` 속성을 추가하여 불필요한 구글 애널리틱스 통신 시도 자체를 비활성화함.

## 해결 완료
- 이제 에디터를 열거나 수정할 때 CSP 차단 로그가 발생하지 않음.
