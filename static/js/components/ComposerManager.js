/**
 * 메모 작성 및 수정기 (Composer) 관리 모듈
 */
import { API } from '../api.js';
import { EditorManager } from '../editor.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';

export const ComposerManager = {
    DOM: {},

    init(onSaveSuccess) {
        // 타이밍 이슈 방지를 위해 DOM 요소 지연 할당
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
            discardBtn: document.getElementById('discardBtn')
        };
        
        if (!this.DOM.composer || !this.DOM.trigger) return;

        // 1. 이벤트 바인딩
        this.DOM.trigger.onclick = () => this.openEmpty();
        this.DOM.foldBtn.onclick = () => this.close();
        
        this.DOM.discardBtn.onclick = async () => {
            if (confirm(I18nManager.t('msg_confirm_discard'))) {
                await EditorManager.cleanupSessionFiles();
                this.clear();
                this.close();
            }
        };

        this.DOM.composer.onsubmit = (e) => {
            e.preventDefault();
            this.handleSave(onSaveSuccess);
        };

        this.DOM.encryptionToggle.onclick = () => this.toggleEncryption();
        
        // 단축키 힌트 토글 바인딩
        const shortcutToggle = document.getElementById('shortcutToggle');
        const shortcutDetails = document.getElementById('shortcutDetails');
        if (shortcutToggle && shortcutDetails) {
            shortcutToggle.onclick = () => {
                const isVisible = shortcutDetails.style.display !== 'none';
                shortcutDetails.style.display = isVisible ? 'none' : 'flex';
                const label = I18nManager.t('shortcuts_label');
                shortcutToggle.textContent = isVisible ? label : `${label} ▲`;
            };
        }

        // --- 자동 임시저장 (Auto-Draft) ---
        this.draftTimer = setInterval(() => this.saveDraft(), 3000);
        this.checkDraftRestore();
    },

    openEmpty() {
        this.clear();
        this.DOM.composer.style.display = 'block';
        this.DOM.trigger.style.display = 'none';
        this.DOM.title.focus();
    },

    openForEdit(memo) {
        if (!memo) return;
        this.clear();
        this.DOM.id.value = memo.id;
        this.DOM.title.value = memo.title || '';
        this.DOM.group.value = memo.group_name || Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = (memo.tags || []).filter(t => t.source === 'user').map(t => t.name).join(', ');
        
        EditorManager.setMarkdown(memo.content || '');
        EditorManager.setAttachedFiles(memo.attachments || []);
        
        if (memo.was_encrypted || memo.is_encrypted) {
            this.setLocked(true, memo.tempPassword || '');
        }

        this.DOM.composer.style.display = 'block';
        this.DOM.trigger.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async handleSave(callback) {
        const data = {
            title: this.DOM.title.value.trim(),
            content: EditorManager.getMarkdown(),
            group_name: this.DOM.group.value.trim() || Constants.GROUPS.DEFAULT,
            tags: this.DOM.tags.value.split(',').map(t => t.trim()).filter(t => t),
            is_encrypted: this.DOM.encryptionToggle.dataset.locked === 'true',
            password: this.DOM.password.value.trim(),
            attachment_filenames: EditorManager.getAttachedFilenames()
        };

        if (!data.title && !data.content) { this.close(); return; }
        if (data.is_encrypted && !data.password) { alert(I18nManager.t('msg_alert_password_required')); return; }

        try {
            await API.saveMemo(data, this.DOM.id.value);
            EditorManager.sessionFiles.clear();
            this.clearDraft();
            if (callback) await callback();
            this.clear();
            this.close();
        } catch (err) { alert(err.message); }
    },

    close() {
        this.DOM.composer.style.display = 'none';
        this.DOM.trigger.style.display = 'block';
    },

    clear() {
        this.DOM.id.value = '';
        this.DOM.title.value = '';
        this.DOM.group.value = Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = '';
        EditorManager.setMarkdown('');
        EditorManager.setAttachedFiles([]);
        this.setLocked(false);
    },

    toggleEncryption() {
        const isLocked = this.DOM.encryptionToggle.dataset.locked === 'true';
        this.setLocked(!isLocked);
    },

    setLocked(locked, password = null) {
        this.DOM.encryptionToggle.dataset.locked = locked;
        this.DOM.encryptionToggle.innerText = locked ? '🔒' : '🔓';
        this.DOM.password.style.display = locked ? 'block' : 'none';
        
        // 비밀번호가 명시적으로 전달된 경우에만 업데이트 (해제 시 기존 비번 유지)
        if (password !== null) {
            this.DOM.password.value = password;
        }
        
        if (locked && !this.DOM.password.value) {
            this.DOM.password.focus();
        }
    },

    // === 자동 임시저장 (Auto-Draft) ===

    /**
     * 현재 에디터 내용을 localStorage에 자동 저장
     */
    saveDraft() {
        // 컴포저가 닫혀있으면 저장하지 않음
        if (this.DOM.composer.style.display !== 'block') return;

        const title = this.DOM.title.value;
        const content = EditorManager.getMarkdown();

        // 내용이 비어있으면 저장하지 않음
        if (!title && !content) return;

        const draft = {
            title: title,
            content: content,
            group: this.DOM.group.value,
            tags: this.DOM.tags.value,
            editingId: this.DOM.id.value,
            timestamp: Date.now()
        };
        localStorage.setItem('memo_draft', JSON.stringify(draft));
    },

    /**
     * 페이지 로드 시 임시저장된 내용이 있으면 복원 확인
     */
    checkDraftRestore() {
        const raw = localStorage.getItem('memo_draft');
        if (!raw) return;

        try {
            const draft = JSON.parse(raw);

            // 24시간 이상 된 임시저장은 자동 삭제
            if (Date.now() - draft.timestamp > 86400000) {
                this.clearDraft();
                return;
            }

            // 내용이 실제로 있는 경우에만 복원 확인
            if (!draft.title && !draft.content) {
                this.clearDraft();
                return;
            }

            const titlePreview = draft.title || I18nManager.t('label_untitled');
            const confirmMsg = I18nManager.t('msg_draft_restore_confirm')
                .replace('{title}', titlePreview);
                
            if (confirm(confirmMsg)) {
                this.openEmpty();
                this.DOM.title.value = draft.title || '';
                this.DOM.group.value = draft.group || Constants.GROUPS.DEFAULT;
                this.DOM.tags.value = draft.tags || '';
                if (draft.editingId) this.DOM.id.value = draft.editingId;
                EditorManager.setMarkdown(draft.content || '');
            } else {
                this.clearDraft();
            }
        } catch (e) {
            console.warn('[Draft] Failed to parse draft, deleting:', e);
            this.clearDraft();
        }
    },

    /**
     * 임시저장 데이터 삭제
     */
    clearDraft() {
        localStorage.removeItem('memo_draft');
    }
};
