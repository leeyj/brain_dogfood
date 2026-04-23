/**
 * MemoCardParts: 메모 카드를 구성하는 개별 UI 요소 렌더러 모음
 */
import { escapeHTML, parseInternalLinks, fixImagePaths, stripMetadata } from '../utils.js';
import { I18nManager } from '../utils/I18nManager.js';
import { DeadlineManager } from '../utils/DeadlineManager.js';
import { Constants } from '../utils/Constants.js';

export const MemoCardParts = {
    createCardBase(memo, isDone, mode) {
        const card = document.createElement('div');
        card.className = `memo-card ${isDone ? 'done' : ''} ${memo.is_encrypted ? 'encrypted' : ''} glass-panel mode-${mode}`;
        card.dataset.id = memo.id;
        card.style.cursor = 'pointer';
        
        if (memo.color) card.style.borderLeft = `5px solid ${memo.color}`;
        
        // 기한 기반 테두리 스타일링 (DeadlineManager 활용)
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
    },

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
    },

    createDeadlineBadge(memo) {
        const info = DeadlineManager.getStatus(memo.due_date);
        if (!info) return null;
        
        const el = document.createElement('span');
        el.className = 'deadline-badge';
        Object.assign(el.style, {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '1px 8px',
            borderRadius: '5px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            height: '20px',
            background: `${info.color}15`,
            color: info.color,
            border: `1px solid ${info.color}30`
        });
        
        el.innerHTML = `<i class="fas fa-clock" style="font-size:0.6rem;"></i> ${info.text}`;
        return el;
    },

    createMeta(memo, isDone, mode) {
        const container = document.createElement('div');
        container.className = 'memo-meta';
        Object.assign(container.style, {
            display: 'flex', gap: '5px', flexShrink: '0', flexWrap: 'wrap'
        });

        if (mode === 'compact') {
            container.style.maxWidth = '35%';
            container.style.overflow = 'hidden';
        }

        if (!isDone && memo.group_name && memo.group_name !== Constants.GROUPS.DEFAULT) {
            const groupBadge = document.createElement('span');
            groupBadge.className = 'group-badge';
            groupBadge.innerText = memo.group_name;
            container.appendChild(groupBadge);
        }

        if (memo.tags && memo.tags.length > 0) {
            memo.tags.forEach(t => {
                const tag = document.createElement('span');
                tag.className = `tag-badge ${t.source === 'ai' ? 'tag-ai' : 'tag-user'}`;
                tag.innerText = t.name;
                container.appendChild(tag);
            });
        }

        const deadline = this.createDeadlineBadge(memo);
        if (deadline) container.appendChild(deadline);

        return container.children.length > 0 ? container : null;
    },

    createSummary(memo) {
        if (!memo.summary || memo.is_encrypted) return null;
        const el = document.createElement('div');
        el.className = 'memo-summary';
        el.innerHTML = `<strong>${I18nManager.t('label_ai_summary')}:</strong> ${escapeHTML(memo.summary)}`;
        return el;
    },

    createContent(memo, isDone) {
        const container = document.createElement('div');
        container.className = 'memo-content';
        if (isDone) return container;

        if (memo.is_encrypted) {
            container.innerHTML = `
                <div class="encrypted-block" style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:1rem;">🔒</span>
                    <span style="font-size:0.85rem; color:var(--muted); flex:1;">${I18nManager.t('msg_encrypted_locked')}</span>
                    <button class="action-btn unlock-btn" style="font-size:0.75rem; padding:4px 10px; background:var(--ai-accent);">${I18nManager.t('btn_unlock')}</button>
                </div>
            `;
        } else {
            const displayContent = stripMetadata(memo.content || '');
            let html = DOMPurify.sanitize(marked.parse(displayContent));
            html = parseInternalLinks(html);
            html = fixImagePaths(html);
            container.innerHTML = html;
        }
        return container;
    },

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

        const buttons = [
            { class: 'toggle-pin', icon: memo.is_pinned ? '⭐' : '☆', title: I18nManager.t('title_pin'), handler: handlers.onTogglePin },
            { class: 'toggle-status', icon: isDone ? '↩️' : '✅', title: isDone ? I18nManager.t('title_undo') : I18nManager.t('title_done'), handler: handlers.onToggleStatus },
            { class: 'edit-btn', icon: '✏️', title: I18nManager.t('title_edit'), handler: handlers.onEdit },
            { class: 'delete-btn', icon: '🗑️', title: I18nManager.t('title_delete'), handler: handlers.onDelete }
        ];

        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.className = `action-btn ${b.class}`;
            btn.innerText = b.icon;
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
