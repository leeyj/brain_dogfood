/**
 * 사이드바 메뉴 및 카테고리 가시성을 제어하는 매니저
 */
import { Constants as S } from '../utils/Constants.js';
import { SidebarUI } from './SidebarUI.js';
import { SidebarFooter } from './SidebarFooter.js';
import { ThemeEngine } from './ThemeEngine.js';

export const SidebarManager = {
    ui: new SidebarUI(),
    footer: new SidebarFooter(),

    /**
     * DOM 요소 캐시
     */
    getDOM() {
        const selectors = S.SELECTORS;
        return {
            sidebar: document.querySelector(selectors.SIDEBAR),
            sidebarOverlay: document.querySelector(selectors.SIDEBAR_OVERLAY),
            systemNav: document.querySelector(selectors.SYSTEM_NAV),
            toggle: document.querySelector(selectors.SIDEBAR_TOGGLE),
            categorySection: document.querySelector(selectors.SIDEBAR_CATEGORY_SECTION)
        };
    },

    /**
     * 사이드바 초기화
     */
    initSidebarToggle() {
        const DOM = this.getDOM();
        if (!DOM.sidebar || !DOM.toggle) return;

        // 1. 초기 상태 설정 (로컬 스토리지 기반)
        const isCollapsed = localStorage.getItem(S.UI.STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
        if (isCollapsed) {
            DOM.sidebar.classList.add('collapsed');
            const calendar = document.querySelector(S.SELECTORS.MODAL_CALENDAR);
            if (calendar) calendar.style.display = 'none';
        }

        // 2. 메뉴 렌더링
        this.ui.renderSystemMenu(DOM.systemNav);

        // 3. 토글 로직
        const toggleSidebar = () => {
            const isMobile = window.innerWidth <= S.UI.MOBILE_BREAKPOINT;
            if (isMobile) {
                DOM.sidebar.classList.toggle('mobile-open');
                if (DOM.sidebarOverlay) {
                    DOM.sidebarOverlay.style.display = DOM.sidebar.classList.contains('mobile-open') ? 'block' : 'none';
                }
            } else {
                DOM.sidebar.classList.toggle('collapsed');
                const collapsed = DOM.sidebar.classList.contains('collapsed');
                localStorage.setItem(S.UI.STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
                
                const calendar = document.querySelector(S.SELECTORS.MODAL_CALENDAR);
                if (calendar) calendar.style.display = collapsed ? 'none' : 'block';
            }
        };

        DOM.toggle.onclick = toggleSidebar;
        const mobileBtn = document.getElementById('mobileMenuBtn');
        if (mobileBtn) mobileBtn.onclick = toggleSidebar;

        if (DOM.sidebarOverlay) {
            DOM.sidebarOverlay.onclick = () => {
                DOM.sidebar.classList.remove('mobile-open');
                DOM.sidebarOverlay.style.display = 'none';
            };
        }

        // 4. 푸터 초기화
        this.footer.init();
    },

    /**
     * 사이드바 상태 갱신 (그룹/카테고리 선택 시)
     */
    updateSidebar(activeGroup, activeCategory, onGroupClick, onCategoryClick) {
        const DOM = this.getDOM();
        
        // 1. 시스템 그룹 동기화
        if (DOM.systemNav) {
            DOM.systemNav.querySelectorAll('li').forEach(li => {
                const group = li.dataset.group;
                li.className = (group === activeGroup && !activeCategory) ? 'active' : '';
                li.onclick = () => onGroupClick(group);
            });
        }

        // 2. 카테고리 렌더링 및 동기화 (Pinned Categories)
        const pinnedCategories = ThemeEngine.settings?.pinned_categories || [];
        const categoryNav = document.querySelector(S.SELECTORS.CATEGORY_NAV);
        this.ui.renderCategoryList(categoryNav, pinnedCategories, activeCategory, onCategoryClick);
        
        // 3. 카테고리 섹션 가시성 제어
        if (DOM.categorySection) {
            const isCategoryEnabled = ThemeEngine.settings?.enable_categories;
            DOM.categorySection.style.display = isCategoryEnabled ? 'block' : 'none';
        }
    },

    /**
     * 카테고리 기능 활성화 여부에 따라 UI 요소 노출 제어
     */
    applyCategoryVisibility(enabled) {
        const DOM = this.getDOM();
        const composerBar = document.querySelector(S.SELECTORS.COMPOSER_CATEGORY_BAR);
        
        if (composerBar) composerBar.style.display = enabled ? 'flex' : 'none';
        if (DOM.categorySection) DOM.categorySection.style.display = enabled ? 'block' : 'none';
    }
};
