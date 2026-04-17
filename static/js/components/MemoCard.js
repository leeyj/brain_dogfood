/**
 * 메모 카드 컴포넌트
 */
import { escapeHTML, parseInternalLinks, fixImagePaths, stripMetadata } from '../utils.js';
import { renderAttachmentBox } from './AttachmentBox.js';
import { Constants } from '../utils/Constants.js';
import { I18nManager } from '../utils/I18nManager.js';

/**
 * 단일 메모 카드의 HTML 생성을 전담합니다.
 */
export function createMemoCardHtml(memo, isDone) {
    const cardClass = `memo-card ${isDone ? 'done' : ''} ${memo.is_encrypted ? 'encrypted' : ''} glass-panel`;
    const borderStyle = memo.color ? `style="border-left: 5px solid ${memo.color}"` : '';

    let summaryHtml = '';
    if (memo.summary) {
        // 암호화된 메모가 잠긴 상태라면 AI 요약도 숨김 (정보 유출 방지)
        const isLocked = memo.is_encrypted && (!memo.content || memo.content.includes('encrypted-block') || typeof memo.is_encrypted === 'number');
        // 참고: app.js에서 해독 성공 시 memo.is_encrypted를 false로 바꿨으므로, is_encrypted가 true면 잠긴 상태임
        if (!memo.is_encrypted) {
            summaryHtml = `<div class="memo-summary"><strong>${I18nManager.t('label_ai_summary')}:</strong> ${escapeHTML(memo.summary)}</div>`;
        }
    }

    const titleHtml = memo.title ? `<h3 class="memo-title">${escapeHTML(memo.title)}</h3>` : '';
    
    let htmlContent = '';
    if (!isDone) {
        if (memo.is_encrypted) {
            htmlContent = `
                <div class="encrypted-block" style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:1rem;">🔒</span>
                    <span style="font-size:0.85rem; color:var(--muted); flex:1;">${I18nManager.t('msg_encrypted_locked')}</span>
                    <button class="action-btn unlock-btn" data-id="${memo.id}" style="font-size:0.75rem; padding:4px 10px; background:var(--ai-accent);">${I18nManager.t('btn_unlock')}</button>
                </div>
            `;
        } else {
            // 렌더링 시에는 태그와 그룹명을 시각적으로 가립니다 (원본 보존 정책)
            const displayContent = stripMetadata(memo.content || '');

            // marked로 파싱한 후 DOMPurify로 살균하여 XSS 방지
            htmlContent = DOMPurify.sanitize(marked.parse(displayContent));
            htmlContent = parseInternalLinks(htmlContent);
            htmlContent = fixImagePaths(htmlContent);
        }
    }
    const contentHtml = `<div class="memo-content">${htmlContent}</div>`;
    
    let metaHtml = '<div class="memo-meta">';
    if (!isDone && memo.group_name && memo.group_name !== Constants.GROUPS.DEFAULT) {
        const groupName = (Object.values(Constants.GROUPS).includes(memo.group_name)) 
            ? I18nManager.t(`groups.${memo.group_name}`) 
            : memo.group_name;
        metaHtml += `<span class="group-badge">📁 ${escapeHTML(groupName)}</span>`;
    }
    if (memo.tags && memo.tags.length > 0) {
        memo.tags.forEach(t => {
            // 암호화된 메모가 잠긴 상태일 때 AI 태그만 선택적으로 숨김
            if (memo.is_encrypted && t.source === 'ai') return;
            
            const typeClass = t.source === 'ai' ? 'tag-ai' : 'tag-user';
            metaHtml += `<span class="tag-badge ${typeClass}">${t.source === 'ai' ? '🪄 ' : '#'}${escapeHTML(t.name)}</span>`;
        });
    }
    metaHtml += '</div>';

    let linksHtml = '';
    if (!isDone && memo.backlinks && memo.backlinks.length > 0) {
        linksHtml = `<div class="memo-backlinks">🔗 ${I18nManager.t('label_mentioned')}: ` + 
            memo.backlinks.map(l => `<span class="link-item" data-id="${l.id}">#${escapeHTML(l.title || l.id.toString())}</span>`).join(', ') + 
            '</div>';
    }

    // 암호화된 메모인 경우 해독 전까지 첨부파일 목록 숨김
    const attachmentsHtml = !memo.is_encrypted ? renderAttachmentBox(memo.attachments) : '';

    // 암호화된 메모가 잠긴 상태라면 하단 액션 버튼(수정, 삭제, AI 등)을 아예 보여주지 않음 (보안 및 UI 겹침 방지)
    const isLocked = memo.is_encrypted && (!htmlContent || htmlContent.includes('encrypted-block'));
    const actionsHtml = isLocked ? '' : `
        <div class="memo-actions">
            <button class="action-btn toggle-pin" draggable="false" data-id="${memo.id}" title="${I18nManager.t('title_pin')}">${memo.is_pinned ? '⭐' : '☆'}</button>
            <button class="action-btn toggle-status" draggable="false" data-id="${memo.id}" title="${isDone ? I18nManager.t('title_undo') : I18nManager.t('title_done')}">${isDone ? '↩️' : '✅'}</button>
            ${!isDone ? `<button class="action-btn ai-btn" draggable="false" data-id="${memo.id}" title="${I18nManager.t('title_ai')}">🪄</button>` : ''}
            <button class="action-btn edit-btn" draggable="false" data-id="${memo.id}" title="${I18nManager.t('title_edit')}">✏️</button>
            <button class="action-btn delete-btn" draggable="false" data-id="${memo.id}" title="${I18nManager.t('title_delete')}">🗑️</button>
        </div>
    `;
    const idBadge = `<div class="copy-id-btn" draggable="false" data-id="${memo.id}" title="${I18nManager.t('tooltip_id_copy').replace('[[#ID]]', `[[#${memo.id}]]`)}" style="position:absolute; top:10px; right:12px; color:rgba(255,255,255,0.15); font-size:10px; font-weight:900; cursor:pointer; z-index:10;">#${memo.id}</div>`;

    return {
        className: cardClass,
        style: borderStyle,
        innerHtml: idBadge + summaryHtml + titleHtml + metaHtml + contentHtml + linksHtml + attachmentsHtml + actionsHtml
    };
}
