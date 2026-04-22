/**
 * UI 렌더링 및 이벤트를 관리하는 오케스트레이터 (Orchestrator)
 * v6.0: LayoutManager 및 SidebarManager로 모듈 분기 완료
 */
import { VisualLinker } from './components/VisualLinker.js';
import { ThemeManager } from './components/ThemeManager.js';
import { I18nManager } from './utils/I18nManager.js';
import { LayoutManager } from './components/LayoutManager.js';
import { SidebarManager } from './components/SidebarManager.js';
import { debounce } from './utils.js';

export const UI = {
    // --- 🔹 Sidebar & Category 모듈 위임 ---
    initSidebarToggle: () => SidebarManager.initSidebarToggle(),
    updateSidebar: (...args) => SidebarManager.updateSidebar(...args),
    applyCategoryVisibility: (enabled) => SidebarManager.applyCategoryVisibility(enabled),

    // --- 🔹 Layout & Grid 모듈 위임 ---
    renderMemos: (...args) => LayoutManager.renderMemos(...args),
    initResizeHandler: (handlers) => LayoutManager.initResizeHandler(handlers),
    showLoading: (show) => LayoutManager.showLoading(show),
    setHasMore: (hasMore) => LayoutManager.setHasMore(hasMore),
    isSentinelVisible: () => LayoutManager.isSentinelVisible(),

    // --- 🔹 공통 초기화 및 유틸리티 ---
    async initSettings() {
        return await ThemeManager.initSettings();
    },

    initInfiniteScroll(onLoadMore) {
        const sentinel = document.getElementById('scrollSentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) onLoadMore();
        }, { threshold: 0.1 });

        observer.observe(sentinel);
    },

    debounce,

    openMemoModal(id) {
        import('./components/ModalManager.js').then(m => m.ModalManager.openMemoModal(id));
    },

    async promptPassword(label) {
        const { ModalManager } = await import('./components/ModalManager.js');
        return await ModalManager.promptPassword(label);
    }
};
