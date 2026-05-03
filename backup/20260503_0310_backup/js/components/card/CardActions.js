/**
 * Memo Card Actions Module
 */
import { I18nManager } from '../../utils/I18nManager.js';

export const CardActions = {
    createActions(memo, isDone, handlers, mode) {
        const isLocked = memo.is_encrypted && (!memo.content || memo.content.includes('encrypted-block'));
        if (isLocked) return null;

        const container = document.createElement('div');
        container.className = 'memo-actions';

        if (mode === 'compact') {
            Object.assign(container.style, {
                position: 'static', display: 'flex', gap: '4px', opacity: '0.4', transition: 'opacity 0.2s', flexShrink: '0'
            });
            container.onmouseenter = () => container.style.opacity = '1';
            container.onmouseleave = () => container.style.opacity = '0.4';
        }

        const isDeleted = memo.status === 'deleted';
        let buttons = [];

        if (isDeleted) {
            // 휴지통 상태: 복원 및 완전 삭제만 표시
            buttons = [
                { class: 'restore-btn', icon: '⏪', title: I18nManager.t('title_restore') || '복원', handler: handlers.onRestore },
                { class: 'delete-btn permanent', icon: '❌', title: I18nManager.t('title_permanent_delete') || '완전 삭제', handler: handlers.onDelete }
            ];
        } else {
            // 일반 상태
            buttons = [
                { class: 'toggle-pin', icon: memo.is_pinned ? '⭐' : '☆', title: I18nManager.t('title_pin'), handler: handlers.onTogglePin },
                { class: 'toggle-status', icon: isDone ? '↩️' : '✅', title: isDone ? I18nManager.t('title_undo') : I18nManager.t('title_done'), handler: handlers.onToggleStatus },
                { class: 'edit-btn', icon: '✏️', title: I18nManager.t('title_edit'), handler: handlers.onEdit },
                { class: 'delete-btn', icon: '🗑️', title: I18nManager.t('title_delete'), handler: handlers.onDelete }
            ];
        }

        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.className = `action-btn ${b.class}`;
            btn.innerText = b.icon;
            btn.title = b.title || '';
            
            if (mode === 'compact') {
                Object.assign(btn.style, {
                    width: '24px', height: '24px', fontSize: '0.8rem', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                });
            }
            btn.onclick = (e) => { e.stopPropagation(); if (b.handler) b.handler(memo.id); };
            container.appendChild(btn);
        });

        return container;
    }
};
