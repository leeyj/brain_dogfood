import { ComposerManager } from '../components/ComposerManager.js';
import { CalendarManager } from '../components/CalendarManager.js';
import { AppService } from '../AppService.js';

export const ShortcutManager = {
    init(updateSidebarCallback) {
        document.addEventListener('keydown', (e) => {
            if (!e.key) return;
            const isCtrl = e.ctrlKey || e.metaKey;
            const isAlt = e.altKey;
            const key = e.key.toLowerCase();

            // 1. ESC: 모든 창 닫기
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active, .drawer.active').forEach(el => el.classList.remove('active'));
                if (ComposerManager.DOM.composer && ComposerManager.DOM.composer.style.display === 'block') ComposerManager.close();
                return;
            }

            // 2. Ctrl + Enter / Ctrl + S: 저장 (작성기 열려있을 때)
            if (isCtrl && (key === 'enter' || key === 's')) {
                if (ComposerManager.DOM.composer && ComposerManager.DOM.composer.style.display === 'block') {
                    e.preventDefault();
                    ComposerManager.handleSave(updateSidebarCallback);
                }
                return;
            }

            // 3. Ctrl + Shift + Key 조합들 (네비게이션)
            if (isCtrl && e.shiftKey) {
                e.preventDefault();
                switch (key) {
                    case 'n': // 새 메모
                        ComposerManager.openEmpty();
                        break;
                    case 'g': // 지식 네뷸라
                        const openGraphBtn = document.getElementById('openGraphBtn');
                        if (openGraphBtn) openGraphBtn.click();
                        break;
                    case 'e': // 지식 탐색기
                        const openExplorerBtn = document.getElementById('openExplorerBtn');
                        if (openExplorerBtn) openExplorerBtn.click();
                        break;
                    case 'c': // 캘린더 토글
                        CalendarManager.isCollapsed = !CalendarManager.isCollapsed;
                        localStorage.setItem('calendar_collapsed', CalendarManager.isCollapsed);
                        CalendarManager.updateCollapseUI();
                        break;
                    case 'q': // 닫기
                        document.querySelectorAll('.modal.active, .drawer.active').forEach(el => el.classList.remove('active'));
                        if (ComposerManager.DOM.composer) ComposerManager.close();
                        break;
                }
                return;
            }

            // 4. Alt 조합 (전역 네비게이션 - 왼손의 법칙)
            if (isAlt && !isCtrl) {
                if (key >= '1' && key <= '9') {
                    e.preventDefault();
                    this.handleGlobalNavigation(key, updateSidebarCallback);
                    return;
                }

                switch (key) {
                    case 'w': // 주간 뷰 토글
                        e.preventDefault();
                        const toggleWeeklyBtn = document.getElementById('toggleWeeklyBtn');
                        if (toggleWeeklyBtn) toggleWeeklyBtn.click();
                        break;
                    case 'a': // 전체 지식
                        e.preventDefault();
                        AppService.setFilter({ group: 'all' }, updateSidebarCallback);
                        break;
                    case 'n': // 새 메모
                        e.preventDefault();
                        ComposerManager.openEmpty();
                        break;
                    case '`': // Quake-style 새 메모
                        e.preventDefault();
                        if (ComposerManager.DOM.composer) ComposerManager.openEmpty();
                        break;
                }
                return;
            }

            // 5. Category Slots: Ctrl + Alt + 1~4 (작성기 열려있을 때)
            if (isCtrl && isAlt && (key >= '1' && key <= '4')) {
                if (ComposerManager.DOM.composer && ComposerManager.DOM.composer.style.display === 'block') {
                    e.preventDefault();
                    const slotIndex = parseInt(key) - 1;
                    ComposerManager.toggleCategoryBySlot(slotIndex);
                }
                return;
            }

            // 6. 'e': 즉시 수정 (마우스 오버 상태일 때)
            if (key === 'e' && !isCtrl && !isAlt && !e.shiftKey) {
                const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                                document.activeElement.isContentEditable;
                
                const hoveredId = window.hoveredMemoId || AppService.state.hoveredMemoId;
                const state = AppService.state;
                
                if (!isInput && hoveredId && state.eventHandlers) {
                    e.preventDefault();
                    state.eventHandlers.onEdit(hoveredId);
                }
            }

            // 7. '?': 단축키 도움말 (Input이 아닐 때)
            if (e.key === '?' && !isCtrl && !isAlt) {
                const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                                document.activeElement.isContentEditable;
                if (!isInput) {
                    e.preventDefault();
                    document.getElementById('shortcutModal').classList.add('active');
                }
            }
        });
    },

    /**
     * Alt + 1~9 전역 네비게이션 핸들러
     */
    handleGlobalNavigation(key, onUpdate) {
        const today = new Date();
        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        switch (key) {
            case '1': // 전체
                AppService.setFilter({ group: 'all' }, onUpdate);
                break;
            case '2': // 고정
                AppService.setFilter({ group: 'pinned' }, onUpdate);
                break;
            case '3': // 오늘
                AppService.setFilter({ date: formatDate(today) }, onUpdate);
                break;
            case '4': // 이번주
                const first = today.getDate() - today.getDay();
                const last = first + 6;
                const start = new Date(new Date().setDate(first));
                const end = new Date(new Date().setDate(last));
                AppService.setFilter({ start_date: formatDate(start), end_date: formatDate(end) }, onUpdate);
                break;
            case '5': // 파일
                AppService.setFilter({ group: 'files' }, onUpdate);
                break;
            case '6': // 완료
                AppService.setFilter({ group: 'done' }, onUpdate);
                break;
            case '7': // 탐색기
                const explorerBtn = document.getElementById('openExplorerBtn');
                if (explorerBtn) explorerBtn.click();
                break;
            case '8': // 성단 (그래프)
                const graphBtn = document.getElementById('openGraphBtn');
                if (graphBtn) graphBtn.click();
                break;
            case '9': // 설정
                const settingsBtn = document.getElementById('settingsBtn');
                if (settingsBtn) settingsBtn.click();
                break;
        }
    }
};
