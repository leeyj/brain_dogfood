# 🐛 버그 리포트 관리 및 분석 (Bug Report Index)

이 문서는 `docs/bug` 디렉토리에 기록된 모든 버그 수정 내역 및 리팩토링 기록을 체계적으로 관리하기 위한 인덱스입니다.

---

## 📁 카테고리별 버그 리포트

### 🛡️ Core & Security (데이터, 암호화, 세션, 리소스)
- [2026-05-04] [고아 파일 업로드 누수 이슈](20260504_bugfix_orphan_uploads_leak.md)
- [2026-04-29] [메모 암호화 저장 누락](20260429_bugfix_memo_encryption.md)
- [2026-04-26] [암호화 타입 미스매치](20260426_bugfix_encrypted_type_mismatch.md)
- [2026-04-22] [비밀번호 마스킹 처리](20260422_password_masking.md)
- [2026-04-20] [세션 타임아웃 처리](20260420_session_timeout_fix.md)
- [2026-04-18] [마크다운 수평선 데이터 소실](data_loss_bug_20260418.md)
- [2026-04-18] [세션 만료 시 JSON 파싱 에러](memo_save_error_20260418.md)
- [Unknown] [HTML 색상 코드 태그 오인](BUG_TAG_HTML_COLOR_CONFLICT.md)
- [Unknown] [세션 카운트다운 기능](FEAT_SESSION_COUNTDOWN.md)

### 🎨 UI/UX & Aesthetics (스타일, 레이아웃, 아이콘)
- [2026-05-04] [테마 매니저 404 에러](20260504_bugfix_theme_manager_404.md)
- [2026-04-23] [UI 개선 및 통일](20260423_ui_refinement.md)
- [2026-04-23] [아이콘 체계 통일](20260423_ui_icon_unification.md)
- [2026-04-23] [자동 대비(Auto Contrast) 기능](20260423_auto_contrast_feature.md)
- [2026-04-22] [UI/UX 정교화 작업](2026-04-22_ui_ux_refinement.md)
- [2026-04-21] [스크롤 UX 개선](20260421_scroll_ux_fix.md)
- [2026-04-19] [첨부파일 버튼 레이아웃](20260419_attachment_button_fix.md)

### ⚡ Event & Interaction (단축키, 이벤트 전파, 입력)
- [2026-05-06] [Ctrl+Enter 중복 저장 이슈](20260506_bugfix_duplicate_memo_save.md)
- [2026-04-22] [UIEventBinder 구문 오류](20260422_UIEventBinder_Syntax.md)
- [2026-04-17] [링크 단축키 동작 수정](20260417_link_shortcut_fix.md)

### 🛠️ Infra & Integration (설정, 서버, 외부 라이브러리)
- [2026-05-04] [ToastUI 분석 CSP 보안 정책](20260504_bugfix_toastui_analytics_csp.md)
- [2026-04-27] [외부 모듈 임포트 오류](20260427_bugfix_external_modular_import_error.md)
- [2026-04-20] [Docker 지원 환경 구축](20260420_docker_support.md)
- [2026-04-20] [README 접속 정보 업데이트](20260420_readme_access_info.md)

### 🚀 Features & Refactoring (기능 추가, 대규모 리팩토링)
- [2026-04-24] [쿼리 리팩토링 및 마감일 수정](20260424_query_refactoring_and_deadline_fix.md)
- [2026-04-23] [관계 포커스 기능](20260423_relation_focus_feature.md)
- [2026-04-23] [마감일 시스템 통합](20260423_deadline_system_integration.md)
- [2026-04-22] [주간/일일 필터 수정](20260422_weekly_daily_filter_fix.md)
- [2026-04-22] [주간 뷰 리팩토링](2026-04-22_weekly_view_refactoring.md)
- [2026-04-21] [아키텍처 리팩토링 (칸반 홀드)](20260421_arch_refactoring_and_kanban_hold.md)
- [2026-04-18] [AI 요약 언어 동기화](ai_summary_language_sync_20260418.md)
- [Unknown] [무한 스크롤 날짜 필터 오류](BUG_INFINITE_SCROLL_DATE_FILTER.md)
- [Unknown] [주간 매니저 리팩토링](WeeklyManager_Refactoring.md)
- [Unknown] [도움말 시스템 개편](help_system_revamp.md)
- [Unknown] [업데이트 시스템 통합](update_system_integration.md)

---

## 🔍 반복되는 이슈 분석 (Recurring Issues Analysis)

### 1. 이벤트 전파 (Event Propagation) 문제
*   **증상**: 에디터 단축키, UI 컴포넌트 이벤트, 전역 단축키 핸들러(`ShortcutManager`)가 중복 실행되어 데이터가 여러 번 저장되거나 창이 의도치 않게 닫힘.
*   **해결책**:
    *   하위 컴포넌트 핸들러에서 `e.stopPropagation()` 및 `e.preventDefault()`를 명시적으로 호출.
    *   중요 비동기 로직(저장, 삭제 등)에 `isProcessing` 플래그를 도입하여 중복 요청 방지.
*   **향후 대책**: 이벤트 핸들링을 중앙 집중화하고, 활성 모달이나 에디터가 있을 경우 전역 단축키를 일시 중단하는 우선순위 시스템 도입 검토.

### 2. 메타데이터 파싱 (Regex Greedy Match) 문제
*   **증상**: 마크다운 수평선(`---`) 뒤의 내용을 푸터로 오인하거나, CSS 색상 코드(`#ffffff`)를 태그로 인식하여 데이터가 소실되거나 오염됨.
*   **해결책**:
    *   정규식에 전방/후방 탐색(`(?<!...)`) 조건을 추가하여 문맥(Context) 인식 강화.
    *   줄 시작(`^`)과 끝(`$`) 앵커를 활용하여 매칭 범위를 엄격하게 제한.
*   **향후 대책**: 정규식 기반 파싱의 한계를 인정하고, 마크다운 AST 파서를 도입하여 구조적으로 분석하는 방식 고려.

### 3. API 통신 및 세션 일관성 문제
*   **증상**: 세션 만료 시 백엔드가 로그인 페이지(HTML)로 리다이렉트하여 프론트엔드에서 `Unexpected token '<'` (JSON 파싱 에러) 발생.
*   **해결책**:
    *   백엔드 인증 데코레이터에서 `/api/` 경로 요청에 대해 `401 Unauthorized` JSON 응답을 반환하도록 수정.
    *   프론트엔드 API 호출부에서 응답 상태 코드를 먼저 확인하는 방어 코드 강화.
*   **향후 대책**: 전역 에러 핸들러를 통해 모든 예외 상황에서 클라이언트가 기대하는 `Content-Type`에 맞는 응답을 보장.

---
*마지막 업데이트: 2026-05-06*
