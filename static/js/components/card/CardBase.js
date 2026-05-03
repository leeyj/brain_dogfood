/**
 * Memo Card Base Module
 */
import { DeadlineManager } from '../../utils/DeadlineManager.js';

export const CardBase = {
    createCardBase(memo, isDone, mode) {
        const isDeleted = memo.status === 'deleted';
        const card = document.createElement('div');
        card.className = `memo-card ${isDone ? 'done' : ''} ${isDeleted ? 'deleted' : ''} ${memo.is_encrypted ? 'encrypted' : ''} glass-panel mode-${mode}`;
        card.dataset.id = memo.id;
        card.style.cursor = 'pointer';
        
        if (memo.color) card.style.borderLeft = `5px solid ${memo.color}`;
        
        // 기한 기반 테두리 스타일링
        DeadlineManager.applyBorderStyle(card, memo.due_date);
        
        if (mode === 'compact') {
            Object.assign(card.style, {
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                gap: '12px',
                minHeight: 'auto',
                position: 'relative',
                overflow: 'hidden'
            });
        }
        return card;
    }
};
