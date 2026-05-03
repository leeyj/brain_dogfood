/**
 * Memo Card Header Module
 */
import { I18nManager } from '../../utils/I18nManager.js';

export const CardHeader = {
    createIdBadge(memo, mode) {
        const el = document.createElement('div');
        el.className = 'copy-id-btn';
        el.title = I18nManager.t('tooltip_id_copy').replace('[[#ID]]', `[[#${memo.id}]]`);
        el.innerText = `#${memo.id}`;
        el.dataset.id = memo.id;
        
        if (mode === 'compact') {
            Object.assign(el.style, {
                position: 'static',
                fontSize: '0.7rem',
                padding: '2px 6px',
                opacity: '0.5',
                flexShrink: '0',
                color: 'var(--muted)'
            });
        } else {
            Object.assign(el.style, {
                position: 'absolute',
                top: '10px',
                right: '12px',
                color: 'var(--muted)',
                opacity: '0.4',
                fontSize: '10px',
                fontWeight: '900',
                cursor: 'pointer',
                zIndex: '10'
            });
        }
        return el;
    },

    createTitle(memo, mode) {
        if (!memo.title && mode !== 'compact') return null;
        const el = document.createElement('h3');
        el.className = 'memo-title';
        el.innerText = memo.title || I18nManager.t('label_untitled');
        
        if (mode === 'compact') {
            Object.assign(el.style, {
                margin: '0',
                flex: '1',
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });
        }
        return el;
    },

    createDate(memo) {
        const el = document.createElement('div');
        el.className = 'memo-date';
        const dateStr = new Date(memo.updated_at).toLocaleDateString('ko-KR', {
            month: 'numeric', day: 'numeric'
        });
        el.innerText = dateStr;
        Object.assign(el.style, {
            fontSize: '0.75rem',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
            flexShrink: '0'
        });
        return el;
    }
};
