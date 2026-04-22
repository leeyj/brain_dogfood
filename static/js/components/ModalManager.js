/**
 * 모달 창(메모 상세, 파일 라이브러리 등) 생성을 관리하는 모듈
 */
import { API } from '../api.js';
import { escapeHTML } from '../utils.js';
import { renderAttachmentBox } from './AttachmentBox.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';

export const ModalManager = {
    // 타이밍 이슈 방지를 위해 lazy getter 패턴 적용
    getDOM() {
        return {
            modal: document.getElementById('memoModal'),
            modalContent: document.getElementById('modalContent'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            explorerModal: document.getElementById('explorerModal'),
            explorerContent: document.getElementById('explorerContent'),
            passwordPromptModal: document.getElementById('passwordPromptModal'),
            passwordPromptInput: document.getElementById('passwordPromptInput'),
            passwordPromptTitle: document.getElementById('passwordPromptTitle'),
            passwordPromptLabel: document.getElementById('passwordPromptLabel'),
            confirmPasswordBtn: document.getElementById('confirmPasswordPromptBtn'),
            cancelPasswordBtn: document.getElementById('cancelPasswordPromptBtn'),
            closePasswordBtn: document.getElementById('closePasswordPromptBtn')
        };
    },

    /**
     * 전체 첨부파일 라이브러리(Asset Library) 모달 열기
     */
    async openAssetLibrary(openMemoDetailsCallback) {
        const dom = this.getDOM();
        if (!dom.loadingOverlay) return;
        
        dom.loadingOverlay.style.display = 'flex';
        try {
            const assets = await API.fetchAssets();
            let html = `
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
            dom.modalContent.innerHTML = html;
            dom.modal.classList.add('active');

            // 닫기 버튼 이벤트
            dom.modalContent.querySelector('.close-modal-btn').onclick = () => {
                dom.modal.classList.remove('active');
            };
            
            dom.modalContent.querySelectorAll('.asset-card').forEach(card => {
                card.onclick = (e) => {
                    const url = card.dataset.url;
                    const filename = url.split('/').pop();
                    const originalName = card.querySelector('div').innerText;
                    const memoId = card.dataset.memoId;

                    if (e.altKey) {
                        e.stopPropagation();
                        window.downloadFile(filename, originalName);
                    } else if (memoId && memoId !== 'null') {
                        dom.modal.classList.remove('active');
                        openMemoDetailsCallback(memoId, window.allMemosCache);
                    } else {
                        window.downloadFile(filename, originalName);
                    }
                };
            });
        } catch (err) { alert(err.message); }
        finally { dom.loadingOverlay.style.display = 'none'; }
    },

    /**
     * 지식 탐색기(Knowledge Explorer) 모달 열기
     */
    openKnowledgeExplorer(memos, activeFilter, onFilterCallback) {
        const dom = this.getDOM();
        // 1. 그룹 및 태그 카운트 계산
        const groupAllKey = 'all';
        const groupCounts = { [groupAllKey]: memos.length };
        const tagCounts = {};
        const tagsSourceMap = new Map(); // 태그명 -> 소스 매핑

        memos.forEach(m => {
            const g = m.group_name || Constants.GROUPS.DEFAULT;
            groupCounts[g] = (groupCounts[g] || 0) + 1;
            
            if (m.tags) {
                m.tags.forEach(t => {
                    tagCounts[t.name] = (tagCounts[t.name] || 0) + 1;
                    const current = tagsSourceMap.get(t.name);
                    if (!current || t.source === 'user') tagsSourceMap.set(t.name, t.source);
                });
            }
        });

        const sortedGroups = Object.keys(groupCounts)
            .filter(g => g !== groupAllKey)
            .sort((a,b) => a === Constants.GROUPS.DEFAULT ? -1 : b === Constants.GROUPS.DEFAULT ? 1 : a.localeCompare(b));
            
        const sortedTags = Object.keys(tagCounts).sort().map(tn => ({
            name: tn,
            source: tagsSourceMap.get(tn),
            count: tagCounts[tn]
        }));

        let html = `
            <div class="explorer-section">
                <h3 style="margin-bottom:15px; color:var(--accent);">${I18nManager.t('label_group_explorer')}</h3>
                <div class="explorer-grid">
                    <div class="explorer-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
                        💡 ${I18nManager.t('nav_all')} <span class="chip-count">${groupCounts[groupAllKey]}</span>
                    </div>
                    ${sortedGroups.map(g => `
                        <div class="explorer-chip ${activeFilter === g ? 'active' : ''}" data-filter="${escapeHTML(g)}">
                            📁 ${escapeHTML(g)} <span class="chip-count">${groupCounts[g]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="explorer-section" style="margin-top:30px;">
                <h3 style="margin-bottom:15px; color:var(--ai-accent);">${I18nManager.t('label_tag_explorer')}</h3>
                <div class="explorer-grid">
                    ${sortedTags.map(t => `
                        <div class="explorer-chip tag-chip ${activeFilter === `tag:${t.source}:${t.name}` ? 'active' : ''}" 
                             data-filter="tag:${t.source}:${escapeHTML(t.name)}">
                            ${t.source === 'ai' ? '🪄' : '🏷️'} ${escapeHTML(t.name)} <span class="chip-count">${t.count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        dom.explorerContent.innerHTML = html;
        dom.explorerModal.classList.add('active');

        // 이벤트 바인딩
        const closeBtn = dom.explorerModal.querySelector('.close-explorer-btn');
        closeBtn.onclick = () => dom.explorerModal.classList.remove('active');

        dom.explorerContent.querySelectorAll('.explorer-chip').forEach(chip => {
            chip.onclick = () => {
                const filter = chip.dataset.filter;
                onFilterCallback(filter);
                dom.explorerModal.classList.remove('active');
            };
        });
    },

    /**
     * 개별 메모 상세 모달 열기
     */
    async openMemoModal(id) {
        const dom = this.getDOM();
        
        let memo = null;
        try {
            const { API } = await import('../api.js');
            memo = await API.fetchMemo(id);
        } catch(e) {
            console.error('[Modal] failed to load memo:', e);
            return;
        }
        
        if (!memo) return;
        
        import('../utils.js').then(({ parseInternalLinks, fixImagePaths, stripMetadata }) => {
            // 렌더링 시에는 태그와 그룹명을 시각적으로 가립니다 (원본 보존 정책)
            const displayContent = stripMetadata(memo.content || '');
            let html = DOMPurify.sanitize(marked.parse(displayContent));

            html = parseInternalLinks(html);
            html = fixImagePaths(html);
            
            const lastUpdatedTime = new Date(memo.updated_at).toLocaleString();

            dom.modalContent.innerHTML = `
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
            const closeBtn = dom.modalContent.querySelector('.close-modal-btn');
            if (closeBtn) {
                closeBtn.onclick = () => dom.modal.classList.remove('active');
            }
            
            const attachmentsHtml = renderAttachmentBox(memo.attachments);
            if (attachmentsHtml) {
                const footer = document.createElement('div');
                footer.style.cssText = 'margin-top:30px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);';
                footer.innerHTML = attachmentsHtml;
                dom.modalContent.appendChild(footer);
            }

            dom.modal.classList.add('active');
            dom.modalContent.querySelectorAll('.internal-link').forEach(l => {
                l.onclick = () => this.openMemoModal(l.dataset.id, memos);
            });
        });
    },

    /**
     * 커스텀 패스워드 입력 모달 (브라우저 prompt 대체)
     * @param {string} label 안내 문구
     * @returns {Promise<string|null>} 입력된 패스워드 또는 취소 시 null
     */
    promptPassword(label) {
        const dom = this.getDOM();
        if (!dom.passwordPromptModal) return Promise.resolve(null);

        return new Promise((resolve) => {
            dom.passwordPromptLabel.textContent = label || I18nManager.t('prompt_password');
            dom.passwordPromptInput.value = '';
            dom.passwordPromptModal.classList.add('active');
            dom.passwordPromptInput.focus();

            const cleanup = () => {
                dom.passwordPromptModal.classList.remove('active');
                dom.confirmPasswordBtn.onclick = null;
                dom.cancelPasswordBtn.onclick = null;
                dom.closePasswordBtn.onclick = null;
                dom.passwordPromptInput.onkeydown = null;
            };

            const handleConfirm = () => {
                const val = dom.passwordPromptInput.value;
                cleanup();
                resolve(val || null);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            dom.confirmPasswordBtn.onclick = handleConfirm;
            dom.cancelPasswordBtn.onclick = handleCancel;
            dom.closePasswordBtn.onclick = handleCancel;
            
            dom.passwordPromptInput.onkeydown = (e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') handleCancel();
            };
        });
    }
};
