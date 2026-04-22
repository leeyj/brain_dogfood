/**
 * 메모 상세 보기 모달 컴포넌트
 */
import { API } from '../../api.js';
import { escapeHTML } from '../../utils.js';
import { I18nManager } from '../../utils/I18nManager.js';
import { AppService } from '../../AppService.js';
import { renderAttachmentBox } from '../AttachmentBox.js';

export const MemoDetailModal = {
    async render(container, modalElement, id, openMemoModalCallback) {
        let memo = null;
        try {
            memo = await API.fetchMemo(id);
            if (memo && memo.is_encrypted) {
                const unlocked = AppService.state.unlockedMemos.get(String(id));
                if (unlocked) {
                    memo.content = unlocked.content;
                    memo.is_encrypted = false;
                    memo.was_encrypted = true;
                }
            }
        } catch(e) {
            console.error('[MemoDetailModal] failed to load memo:', e);
            return;
        }
        
        if (!memo) return;
        
        const { parseInternalLinks, fixImagePaths, stripMetadata } = await import('../../utils.js');
        
        // 렌더링 시에는 태그와 그룹명을 시각적으로 가립니다 (원본 보존 정책)
        const displayContent = stripMetadata(memo.content || '');
        let html = DOMPurify.sanitize(marked.parse(displayContent));

        html = parseInternalLinks(html);
        html = fixImagePaths(html);
        
        const lastUpdatedTime = new Date(memo.updated_at).toLocaleString();

        container.innerHTML = `
            <button class="close-modal-btn">×</button>
            ${memo.title ? `<h2 style="margin-bottom:10px;">${escapeHTML(memo.title)}</h2>` : ''}
            
            ${memo.summary ? `
                <div class="ai-summary-box" style="margin: 15px 0 25px 0; padding: 15px; background: rgba(56, 189, 248, 0.1); border-left: 4px solid var(--accent); border-radius: 8px; position: relative; overflow: hidden;">
                    <div style="font-size: 0.7rem; color: var(--accent); font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; letter-spacing: 0.05em;">
                        <span>🪄 AI INSIGHT</span>
                    </div>
                    <div style="font-size: 0.95rem; line-height: 1.6; color: #e2e8f0; font-weight: 400;">${escapeHTML(memo.summary)}</div>
                </div>
            ` : '<hr style="margin:15px 0; opacity:0.1">'}

            <div class="memo-content">${html}</div>
            <div style="margin-top:20px; font-size:0.8rem; color:var(--muted)">${I18nManager.t('label_last_updated')}${lastUpdatedTime}</div>
        `;

        // 닫기 버튼 이벤트
        const closeBtn = container.querySelector('.close-modal-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modalElement.classList.remove('active');
        }
        
        const attachmentsBox = renderAttachmentBox(memo.attachments);
        if (attachmentsBox) {
            const footer = document.createElement('div');
            footer.style.cssText = 'margin-top:30px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);';
            footer.appendChild(attachmentsBox);
            container.appendChild(footer);
        }

        modalElement.classList.add('active');
        
        // 내부 링크 클릭 지원
        container.querySelectorAll('.internal-link').forEach(l => {
            l.onclick = () => openMemoModalCallback(l.dataset.id);
        });
    }
};
