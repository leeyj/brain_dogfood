/**
 * 작성기(Composer) 단축키 관리 모듈
 */
import { I18nManager } from '../../utils/I18nManager.js';
import { ComposerCategoryUI } from './ComposerCategoryUI.js';

export const ComposerShortcuts = {
    init(handlers) {
        this.handlers = handlers; // { onToggleDone, onSelectCategory, onClearCategory, isVisible }
        
        // 1. 단축키 힌트 초기화
        this.initShortcutHint();
        
        // 2. 전역 키보드 리스너 (Composer가 보일 때만 동작)
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    },

    initShortcutHint() {
        const toggle = document.getElementById('shortcutToggle');
        const details = document.getElementById('shortcutDetails');
        if (toggle && details) {
            toggle.onclick = () => {
                const isVisible = details.style.display !== 'none';
                details.style.display = isVisible ? 'none' : 'flex';
                toggle.textContent = isVisible ? I18nManager.t('shortcuts_label') : `${I18nManager.t('shortcuts_label')} ▲`;
            };
        }
    },

    handleKeyDown(e) {
        if (!this.handlers.isVisible()) return;
        if (!e.altKey) return;

        const key = e.key;
        if (key === '1') {
            e.preventDefault();
            this.handlers.onToggleDone();
        } else if (key === '2' || key === '3' || key === '4') {
            e.preventDefault();
            const slotIdx = parseInt(key) - 1;
            const cat = ComposerCategoryUI.getCategoryBySlot(slotIdx);
            if (cat) {
                this.handlers.onSelectCategory(cat);
            }
        } else if (key === '5') {
            e.preventDefault();
            this.handlers.onClearCategory();
        }
    }
};
