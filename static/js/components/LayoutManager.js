/**
 * 레이아웃 통합 관리 매니저 (Layout Orchestrator)
 * v7.0: 레이아웃을 슬롯화하여 Masonry, List, Kanban 등을 동적으로 교체 가능하도록 개선
 */
import { AppService } from '../AppService.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';
import { debounce } from '../utils.js';

// 레이아웃 엔진 임포트
import { MasonryLayout } from './layouts/MasonryLayout.js';
import { ListLayout } from './layouts/ListLayout.js';

const S = Constants.SELECTORS;

export const LayoutManager = {
    currentLayoutName: 'masonry', // 기본값
    layouts: {
        'masonry': MasonryLayout,
        'list': ListLayout
    },

    getDOM() {
        return {
            memoGrid: document.querySelector(S.MEMO_GRID),
            loadingOverlay: document.querySelector(S.LOADING_OVERLAY),
            scrollSentinel: document.querySelector(S.SCROLL_SENTINEL)
        };
    },

    /**
     * 레이아웃 변경
     * @param {string} name 레이아웃 이름 ('masonry', 'list' 등)
     */
    switchLayout(name) {
        if (!this.layouts[name]) return;
        this.currentLayoutName = name;
        
        // 화면 즉시 리프레시
        const state = AppService.state;
        if (state.allMemos && state.allMemos.length > 0) {
            this.renderMemos(state.allMemos, {}, state.eventHandlers || {});
        }
    },

    /**
     * 브라우저 리사이즈 핸들러
     */
    initResizeHandler() {
        const handleResize = debounce(() => {
            // Masonry 레이아웃일 때만 리사이즈 시 재배치 필요
            if (this.currentLayoutName === 'masonry') {
                const state = AppService.state;
                if (state.allMemos && state.allMemos.length > 0) {
                    this.renderMemos(state.allMemos, {}, state.eventHandlers || {}, false, true);
                }
            }
        }, 250);

        window.addEventListener('resize', handleResize);
    },

    /**
     * 메인 렌더링 함수 (현재 설정된 레이아웃 엔진에 위임)
     */
    renderMemos(memos, filters = {}, handlers, isAppend = false, isResize = false) {
        const DOM = this.getDOM();
        if (!DOM.memoGrid) return;

        // 전체 상태 저장 (Append가 아닐 때)
        if (!isResize && !isAppend) {
            AppService.state.allMemos = memos;
            AppService.state.eventHandlers = handlers; // 핸들러 저장 (레이아웃 전환 시 사용)
        }

        // 현재 레이아웃 엔진 호출
        const layoutEngine = this.layouts[this.currentLayoutName] || MasonryLayout;
        layoutEngine.render(DOM.memoGrid, memos, handlers, { isAppend, isResize });

        // 스크롤 센티널 상태 업데이트
        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.innerText = I18nManager.t('msg_loading');
        }
    },

    showLoading(show) {
        const DOM = this.getDOM();
        if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = show ? 'flex' : 'none';
        if (DOM.scrollSentinel) DOM.scrollSentinel.style.display = show ? 'none' : 'flex';
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
        return (rect.top >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight));
    }
};
