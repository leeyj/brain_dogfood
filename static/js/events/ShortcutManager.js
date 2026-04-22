import { ComposerManager } from '../components/ComposerManager.js';
import { CalendarManager } from '../components/CalendarManager.js';

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
            }

            // 4. Quake-style Shortcut: Alt + ` (새 메모)
            if (isAlt && key === '`') {
                e.preventDefault();
                if (ComposerManager.DOM.composer) ComposerManager.openEmpty();
                return;
            }

            // 5. Category Slots: Alt + 1~4
            if (isAlt && (key >= '1' && key <= '4')) {
                if (ComposerManager.DOM.composer && ComposerManager.DOM.composer.style.display === 'block') {
                    e.preventDefault();
                    const slotIndex = parseInt(key) - 1; // 1->0 (Done), 2->1 (Cat1)...
                    ComposerManager.toggleCategoryBySlot(slotIndex);
                }
            }

            // 6. 'e': 즉시 수정 (마우스 오버 상태일 때)
            if (key === 'e' && !isCtrl && !isAlt && !e.shiftKey) {
                const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                                document.activeElement.isContentEditable;
                if (!isInput && window.hoveredMemoId && window.memoEventHandlers) {
                    e.preventDefault();
                    window.memoEventHandlers.onEdit(window.hoveredMemoId);
                }
            }
        });
    }
};
