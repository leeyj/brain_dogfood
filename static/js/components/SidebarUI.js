/**
 * 사이드바 시스템 메뉴 및 카테고리의 동적 렌더링을 담당하는 컴포넌트
 */
import { Constants as S } from '../utils/Constants.js';
import { I18nManager } from '../utils/I18nManager.js';

export class SidebarUI {
    constructor() {
        // 시스템 메뉴 설정
        this.systemMenuItems = [
            { group: 'all', icon: 'fas fa-th-large', labelKey: 'menu_all_memos' },
            { group: 'starred', icon: 'fas fa-star', labelKey: 'menu_starred' },
            { group: 'files', icon: 'fas fa-paperclip', labelKey: 'nav_files' },
            { group: 'daily', icon: 'fas fa-calendar-day', labelKey: 'menu_today' },
            { group: 'weekly', icon: 'fas fa-calendar-week', labelKey: 'menu_weekly' },
            { group: 'archive', icon: 'fas fa-clipboard-check', labelKey: 'menu_archive' }
        ];
    }

    /**
     * 시스템 네비게이션 메뉴 렌더링
     */
    renderSystemMenu(container) {
        if (!container) return;
        container.innerHTML = '';

        this.systemMenuItems.forEach(item => {
            const li = document.createElement('li');
            li.dataset.group = item.group;
            li.innerHTML = `
                <i class="${item.icon} icon"></i> 
                <span class="text" data-i18n="${item.labelKey}">${I18nManager.t(item.labelKey)}</span>
            `;
            container.appendChild(li);
        });
    }

    /**
     * 고정된 카테고리 리스트 렌더링
     * @param {HTMLElement} container 카테고리가 렌더링될 컨테이너
     * @param {Array} categories 카테고리 데이터 배열 (id, name, color 등)
     * @param {string} activeCategory 현재 활성화된 카테고리 ID
     * @param {Function} onCategoryClick 클릭 콜백
     */
    renderCategoryList(container, categories, activeCategory, onCategoryClick) {
        if (!container) return;
        container.innerHTML = '';

        if (!categories || categories.length === 0) {
            container.innerHTML = `<li class="empty-msg">${I18nManager.t('msg_no_pinned_categories')}</li>`;
            return;
        }

        categories.forEach(cat => {
            const li = document.createElement('li');
            li.className = (cat.id === activeCategory) ? 'active' : '';
            li.style.borderLeft = `3px solid ${cat.color || 'transparent'}`;
            li.innerHTML = `
                <i class="fas fa-hashtag"></i> 
                <span>${cat.name}</span>
            `;
            li.onclick = () => onCategoryClick(cat.id);
            container.appendChild(li);
        });
    }
}
