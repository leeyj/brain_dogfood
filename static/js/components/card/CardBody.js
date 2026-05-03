/**
 * Memo Card Body Module
 */
import { escapeHTML, parseInternalLinks, fixImagePaths, stripMetadata } from '../../utils.js';
import { I18nManager } from '../../utils/I18nManager.js';

export const CardBody = {
    createSummary(memo) {
        if (!memo.summary || memo.is_encrypted) return null;
        const el = document.createElement('div');
        el.className = 'memo-summary';
        el.innerHTML = `<strong>${I18nManager.t('label_ai_summary')}:</strong> ${escapeHTML(memo.summary)}`;
        return el;
    },

    createBacklinks(memo) {
        if (!memo.backlinks || memo.backlinks.length === 0) return null;
        
        const container = document.createElement('div');
        container.className = 'memo-backlinks';
        
        const label = document.createElement('span');
        label.style.marginRight = '8px';
        label.innerText = `${I18nManager.t('label_mentioned')}:`;
        container.appendChild(label);
        
        memo.backlinks.forEach(link => {
            const item = document.createElement('span');
            item.className = 'internal-link';
            item.dataset.id = link.source_id;
            item.innerText = `#${link.source_id}`;
            item.style.marginRight = '5px';
            container.appendChild(item);
        });
        
        return container;
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
    }
};
