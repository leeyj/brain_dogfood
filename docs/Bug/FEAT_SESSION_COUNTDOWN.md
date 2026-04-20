# [FEAT] 세션 타임아웃 카운트다운 타이머 구현

## 버그/기능 내용
- 세션이 소리 소문 없이 만료되어 작업 중인 내용이 저장되지 않는 문제를 방지하기 위해, 로그아웃 버튼에 실시간 남은 세션 시간을 표시하는 기능을 추가함.
- 버튼 크기 비대화를 방지하기 위해 "로그아웃" 텍스트를 "종료"(KO) / "EXIT"(EN)로 축약함.

## 조치 사항
1. **로케일 수정**: `static/locales/ko.json`, `en.json`에서 `nav_logout` 값을 축약형으로 변경.
2. **신규 컴포넌트**: `static/js/components/SessionManager.js` 생성.
   - 서버 설정(`/api/settings`)의 `session_timeout` 값을 초 단위로 변환하여 관리.
   - 1초마다 카운트다운을 수행하고 로그아웃 버튼의 텍스트(`span.text`)를 업데이트.
3. **사용자 활동 감지**: `mousedown`, `keydown`, `touchstart` 이벤트 발생 시 타이머를 원래 설정값으로 리셋.
4. **자동 로그아웃**: 카운트가 `00:00`에 도달하면 알림 표시 후 `/logout`으로 리다이렉트.
5. **통합**: `static/app.js`에서 초기화 코드 추가.

## 향후 주의 사항
- `I18nManager.applyTranslations()`가 실행될 때 `data-i18n` 속성에 의해 타이머 텍스트가 덮어씌워질 수 있으나, `SessionManager`가 1초 단위로 다시 그리므로 시각적 문제는 미미함.
- 브라우저 탭이 비활성 상태(Background)일 때 `setInterval`의 작동 주기가 느려질 수 있으나, 다시 포커스를 얻으면 실제 시간 흐름을 보정하거나 활동 시 리셋되므로 사용성에는 큰 문제가 없음.
