/**
 * 작성기 임시저장(Draft) 관리 모듈
 */
import { I18nManager } from '../../utils/I18nManager.js';
import { Constants } from '../../utils/Constants.js';

export const ComposerDraft = {
    /**
     * 현재 에디터 내용을 localStorage에 자동 저장
     */
    save(id, title, group, tags, content) {
        // 내용이 비어있으면 저장하지 않음
        if (!title && !content) return;

        const draft = {
            title,
            content,
            group: group || Constants.GROUPS.DEFAULT,
            tags: tags || '',
            editingId: id || '',
            timestamp: Date.now()
        };
        localStorage.setItem('memo_draft', JSON.stringify(draft));
    },

    /**
     * 임시저장된 내용이 있는지 확인하고 복원 처리
     */
    checkRestore(onRestore) {
        const raw = localStorage.getItem('memo_draft');
        if (!raw) return;

        try {
            const draft = JSON.parse(raw);

            // 24시간 이상 된 임시저장은 자동 삭제
            if (Date.now() - draft.timestamp > 86400000) {
                this.clear();
                return;
            }

            // 내용이 실제로 있는 경우에만 복원 확인
            if (!draft.title && !draft.content) {
                this.clear();
                return;
            }

            const titlePreview = draft.title || I18nManager.t('label_untitled');
            const confirmMsg = I18nManager.t('msg_draft_restore_confirm')
                .replace('{title}', titlePreview);
                
            if (confirm(confirmMsg)) {
                onRestore(draft);
            } else {
                this.clear();
            }
        } catch (e) {
            console.warn('[Draft] Failed to parse draft, deleting:', e);
            this.clear();
        }
    },

    /**
     * 임시저장 데이터 삭제
     */
    clear() {
        localStorage.removeItem('memo_draft');
    }
};
