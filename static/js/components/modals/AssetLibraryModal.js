/**
 * 첨부파일 라이브러리(Asset Library) 모달 컴포넌트
 */
import { API } from '../../api.js';
import { escapeHTML, downloadFile } from '../../utils.js';
import { I18nManager } from '../../utils/I18nManager.js';
import { AppService } from '../../AppService.js';

export const AssetLibraryModal = {
    async render(container, modalElement, loadingOverlay, openMemoDetailsCallback) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        
        try {
            const assets = await API.fetchAssets();
            const html = `
                <div style="padding:20px; position:relative;">
                    <button class="close-modal-btn">×</button>
                    <h2 style="margin-bottom:20px;">${I18nManager.t('label_asset_management')}</h2>
                    <p style="font-size:0.8rem; color:var(--muted); margin-bottom:20px;">${I18nManager.t('label_asset_hint')}</p>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:15px;">
                        ${assets.length > 0 ? assets.map(a => `
                            <div class="asset-card" data-memo-id="${a.memo_id}" data-url="/api/download/${a.filename}" style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; cursor:pointer;">
                                ${['png','jpg','jpeg','gif','webp','svg'].includes(a.file_type?.toLowerCase()) 
                                    ? `<img src="/api/download/${a.filename}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; margin-bottom:8px;">`
                                    : `<div style="width:100%; height:120px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:4px; margin-bottom:8px; font-size:2rem;">📎</div>`
                                }
                                <div style="font-size:0.8rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(a.original_name)}</div>
                                <div style="font-size:0.7rem; color:var(--muted);">${a.memo_title ? `${I18nManager.t('label_memo_ref')}${escapeHTML(a.memo_title)}` : I18nManager.t('label_no_memo_ref')}</div>
                            </div>
                        `).join('') : `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted);">${I18nManager.t('label_no_assets')}</div>`}
                    </div>
                </div>
            `;
            container.innerHTML = html;
            modalElement.classList.add('active');

            // 이벤트 바인딩
            container.querySelector('.close-modal-btn').onclick = () => {
                modalElement.classList.remove('active');
            };
            
            container.querySelectorAll('.asset-card').forEach(card => {
                card.onclick = (e) => {
                    const url = card.dataset.url;
                    const filename = url.split('/').pop();
                    const originalName = card.querySelector('div').innerText;
                    const memoId = card.dataset.memoId;

                    if (e.altKey) {
                        e.stopPropagation();
                        downloadFile(filename, originalName);
                    } else if (memoId && memoId !== 'null') {
                        modalElement.classList.remove('active');
                        openMemoDetailsCallback(memoId, AppService.state.allMemos);
                    } else {
                        downloadFile(filename, originalName);
                    }
                };
            });
        } catch (err) { alert(err.message); }
        finally { if (loadingOverlay) loadingOverlay.style.display = 'none'; }
    }
};
