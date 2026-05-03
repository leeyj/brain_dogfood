/**
 * 전역 단축키 관리 모듈 (ShortcutManager)
 */
import { CommandRegistry } from './CommandRegistry.js';

export const ShortcutManager = {
    init(onUpdate) {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e, onUpdate));
    },

    handleKeyDown(e, onUpdate) {
        if (!e.key) return;
        
        const isCtrl = e.ctrlKey || e.metaKey;
        const isAlt = e.altKey;
        const key = e.key.toLowerCase();
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                        document.activeElement.isContentEditable;

        // 1. ESC: 모든 창 닫기
        if (e.key === 'Escape') {
            CommandRegistry.execute('ui:close_all');
            return;
        }

        // 2. 작성기 저장 (Ctrl + Enter / Ctrl + S)
        if (isCtrl && (key === 'enter' || key === 's')) {
            e.preventDefault();
            CommandRegistry.execute('composer:save', onUpdate);
            return;
        }

        // 3. Ctrl + Shift 조합 (네비게이션 및 UI 토글)
        if (isCtrl && e.shiftKey) {
            const cmdMap = {
                'n': 'composer:open',
                'g': 'ui:toggle_graph',
                'e': 'ui:toggle_explorer',
                'c': 'ui:toggle_calendar',
                'q': 'ui:close_all'
            };
            const cmd = cmdMap[key];
            if (cmd) {
                e.preventDefault();
                CommandRegistry.execute(cmd, onUpdate);
            }
            return;
        }

        // 4. Alt 조합 (전역 네비게이션)
        if (isAlt && !isCtrl) {
            e.preventDefault();
            
            // Alt + 1~9
            if (key >= '1' && key <= '9') {
                const navMap = {
                    '1': 'nav:all',
                    '2': 'nav:pinned',
                    '3': 'nav:today',
                    '4': 'nav:weekly',
                    '5': 'nav:files',
                    '6': 'nav:done',
                    '7': 'ui:toggle_explorer',
                    '8': 'ui:toggle_graph',
                    '9': 'ui:toggle_settings'
                };
                CommandRegistry.execute(navMap[key], onUpdate);
                return;
            }

            // Alt + 기타
            const altCmdMap = {
                'w': 'ui:toggle_weekly',
                'a': 'nav:all',
                'n': 'composer:open',
                '`': 'composer:open'
            };
            const cmd = altCmdMap[key];
            if (cmd) CommandRegistry.execute(cmd, onUpdate);
            return;
        }

        // 5. 'e': 즉시 수정 (Input이 아니고 호버 상태일 때)
        if (key === 'e' && !isCtrl && !isAlt && !e.shiftKey && !isInput) {
            e.preventDefault();
            CommandRegistry.execute('memo:edit_hovered');
            return;
        }

        // 6. '?': 단축키 도움말
        if (e.key === '?' && !isCtrl && !isAlt && !isInput) {
            e.preventDefault();
            CommandRegistry.execute('ui:show_shortcuts');
        }
    }
};
