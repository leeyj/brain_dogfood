/**
 * Memo Card Meta Module
 */
import { DeadlineManager } from '../../utils/DeadlineManager.js';
import { Constants } from '../../utils/Constants.js';

export const CardMeta = {
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
    }
};
