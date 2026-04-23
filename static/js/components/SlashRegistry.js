/**
 * SlashRegistry: 슬래시 명령어 목록 및 실행 로직 정의
 */
import { I18nManager } from '../utils/I18nManager.js';

export const SlashRegistry = {
    /**
     * 전체 명령어 목록 반환
     */
    getCommands() {
        return [
            { id: 'h1', icon: 'H1', label: I18nManager.t('slash.h1'), cmd: 'heading', payload: { level: 1 } },
            { id: 'h2', icon: 'H2', label: I18nManager.t('slash.h2'), cmd: 'heading', payload: { level: 2 } },
            { id: 'h3', icon: 'H3', label: I18nManager.t('slash.h3'), cmd: 'heading', payload: { level: 3 } },
            { id: 'bullet', icon: '•', label: I18nManager.t('slash.bullet'), cmd: 'bulletList' },
            { id: 'number', icon: '1.', label: I18nManager.t('slash.number'), cmd: 'orderedList' },
            { id: 'task', icon: '☑️', label: I18nManager.t('slash.task'), cmd: 'taskList' },
            { id: 'quote', icon: '❝', label: I18nManager.t('slash.quote'), cmd: 'blockQuote' },
            { id: 'line', icon: '—', label: I18nManager.t('slash.line'), cmd: 'thematicBreak' },
            { id: 'code', icon: '{}', label: I18nManager.t('slash.code'), cmd: 'codeBlock' },
            { id: 'ai-summary', icon: '🪄', label: I18nManager.t('slash.ai_summary'), cmd: 'ai-summary', isAI: true },
            { id: 'ai-tags', icon: '🏷️', label: I18nManager.t('slash.ai_tags'), cmd: 'ai-tags', isAI: true },
            { id: 'deadline', icon: '📅', label: I18nManager.t('slash.deadline'), cmd: 'deadline' }
        ];
    },

    /**
     * 명령어 실행 로직
     * @param {Object} editor - ToastUI Editor 인스턴스
     * @param {Object} command - 실행할 명령어 객체
     */
    execute(editor, command) {
        if (!editor || !command) return;

        // 1. 특수 액션 처리 (예: 기한 설정)
        if (command.cmd === 'deadline') {
            this._executeDeadline();
            return;
        }

        // 2. 표준 에디터 명령 실행
        if (command.payload) {
            editor.exec(command.cmd, command.payload);
        } else {
            editor.exec(command.cmd);
        }
    },

    /**
     * 기한 설정 액션 (커스텀 UI 트리거)
     */
    _executeDeadline() {
        const dueDateInput = document.getElementById('memo-due-date') || document.getElementById('memoDueDate');
        if (dueDateInput) {
            dueDateInput.focus();
            if (typeof dueDateInput.showPicker === 'function') {
                try { dueDateInput.showPicker(); } catch(e) { dueDateInput.click(); }
            } else {
                dueDateInput.click();
            }
        }
    }
};
