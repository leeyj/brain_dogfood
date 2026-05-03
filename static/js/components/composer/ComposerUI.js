/**
 * 작성기(Composer) DOM 관리 및 기본 UI 제어 모듈
 */
import { Constants } from '../../utils/Constants.js';

export const ComposerUI = {
    DOM: {},

    init() {
        this.DOM = {
            trigger: document.getElementById('composerTrigger'),
            composer: document.getElementById('composer'),
            title: document.getElementById('memoTitle'),
            group: document.getElementById('memoGroup'),
            tags: document.getElementById('memoTags'),
            id: document.getElementById('editingMemoId'),
            encryptionToggle: document.getElementById('encryptionToggle'),
            password: document.getElementById('memoPassword'),
            foldBtn: document.getElementById('foldBtn'),
            discardBtn: document.getElementById('discardBtn'),
            deleteBtn: document.getElementById('deleteMemoBtn'),
            categoryBar: document.getElementById('composerCategoryBar'),
            attachBtn: document.getElementById('attachBtn'),
            fileInput: document.getElementById('composerFileInput'),
            dueDate: document.getElementById('memoDueDate')
        };
        return this.DOM;
    },

    show() {
        if (this.DOM.composer) this.DOM.composer.style.display = 'block';
        if (this.DOM.trigger) this.DOM.trigger.style.display = 'none';
    },

    hide() {
        if (this.DOM.composer) this.DOM.composer.style.display = 'none';
        if (this.DOM.trigger) this.DOM.trigger.style.display = 'block';
    },

    clear() {
        if (!this.DOM.id) return;
        this.DOM.id.value = '';
        this.DOM.title.value = '';
        this.DOM.group.value = Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = '';
        if (this.DOM.password) this.DOM.password.value = '';
        if (this.DOM.dueDate) this.DOM.dueDate.value = '';
    },

    focusTitle() {
        if (this.DOM.title) this.DOM.title.focus();
    },

    isVisible() {
        return this.DOM.composer && this.DOM.composer.style.display === 'block';
    }
};
