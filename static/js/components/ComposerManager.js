/**
 * 메모 작성 및 수정기 (Composer) 관리 모듈
 */
import { API } from '../api.js';
import { EditorManager } from '../editor.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';
import { AppService } from '../AppService.js';
import { ThemeManager } from './ThemeManager.js';

// --- NEW 서브 모듈 임포트 ---
import { ComposerDraft } from './composer/ComposerDraft.js';
import { ComposerCategoryUI } from './composer/ComposerCategoryUI.js';

export const ComposerManager = {
    DOM: {},

    init(onSaveSuccess) {
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
            deleteBtn: document.getElementById('deleteMemoBtn'), // NEW
            categoryBar: document.getElementById('composerCategoryBar'),
            attachBtn: document.getElementById('attachBtn'),
            fileInput: document.getElementById('composerFileInput'),
            dueDate: document.getElementById('memoDueDate')
        };
        
        if (!this.DOM.composer || !this.DOM.trigger) return;

        this.selectedCategory = null; 
        this.isDoneStatus = false;    
        
        // 1. 이벤트 바인딩
        this.DOM.trigger.onclick = () => this.openEmpty();
        this.DOM.foldBtn.onclick = () => this.close();
        
        this.DOM.discardBtn.onclick = async () => {
            const isEditing = !!this.DOM.id.value;
            // 💡 기존 메모 수정 중일 때는 확인 없이 바로 닫기
            // 💡 새 메모 작성 중일 때만 파일 정리 여부 묻기
            if (isEditing || confirm(I18nManager.t('msg_confirm_discard'))) {
                this.forceClose();
            }
        };

        // 💡 에디터 내 실제 삭제 버튼
        if (this.DOM.deleteBtn) {
            this.DOM.deleteBtn.onclick = async () => {
                const id = this.DOM.id.value;
                if (!id) return;
                if (confirm(I18nManager.t('msg_delete_confirm'))) {
                    await API.deleteMemo(id);
                    if (onSaveSuccess) onSaveSuccess();
                    this.clear();
                    this.close();
                }
            };
        }

        this.DOM.composer.onsubmit = (e) => {
            e.preventDefault();
            this.handleSave(onSaveSuccess);
        };

        this.DOM.encryptionToggle.onclick = () => this.toggleEncryption();
        this.initShortcutHint();

        // 💡 파일 첨부 버튼 연동
        if (this.DOM.attachBtn && this.DOM.fileInput) {
            this.DOM.attachBtn.onclick = () => this.DOM.fileInput.click();
            this.DOM.fileInput.onchange = (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    EditorManager.handleFiles(files);
                    e.target.value = ''; // 같은 파일 다시 올릴 수 있게 초기화
                }
            };
        }

        // 2. 자동 임시저장 및 키보드 리스너 등록
        this.draftTimer = setInterval(() => this.saveDraft(), 3000);
        ComposerDraft.checkRestore((draft) => this.restoreDraft(draft));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    },

    initShortcutHint() {
        const toggle = document.getElementById('shortcutToggle');
        const details = document.getElementById('shortcutDetails');
        if (toggle && details) {
            toggle.onclick = () => {
                const isVisible = details.style.display !== 'none';
                details.style.display = isVisible ? 'none' : 'flex';
                toggle.textContent = isVisible ? I18nManager.t('shortcuts_label') : `${I18nManager.t('shortcuts_label')} ▲`;
            };
        }
    },

    openEmpty() {
        this.clear();

        // 컨텍스트 기반 그룹 자동 설정 (all, done, tag 제외)
        const currentGroup = AppService.state.currentFilterGroup;
        if (currentGroup && 
            currentGroup !== 'all' && 
            currentGroup !== Constants.GROUPS.DONE && 
            !currentGroup.startsWith('tag:')) {
            this.DOM.group.value = currentGroup;
        }

        this.DOM.composer.style.display = 'block';
        this.DOM.trigger.style.display = 'none';
        if (this.DOM.deleteBtn) this.DOM.deleteBtn.style.display = 'none'; // 새 메모에선 숨김
        this.renderCategoryChips(); // 💡 초기화 후 칩 렌더링
        this.DOM.title.focus();
    },

    openForEdit(memo) {
        if (!memo) return;
        this.clear();
        this.DOM.id.value = memo.id;
        this.DOM.title.value = memo.title || '';
        this.DOM.group.value = memo.group_name || Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = (memo.tags || []).filter(t => t.source === 'user').map(t => t.name).join(', ');
        
        // 💡 분류 및 상태 복원
        this.selectedCategory = memo.category || null;
        this.isDoneStatus = memo.status === 'done';

        EditorManager.setMarkdown(memo.content || '');
        EditorManager.setAttachedFiles(memo.attachments || []);
        
        if (memo.was_encrypted || memo.is_encrypted) {
            this.setLocked(true, memo.tempPassword || '');
        }

        if (this.DOM.dueDate) this.DOM.dueDate.value = memo.due_date || '';

        this.DOM.composer.style.display = 'block';
        this.DOM.trigger.style.display = 'none';
        if (this.DOM.deleteBtn) this.DOM.deleteBtn.style.display = 'block'; // 수정 시에만 보임
        this.renderCategoryChips(); // 💡 렌더링
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async handleSave(callback) {
        const data = {
            title: this.DOM.title.value.trim(),
            content: EditorManager.getMarkdown(),
            group_name: this.DOM.group.value.trim() || Constants.GROUPS.DEFAULT,
            category: this.selectedCategory,
            status: this.isDoneStatus ? 'done' : 'active',
            tags: this.DOM.tags.value.split(',').map(t => t.trim()).filter(t => t),
            password: this.DOM.password.value.trim(),
            attachment_filenames: EditorManager.getAttachedFilenames(),
            due_date: this.DOM.dueDate ? this.DOM.dueDate.value : null
        };

        if (!data.title && !data.content) { this.close(); return; }
        if (data.is_encrypted && !data.password) { alert(I18nManager.t('msg_alert_password_required')); return; }

        try {
            await API.saveMemo(data, this.DOM.id.value);
            EditorManager.sessionFiles.clear();
            ComposerDraft.clear(); // 💡 서브 모듈 위임
            if (callback) await callback();
            this.clear();
            this.close();
        } catch (err) { alert(err.message); }
    },

    close() {
        this.DOM.composer.style.display = 'none';
        this.DOM.trigger.style.display = 'block';
    },

    forceClose() {
        EditorManager.cleanupSessionFiles().catch(e => console.error(e));
        this.clear();
        this.close();
    },

    clear() {
        this.DOM.id.value = '';
        this.DOM.title.value = '';
        this.DOM.group.value = Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = '';
        this.selectedCategory = null;
        this.isDoneStatus = false;
        EditorManager.setMarkdown('');
        EditorManager.setAttachedFiles([]);
        this.setLocked(false);
        if (this.DOM.dueDate) this.DOM.dueDate.value = '';
        this.renderCategoryChips();
    },

    toggleEncryption() {
        const isLocked = this.DOM.encryptionToggle.dataset.locked === 'true';
        this.setLocked(!isLocked);
    },

    setLocked(locked, password = null) {
        this.DOM.encryptionToggle.dataset.locked = locked;
        this.DOM.encryptionToggle.innerText = locked ? '🔒' : '🔓';
        this.DOM.password.style.display = locked ? 'block' : 'none';
        if (password !== null) this.DOM.password.value = password;
        if (locked && !this.DOM.password.value) this.DOM.password.focus();
    },

    // --- 서브 모듈 위임 메서드들 ---

    saveDraft() {
        if (this.DOM.composer.style.display !== 'block') return;
        ComposerDraft.save(
            this.DOM.id.value, 
            this.DOM.title.value, 
            this.DOM.group.value, 
            this.DOM.tags.value, 
            EditorManager.getMarkdown()
        );
    },

    restoreDraft(draft) {
        this.openEmpty();
        this.DOM.title.value = draft.title || '';
        this.DOM.group.value = draft.group || Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = draft.tags || '';
        if (draft.editingId) this.DOM.id.value = draft.editingId;
        EditorManager.setMarkdown(draft.content || '');
    },

    renderCategoryChips() {
        ComposerCategoryUI.render(
            this.DOM.categoryBar, 
            this.selectedCategory, 
            this.isDoneStatus, 
            {
                onSelect: (cat) => {
                    this.selectedCategory = (this.selectedCategory === cat) ? null : cat;
                    this.renderCategoryChips();
                },
                onToggleDone: () => {
                    this.isDoneStatus = !this.isDoneStatus;
                    this.renderCategoryChips();
                }
            }
        );
    },

    handleKeyDown(e) {
        if (this.DOM.composer.style.display !== 'block') return;
        if (!e.altKey) return;

        const key = e.key;
        if (key === '1') {
            e.preventDefault();
            this.isDoneStatus = !this.isDoneStatus;
            this.renderCategoryChips();
        } else if (key === '2' || key === '3' || key === '4') {
            e.preventDefault();
            const cat = ComposerCategoryUI.getCategoryBySlot(parseInt(key) - 1);
            if (cat) {
                this.selectedCategory = (this.selectedCategory === cat) ? null : cat;
                this.renderCategoryChips();
            }
        } else if (key === '5') {
            e.preventDefault();
            this.selectedCategory = null;
            this.renderCategoryChips();
        }
    }
};
