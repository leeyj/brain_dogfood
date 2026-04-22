/**
 * 사이드바 메뉴 및 카테고리 가시성을 제어하는 매니저
 */
import { ThemeManager } from './ThemeManager.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';

const S = Constants.SELECTORS;

export const SidebarManager = {
    /**
     * DOM 요소 캐시
     */
    getDOM() {
        return {
            sidebar: document.querySelector(S.SIDEBAR),
            sidebarOverlay: document.querySelector(S.SIDEBAR_OVERLAY),
            systemNav: document.querySelector(S.SYSTEM_NAV),
            toggle: document.querySelector(S.SIDEBAR_TOGGLE),
            logoutBtn: document.querySelector(S.LOGOUT_BTN)
        };
    },

    /**
     * 사이드바 및 로그아웃 버튼 초기화
     */
    initSidebarToggle() {
        const DOM = this.getDOM();
        
        if (DOM.toggle && DOM.sidebar) {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                DOM.sidebar.classList.add('collapsed');
                const calendar = document.querySelector(S.MODAL_CALENDAR);
                if (calendar) calendar.style.display = 'none';
            }
            
            const toggleSidebar = () => {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    DOM.sidebar.classList.toggle('mobile-open');
                    if (DOM.sidebarOverlay) {
                        DOM.sidebarOverlay.style.display = DOM.sidebar.classList.contains('mobile-open') ? 'block' : 'none';
                    }
                } else {
                    DOM.sidebar.classList.toggle('collapsed');
                    const collapsed = DOM.sidebar.classList.contains('collapsed');
                    localStorage.setItem('sidebarCollapsed', collapsed);
                    
                    const calendar = document.querySelector(S.MODAL_CALENDAR);
                    if (calendar) calendar.style.display = collapsed ? 'none' : 'block';
                }
            };

            DOM.toggle.onclick = toggleSidebar;
            const mobileBtn = document.getElementById('mobileMenuBtn'); // ID 유지
            if (mobileBtn) mobileBtn.onclick = toggleSidebar;

            if (DOM.sidebarOverlay) {
                DOM.sidebarOverlay.onclick = () => {
                    DOM.sidebar.classList.remove('mobile-open');
                    DOM.sidebarOverlay.style.display = 'none';
                };
            }
        }

        if (DOM.logoutBtn) {
            DOM.logoutBtn.onclick = () => {
                if (confirm(I18nManager.t('msg_logout_confirm'))) {
                    window.location.href = '/logout';
                }
            };
        }
    },

    /**
     * 사이드바 시스템 고정 메뉴 상태 갱신
     */
    updateSidebar(activeGroup, activeCategory, onGroupClick, onCategoryClick) {
        const DOM = this.getDOM();
        if (!DOM.systemNav) return;
        
        // 1. 시스템 그룹 동기화
        DOM.systemNav.querySelectorAll('li').forEach(li => {
            const group = li.dataset.group;
            li.className = (group === activeGroup) ? 'active' : '';
            li.onclick = () => onGroupClick(group);
        });

        // 2. 카테고리 동기화 (Pinned Categories)
        import('./SidebarUI.js').then(({ renderCategoryList }) => {
            const categoryNav = document.querySelector(S.CATEGORY_NAV);
            
            // ThemeManager에서 직접 복구 시도
            const pinned = ThemeManager.settings ? ThemeManager.settings.pinned_categories : [];
            
            renderCategoryList(categoryNav, pinned, activeCategory, onCategoryClick);
        });
    },

    /**
     * 카테고리 기능 활성화 여부에 따라 UI 요소 노출 제어
     */
    applyCategoryVisibility(enabled) {
        const composerBar = document.querySelector(S.COMPOSER_CATEGORY_BAR);
        const sidebarSection = document.querySelector(S.SIDEBAR_CATEGORY_SECTION);
        
        if (composerBar) {
            composerBar.style.display = enabled ? 'flex' : 'none';
        }
        if (sidebarSection) {
            sidebarSection.style.display = enabled ? 'block' : 'none';
        }
    }
};
