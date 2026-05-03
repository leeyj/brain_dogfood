/**
 * 작성기(Composer) 보안 및 암호화 제어 모듈
 */
export const ComposerSecurity = {
    DOM: null,

    init(dom) {
        this.DOM = dom;
    },

    toggle() {
        const isLocked = this.DOM.encryptionToggle.dataset.locked === 'true';
        this.setLocked(!isLocked);
    },

    setLocked(locked, password = null) {
        if (!this.DOM.encryptionToggle) return;
        
        this.DOM.encryptionToggle.dataset.locked = locked;
        this.DOM.encryptionToggle.innerText = locked ? '🔒' : '🔓';
        
        if (this.DOM.password) {
            this.DOM.password.style.display = locked ? 'block' : 'none';
            if (password !== null) this.DOM.password.value = password;
            if (locked && !this.DOM.password.value) this.DOM.password.focus();
        }
    },

    isLocked() {
        return this.DOM.encryptionToggle && this.DOM.encryptionToggle.dataset.locked === 'true';
    },

    getPassword() {
        return this.DOM.password ? this.DOM.password.value.trim() : '';
    }
};
