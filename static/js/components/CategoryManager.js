/**
 * 카테고리 관리 모달 (Category Management Modal)
 */
import { API } from '../api.js';
import { I18nManager } from '../utils/I18nManager.js';
import { ThemeEngine } from './ThemeEngine.js';
import { SettingsManager } from './SettingsManager.js';

export const CategoryManager = {
    DOM: {},
    onUpdateCallback: null,

    init(onUpdateCallback) {
        this.onUpdateCallback = onUpdateCallback;
        this.DOM = {
            modal: document.getElementById('categoryModal'),
            closeBtn: document.getElementById('closeCategoryBtn'),
            container: document.getElementById('categoryListContainer'),
            input: document.getElementById('newCategoryInput'),
            addBtn: document.getElementById('addCategoryBtn')
        };

        if (!this.DOM.modal) return;

        this.DOM.closeBtn.onclick = () => this.close();
        this.DOM.addBtn.onclick = () => this.handleAdd();
        this.DOM.input.onkeydown = (e) => { if (e.key === 'Enter') this.handleAdd(); };
        
        window.addEventListener('click', (e) => {
            if (e.target === this.DOM.modal) this.close();
        });
    },

    async open() {
        // 모달을 열 때 최신 설정을 서버에서 다시 불러옴
        await SettingsManager.initSettings();
        this.render();
        this.DOM.modal.classList.add('active');
        this.DOM.input.focus();
    },

    close() {
        this.DOM.modal.classList.remove('active');
    },

    async render() {
        const settings = ThemeEngine.settings || {};
        const categories = settings.categories || [];
        const pinned = settings.pinned_categories || [];

        this.DOM.container.innerHTML = '';

        categories.forEach(cat => {
            const isPinned = pinned.includes(cat);
            const item = document.createElement('div');
            item.className = 'cat-item';
            
            item.innerHTML = `
                <div class="cat-name">${cat}</div>
                <div class="cat-actions">
                    <button class="cat-action-btn pin ${isPinned ? 'active' : ''}" title="Pin/Unpin Slot">
                        ${isPinned ? '📍' : '📌'}
                    </button>
                    <button class="cat-action-btn delete" title="Delete Category">🗑️</button>
                </div>
            `;

            // 핀 토글
            item.querySelector('.pin').onclick = () => this.togglePin(cat);
            
            // 삭제
            item.querySelector('.delete').onclick = () => this.deleteCategory(cat);

            this.DOM.container.appendChild(item);
        });

        if (categories.length === 0) {
            this.DOM.container.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:0.9rem; padding:20px;">${I18nManager.t('label_no_category')}</p>`;
        }
    },

    async handleAdd() {
        const name = this.DOM.input.value.trim();
        if (!name) return;
        if (name.length > 20) {
            alert("Name too long (max 20)");
            return;
        }

        const settings = { ...ThemeEngine.settings };
        if (!settings.categories) settings.categories = [];
        if (!settings.pinned_categories) settings.pinned_categories = [];

        if (settings.categories.includes(name)) {
            alert("Already exists");
            return;
        }

        settings.categories.push(name);
        // 공간이 있으면 자동 핀 고정
        if (settings.pinned_categories.length < 3) {
            settings.pinned_categories.push(name);
        }

        await this.save(settings);
        this.DOM.input.value = '';
        this.render();
    },

    async togglePin(cat) {
        const settings = { ...ThemeEngine.settings };
        if (!settings.pinned_categories) settings.pinned_categories = [];
        
        const idx = settings.pinned_categories.indexOf(cat);

        if (idx > -1) {
            settings.pinned_categories.splice(idx, 1);
        } else {
            if (settings.pinned_categories.length >= 3) {
                alert(I18nManager.t('msg_category_limit'));
                return;
            }
            settings.pinned_categories.push(cat);
        }

        await this.save(settings);
        this.render();
    },

    async deleteCategory(cat) {
        if (!confirm(I18nManager.t('msg_confirm_delete_category'))) return;

        const settings = { ...ThemeEngine.settings };
        settings.categories = settings.categories.filter(c => c !== cat);
        settings.pinned_categories = settings.pinned_categories.filter(c => c !== cat);

        await this.save(settings);
        this.render();
    },

    async save(settings) {
        try {
            await API.saveSettings(settings);
            // 전역 세팅 업데이트 및 UI 리프레시
            ThemeEngine.settings = settings;
            if (this.onUpdateCallback) this.onUpdateCallback();
        } catch (err) {
            alert("Save failed: " + err.message);
        }
    }
};
