/**
 * 단축키 및 UI 액션을 관리하는 커맨드 레지스트리 (CommandRegistry)
 */
import { AppService } from '../AppService.js';
import { ComposerManager } from '../components/ComposerManager.js';
import { CalendarManager } from '../components/CalendarManager.js';
import { DateUtils } from '../utils/DateUtils.js';

export const CommandRegistry = {
    /**
     * 등록된 커맨드를 실행합니다.
     * @param {string} cmd - 실행할 커맨드 이름
     * @param {any} args - 필요한 인자값
     */
    execute(cmd, args) {
        console.log(`[CommandRegistry] Executing: ${cmd}`, args);
        
        switch (cmd) {
            // 1. 네비게이션 및 필터링
            case 'nav:all':
                AppService.setFilter({ group: 'all' }, args);
                break;
            case 'nav:pinned':
                AppService.setFilter({ group: 'pinned' }, args);
                break;
            case 'nav:today':
                AppService.setFilter({ date: DateUtils.getTodayStr() }, args);
                break;
            case 'nav:weekly':
                const range = DateUtils.getWeekRange();
                AppService.setFilter({ start_date: range.startStr, end_date: range.endStr }, args);
                break;
            case 'nav:files':
                AppService.setFilter({ group: 'files' }, args);
                break;
            case 'nav:done':
                AppService.setFilter({ group: 'done' }, args);
                break;

            // 2. 작성기 제어
            case 'composer:open':
                ComposerManager.openEmpty();
                break;
            case 'composer:save':
                if (ComposerManager.DOM.composer?.style.display === 'block') {
                    ComposerManager.handleSave(args);
                }
                break;
            case 'composer:close':
                ComposerManager.close();
                break;

            // 3. UI 컴포넌트 토글 (기존 버튼 클릭 시뮬레이션 포함)
            case 'ui:toggle_graph':
                this._clickElement('openGraphBtn');
                break;
            case 'ui:toggle_explorer':
                this._clickElement('openExplorerBtn');
                break;
            case 'ui:toggle_settings':
                this._clickElement('settingsBtn');
                break;
            case 'ui:toggle_weekly':
                this._clickElement('toggleWeeklyBtn');
                break;
            case 'ui:toggle_calendar':
                CalendarManager.isCollapsed = !CalendarManager.isCollapsed;
                localStorage.setItem('calendar_collapsed', CalendarManager.isCollapsed);
                CalendarManager.updateCollapseUI();
                break;
            case 'ui:show_shortcuts':
                this._addClass('shortcutModal', 'active');
                break;
            case 'ui:close_all':
                this._closeAllModals();
                break;

            // 4. 메모 관련 특수 액션
            case 'memo:edit_hovered':
                const hoveredId = window.hoveredMemoId || AppService.state.hoveredMemoId;
                if (hoveredId && AppService.state.eventHandlers?.onEdit) {
                    AppService.state.eventHandlers.onEdit(hoveredId);
                }
                break;

            default:
                console.warn(`[CommandRegistry] Unknown command: ${cmd}`);
        }
    },

    // --- Private Helpers ---

    _clickElement(id) {
        const el = document.getElementById(id);
        if (el) el.click();
    },

    _addClass(id, className) {
        const el = document.getElementById(id);
        if (el) el.classList.add(className);
    },

    _closeAllModals() {
        document.querySelectorAll('.modal.active, .drawer.active').forEach(el => {
            el.classList.remove('active');
        });
        if (ComposerManager.DOM.composer?.style.display === 'block') {
            ComposerManager.close();
        }
    }
};
