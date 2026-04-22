/**
 * Masonry 레이아웃 및 그리드 렌더링을 전담하는 매니저
 */
import { AppService } from '../AppService.js';
import { createMemoCardHtml } from './MemoCard.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';
import { ModalManager } from './ModalManager.js';
import { debounce } from '../utils.js';

const S = Constants.SELECTORS;

export const LayoutManager = {
    /**
     * DOM 요소 캐시
     */
    getDOM() {
        return {
            memoGrid: document.querySelector(S.MEMO_GRID),
            loadingOverlay: document.querySelector(S.LOADING_OVERLAY),
            scrollSentinel: document.querySelector(S.SCROLL_SENTINEL)
        };
    },

    debounce,

    /**
     * 브라우저 리사이즈 핸들러 초기화
     */
    initResizeHandler(onUpdate) {
        const handleResize = this.debounce(() => {
            if (window.allMemosCache) {
                console.log("[LayoutManager] Browser resized. Rearranging layout...");
                // 리사이즈 시에도 전역 핸들러를 전달하여 이벤트 기능 유지
                this.renderMemos(window.allMemosCache, {}, window.memoEventHandlers || {}, false, true);
            }
        }, 250);

        window.addEventListener('resize', handleResize);
    },

    /**
     * 메모 목록 메인 렌더링 (250px 수직 컬럼 Masonry 방식)
     */
    renderMemos(memos, filters = {}, handlers, isAppend = false, isResize = false) {
        const DOM = this.getDOM();
        if (!DOM.memoGrid) return;

        // --- 💡 캐시 갱신 (리사이즈 및 상태 유지용) ---
        if (!isResize) {
            if (!isAppend) window.allMemosCache = memos;
            else window.allMemosCache = [...(window.allMemosCache || []), ...memos];
        }

        // 1. 초기 렌더링(isAppend=false)일 때 컬럼 레이아웃 초기화
        if (!isAppend) {
            DOM.memoGrid.innerHTML = '';
            
            const gridWidth = DOM.memoGrid.offsetWidth || window.innerWidth;
            const columnCount = Math.max(1, Math.floor(gridWidth / 262)); // 250px + 12px(gap)
            
            for (let i = 0; i < columnCount; i++) {
                const col = document.createElement('div');
                col.className = 'masonry-column';
                col.dataset.index = i;
                DOM.memoGrid.appendChild(col);
            }
        }

        const columns = Array.from(DOM.memoGrid.querySelectorAll(S.MASONRY_COLUMN));
        if (columns.length === 0) return;

        memos.forEach(memo => {
            const unlocked = AppService.state.unlockedMemos.get(String(memo.id));
            if (unlocked) {
                memo.content = unlocked.content;
                memo.tempPassword = unlocked.tempPassword;
                memo.is_encrypted = false;
                memo.was_encrypted = true;
            }

            const { className, style, innerHtml } = createMemoCardHtml(memo, memo.status === 'done');
            const card = document.createElement('div');
            
            if (isAppend) {
                card.className = `${className} memo-new`;
            } else if (isResize) {
                card.className = `${className} memo-refresh`;
            } else {
                card.className = className;
            }
            
            card.dataset.id = memo.id;
            if (style) card.setAttribute('style', style);
            card.innerHTML = innerHtml;
            card.style.cursor = 'pointer';
            card.setAttribute('draggable', true);
            card.title = I18nManager.t('tooltip_edit_hint');
            
            card.ondragstart = (e) => {
                if (e.target.closest('.action-btn, .copy-id-btn')) {
                    e.preventDefault();
                    return;
                }
                e.dataTransfer.setData('memo-id', memo.id);
                card.style.opacity = '0.5';
            };
            card.ondragend = () => card.style.opacity = '1';

            card.onclick = (e) => {
                if (e.target.closest('.action-btn')) return;
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    ModalManager.openMemoModal(memo.id);
                }
            };

            card.onmouseenter = () => { window.hoveredMemoId = memo.id; };
            card.onmouseleave = () => { if (window.hoveredMemoId === memo.id) window.hoveredMemoId = null; };

            const targetCol = columns.reduce((prev, curr) => 
                (prev.children.length <= curr.children.length) ? prev : curr
            );
            targetCol.appendChild(card);
            
            if (isAppend) {
                card.onanimationend = () => card.classList.remove('memo-new');
            }
            if (isResize) {
                card.onanimationend = () => card.classList.remove('memo-refresh');
            }

            if (window.UI && window.UI.bindCardEventsToElement) {
                window.UI.bindCardEventsToElement(card, handlers);
            }
        });

        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.innerText = I18nManager.t('msg_loading');
        }
    },

    showLoading(show) {
        const DOM = this.getDOM();
        if (DOM.loadingOverlay) {
            DOM.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.style.display = show ? 'none' : 'flex';
        }
    },
    
    setHasMore(hasMore) {
        const DOM = this.getDOM();
        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.style.visibility = hasMore ? 'visible' : 'hidden';
            DOM.scrollSentinel.innerText = hasMore ? I18nManager.t('msg_loading') : I18nManager.t('msg_last_memo');
        }
    },

    isSentinelVisible() {
        const DOM = this.getDOM();
        if (!DOM.scrollSentinel) return false;
        const rect = DOM.scrollSentinel.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.top <= (window.innerHeight || document.documentElement.clientHeight)
        );
    }
};
