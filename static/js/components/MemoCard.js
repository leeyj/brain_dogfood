/**
 * MemoCard 컴포넌트 (Orchestrator)
 * v7.0: 컴포넌트 모듈화 및 DeadlineManager 도입 (코드 슬림화)
 */
import { renderAttachmentBox } from './AttachmentBox.js';
import { MemoCardParts } from './MemoCardParts.js';

/**
 * 메인 렌더링 오케스트레이터
 */
export function renderMemoCard(memo, handlers, options = {}) {
    const {
        mode = 'full',
        showActions = true
    } = options;

    const isDone = memo.status === 'done';
    
    // 1. 베이스 카드 생성
    const card = MemoCardParts.createCardBase(memo, isDone, mode);

    if (mode === 'compact') {
        // --- 리스트 모드 ---
        card.appendChild(MemoCardParts.createTitle(memo, mode));
        
        const meta = MemoCardParts.createMeta(memo, isDone, mode);
        if (meta) card.appendChild(meta);

        card.appendChild(MemoCardParts.createDate(memo));
        card.appendChild(MemoCardParts.createIdBadge(memo, mode));
    } else {
        // --- 전체 모드 (그리드) ---
        card.appendChild(MemoCardParts.createIdBadge(memo, mode));

        const summary = MemoCardParts.createSummary(memo);
        if (summary) card.appendChild(summary);

        const title = MemoCardParts.createTitle(memo, mode);
        if (title) card.appendChild(title);

        const meta = MemoCardParts.createMeta(memo, isDone, mode);
        if (meta) card.appendChild(meta);

        const content = MemoCardParts.createContent(memo, isDone);
        if (content) card.appendChild(content);

        if (!memo.is_encrypted && memo.attachments && memo.attachments.length > 0) {
            const attachments = renderAttachmentBox(memo.attachments);
            if (attachments) card.appendChild(attachments);
        }

        const backlinks = MemoCardParts.createBacklinks(memo);
        if (backlinks) card.appendChild(backlinks);
    }

    if (showActions) {
        const actions = MemoCardParts.createActions(memo, isDone, handlers, mode);
        if (actions) card.appendChild(actions);
    }

    bindCommonEvents(card, memo, handlers);
    return card;
}

/**
 * 공통 이벤트 바인딩
 */
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

        if (memo.status === 'deleted') {
            if (confirm(I18nManager.t('msg_restore_prompt') || '삭제된 메모입니다. 복원하시겠습니까?')) {
                if (handlers.onRestore) handlers.onRestore(memo.id);
            }
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
