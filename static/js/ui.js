/**
 * @module UI
 * @description UI 렌더링 및 공통 인터랙션을 총괄하는 오케스트레이터 모듈.
 * 실제 구현은 LayoutManager, SidebarManager 등 세부 모듈에 위임하며, 무한 스크롤 및 설정 초기화와 같은 공통 UI 로직을 담당합니다.
 */
import { VisualLinker } from './components/VisualLinker.js';
import { ThemeManager } from './components/ThemeManager.js';
import { I18nManager } from './utils/I18nManager.js';
import { LayoutManager } from './components/LayoutManager.js';
import { SidebarManager } from './components/SidebarManager.js';
import { debounce } from './utils.js';

export const UI = {
    // --- 🔹 Sidebar & Category 모듈 위임 (SidebarManager) ---
    
    /** 사이드바 접기/펴기 버튼 및 이벤트 초기화 */
    initSidebarToggle: () => SidebarManager.initSidebarToggle(),
    
    /** 사이드바 메뉴 활성화 상태 및 카테고리 목록 갱신 */
    updateSidebar: (...args) => SidebarManager.updateSidebar(...args),
    
    /** 사이드바 카테고리 영역의 표시 여부 설정 */
    applyCategoryVisibility: (enabled) => SidebarManager.applyCategoryVisibility(enabled),

    // --- 🔹 Layout & Grid 모듈 위임 (LayoutManager) ---
    
    /** 전달받은 메모 목록을 현재 레이아웃(그리드/리스트)에 맞춰 렌더링 */
    renderMemos: (...args) => LayoutManager.renderMemos(...args),
    
    /** 브라우저 리사이즈 시 레이아웃 재계산 이벤트 등록 */
    initResizeHandler: (handlers) => LayoutManager.initResizeHandler(handlers),
    
    /** 전체 화면 로딩 스피너 표시 여부 제어 */
    showLoading: (show) => LayoutManager.showLoading(show),
    
    /** 하단 무한 스크롤 데이터 존재 여부 설정 */
    setHasMore: (hasMore) => LayoutManager.setHasMore(hasMore),
    
    /** 무한 스크롤 트리거(Sentinel)가 현재 화면에 노출되었는지 확인 */
    isSentinelVisible: () => LayoutManager.isSentinelVisible(),

    // --- 🔹 공통 초기화 및 유틸리티 ---

    /**
     * 서버에서 테마 및 다국어 설정을 가져와 앱의 초기 UI 상태를 설정합니다.
     * @async
     * @returns {Promise<Object>} 서버 설정 데이터
     */
    async initSettings() {
        return await ThemeManager.initSettings();
    },

    /**
     * IntersectionObserver를 사용하여 화면 하단 도달 시 데이터를 더 불러오는 무한 스크롤을 활성화합니다.
     * @param {Function} onLoadMore - 화면 하단 도달 시 호출할 데이터 로딩 콜백 함수
     */
    initInfiniteScroll(onLoadMore) {
        const sentinel = document.getElementById('scrollSentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) onLoadMore();
        }, { threshold: 0.1 });

        observer.observe(sentinel);
    },

    /** 이벤트를 지연 실행하기 위한 유틸리티 */
    debounce,

    /**
     * 특정 메모의 상세 정보 모달을 동적으로 로드하여 엽니다.
     * @param {string|number} id - 메모 고유 ID
     */
    openMemoModal(id) {
        import('./components/ModalManager.js').then(m => m.ModalManager.openMemoModal(id));
    },

    /**
     * 암호 해독 등을 위해 사용자로부터 비밀번호를 입력받는 커스텀 모달을 띄웁니다.
     * @async
     * @param {string} label - 입력창 상단에 표시할 설명 문구
     * @returns {Promise<string|null>} 사용자가 입력한 비밀번호 또는 취소 시 null
     */
    async promptPassword(label) {
        const { ModalManager } = await import('./components/ModalManager.js');
        return await ModalManager.promptPassword(label);
    }
};
