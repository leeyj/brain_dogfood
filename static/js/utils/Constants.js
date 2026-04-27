/**
 * 전역 시스템 상수 (Global System Constants)
 */
export const Constants = {
    GROUPS: {
        DEFAULT: 'default',
        FILES: 'files',
        DONE: 'done',
        STARRED: 'starred',
        TRASH: 'trash'
    },
    /**
     * DOM 선택자 정의 (UI 모듈 간 일관성 유지)
     */
    SELECTORS: {
        MEMO_GRID: '#memoGrid',
        GROUP_LIST: '#groupList',
        MEMO_MODAL: '#memoModal',
        LOADING_OVERLAY: '#loadingOverlay',
        SEARCH_INPUT: '#searchInput',
        SIDEBAR: '#sidebar',
        SYSTEM_NAV: '#systemNav',
        SCROLL_SENTINEL: '#scrollSentinel',
        MASONRY_COLUMN: '.masonry-column',
        SIDEBAR_TOGGLE: '#sidebarToggle',
        SIDEBAR_OVERLAY: '#sidebarOverlay',
        LOGOUT_BTN: '#logoutBtn',
        MODAL_CALENDAR: '#calendarContainer',
        MODAL_HEATMAP: '#heatmapContainer',
        COMPOSER_CATEGORY_BAR: '#composerCategoryBar',
        SIDEBAR_CATEGORY_SECTION: '#categorySidebarSection',
        CATEGORY_NAV: '#categoryNav',
        HELP_BTN: '#helpBtn',
        SETTINGS_BTN: '#settingsBtn'
    },
    /**
     * 레이아웃 및 UI 설정
     */
    UI: {
        MOBILE_BREAKPOINT: 768,
        STORAGE_KEYS: {
            SIDEBAR_COLLAPSED: 'sidebarCollapsed'
        }
    }
};
