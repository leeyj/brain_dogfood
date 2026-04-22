/**
 * 메모 카드 컴포넌트 (Atomic Design 기반)
 * v6.7: 리스트 모드 레이아웃 겹침 버그 수정 및 액션 버튼 정렬 최적화
 */
import { escapeHTML, parseInternalLinks, fixImagePaths, stripMetadata } from '../utils.js';
import { renderAttachmentBox } from './AttachmentBox.js';
import { Constants } from '../utils/Constants.js';
import { I18nManager } from '../utils/I18nManager.js';

// --- 🧩 조각화된 렌더러 (Internal Atomic Parts) ---

function createCardBase(memo, isDone, mode) {
    const card = document.createElement('div');
    card.className = `memo-card ${isDone ? 'done' : ''} ${memo.is_encrypted ? 'encrypted' : ''} glass-panel mode-${mode}`;
    card.dataset.id = memo.id;
    card.style.cursor = 'pointer';
    if (memo.color) card.style.borderLeft = `5px solid ${memo.color}`;
    
    if (mode === 'compact') {
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.padding = '6px 12px';
        card.style.gap = '12px';
        card.style.minHeight = 'auto';
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
    }
    return card;
}

function createIdBadge(memo, mode) {
    const el = document.createElement('div');
    el.className = 'copy-id-btn';
    el.title = I18nManager.t('tooltip_id_copy').replace('[[#ID]]', `[[#${memo.id}]]`);
    el.innerText = `#${memo.id}`;
    el.dataset.id = memo.id;
    el.draggable = false;

    // stable 버전과 동일하게: 기본적으로 흐릿하게, 우측 상단에 절대 위치
    el.style.position = 'absolute';
    el.style.top = '10px';
    el.style.right = '12px';
    el.style.color = 'rgba(255,255,255,0.15)';
    el.style.fontSize = '10px';
    el.style.fontWeight = '900';
    el.style.cursor = 'pointer';
    el.style.zIndex = '10';

    if (mode === 'compact') {
        el.style.position = 'static';
        el.style.fontSize = '0.7rem';
        el.style.padding = '2px 6px';
        el.style.opacity = '0.5';
        el.style.flexShrink = '0';
        el.style.color = 'var(--muted)';
    }
    return el;
}

function createTitle(memo, mode) {
    if (!memo.title && mode !== 'compact') return null;
    const el = document.createElement('h3');
    el.className = 'memo-title';
    el.innerText = memo.title || I18nManager.t('label_untitled');
    
    if (mode === 'compact') {
        el.style.margin = '0';
        el.style.flex = '1';
        el.style.fontSize = '0.95rem';
        el.style.whiteSpace = 'nowrap';
        el.style.overflow = 'hidden';
        el.style.textOverflow = 'ellipsis';
    }
    return el;
}

function createDate(memo) {
    const el = document.createElement('div');
    el.className = 'memo-date';
    const dateStr = new Date(memo.updated_at).toLocaleDateString('ko-KR', {
        month: 'numeric', day: 'numeric'
    });
    el.innerText = dateStr;
    el.style.fontSize = '0.75rem';
    el.style.color = 'var(--muted)';
    el.style.whiteSpace = 'nowrap';
    el.style.flexShrink = '0';
    return el;
}

function createMeta(memo, isDone, mode) {
    const container = document.createElement('div');
    container.className = 'memo-meta';
    container.style.display = 'flex';
    container.style.gap = '5px';
    container.style.flexShrink = '0';

    if (mode === 'compact') {
        container.style.maxWidth = '30%';
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

    return container.children.length > 0 ? container : null;
}

function createSummary(memo) {
    if (!memo.summary || memo.is_encrypted) return null;
    const el = document.createElement('div');
    el.className = 'memo-summary';
    el.innerHTML = `<strong>${I18nManager.t('label_ai_summary')}:</strong> ${escapeHTML(memo.summary)}`;
    return el;
}

function createContent(memo, isDone) {
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

function createActions(memo, isDone, handlers, mode) {
    const isLocked = memo.is_encrypted && (!memo.content || memo.content.includes('encrypted-block'));
    if (isLocked) return null;

    const container = document.createElement('div');
    container.className = 'memo-actions';

    if (mode === 'compact') {
        container.style.position = 'static';
        container.style.display = 'flex';
        container.style.gap = '4px';
        container.style.opacity = '0.4';
        container.style.transition = 'opacity 0.2s';
        container.style.flexShrink = '0';
        // 마우스 오버 시에만 진하게 표시
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
            btn.style.width = '24px';
            btn.style.height = '24px';
            btn.style.fontSize = '0.8rem';
            btn.style.padding = '0';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
        }
        btn.onclick = (e) => { e.stopPropagation(); if (b.handler) b.handler(memo.id); };
        container.appendChild(btn);
    });

    return container;
}

// --- 🚀 메인 렌더링 오케스트레이터 ---

export function renderMemoCard(memo, handlers, options = {}) {
    const {
        mode = 'full',
        showActions = true
    } = options;

    const isDone = memo.status === 'done';
    const card = createCardBase(memo, isDone, mode);

    if (mode === 'compact') {
        // --- 리스트 모드 (가로 배치 순서: 제목 - 태그 - 날짜 - ID - 액션) ---
        const title = createTitle(memo, mode);
        card.appendChild(title);

        const meta = createMeta(memo, isDone, mode);
        if (meta) card.appendChild(meta);

        const date = createDate(memo);
        card.appendChild(date);

        const idBadge = createIdBadge(memo, mode);
        card.appendChild(idBadge);
    } else {
        // --- 전체 모드 (그리드) ---
        const idBadge = createIdBadge(memo, mode);
        idBadge.style.position = 'absolute';
        idBadge.style.top = '10px';
        idBadge.style.right = '12px';
        card.appendChild(idBadge);

        const summary = createSummary(memo);
        if (summary) card.appendChild(summary);

        const title = createTitle(memo, mode);
        if (title) card.appendChild(title);

        const meta = createMeta(memo, isDone, mode);
        if (meta) card.appendChild(meta);

        const content = createContent(memo, isDone);
        if (content) card.appendChild(content);

        if (!memo.is_encrypted && memo.attachments && memo.attachments.length > 0) {
            const attachments = renderAttachmentBox(memo.attachments);
            if (attachments) card.appendChild(attachments);
        }
    }

    if (showActions) {
        const actions = createActions(memo, isDone, handlers, mode);
        if (actions) card.appendChild(actions);
    }

    bindCommonEvents(card, memo, handlers);
    return card;
}

function bindCommonEvents(card, memo, handlers) {
    // 💡 즉시 수정(e 키) 기능을 위한 호버 ID 추적
    card.onmouseenter = () => { window.hoveredMemoId = memo.id; };
    card.onmouseleave = () => { if (window.hoveredMemoId === memo.id) window.hoveredMemoId = null; };

    card.onclick = (e) => {
        if (e.target.closest('.action-btn, .file-chip, .internal-link, .link-item, .copy-id-btn')) return;

        // 💡 관계 포커스 모드 (Ctrl + Alt + Click)
        if (e.ctrlKey && e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            if (handlers.onToggleRelationFocus) handlers.onToggleRelationFocus(memo.id);
            return;
        }

        if (handlers.onOpenModal) handlers.onOpenModal(memo.id);
    };

    const unlockBtn = card.querySelector('.unlock-btn');
    if (unlockBtn) unlockBtn.onclick = (e) => { e.stopPropagation(); if (handlers.onUnlock) handlers.onUnlock(memo.id); };

    const idBtn = card.querySelector('.copy-id-btn');
    if (idBtn) {
        idBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(`[[#${memo.id}]]`);
            idBtn.style.color = 'var(--accent)';
            setTimeout(() => { idBtn.style.color = ''; }, 2000);
        };
    }
}
