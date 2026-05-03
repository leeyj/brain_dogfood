/**
 * 메모 작성 및 수정기 (Composer) 관리 모듈 (Orchestrator)
 */
import { API } from '../api.js';
import { EditorManager } from '../editor.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';
import { AppService } from '../AppService.js';

// --- 서브 모듈 임포트 ---
import { ComposerUI } from './composer/ComposerUI.js';
import { ComposerDraft } from './composer/ComposerDraft.js';
import { ComposerCategoryUI } from './composer/ComposerCategoryUI.js';
import { ComposerSecurity } from './composer/ComposerSecurity.js';
import { ComposerShortcuts } from './composer/ComposerShortcuts.js';

export const ComposerManager = {
    DOM: {},
    selectedCategory: null,
    isDoneStatus: false,

    init(onSaveSuccess) {
        // 1. 서브 모듈 초기화
        this.DOM = ComposerUI.init();
        ComposerSecurity.init(this.DOM);
        
        if (!this.DOM.composer || !this.DOM.trigger) return;

        this.selectedCategory = null; 
        this.isDoneStatus = false;    
        
        // 2. 이벤트 바인딩 (UI 관련)
        this.DOM.trigger.onclick = () => this.openEmpty();
        this.DOM.foldBtn.onclick = () => this.close();
        
        this.DOM.discardBtn.onclick = async () => {
            const isEditing = !!this.DOM.id.value;
            if (isEditing || confirm(I18nManager.t('msg_confirm_discard'))) {
                this.forceClose();
            }
        };

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

        this.DOM.encryptionToggle.onclick = () => ComposerSecurity.toggle();

        // 3. 파일 첨부 연동
        if (this.DOM.attachBtn && this.DOM.fileInput) {
            this.DOM.attachBtn.onclick = () => this.DOM.fileInput.click();
            this.DOM.fileInput.onchange = (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    EditorManager.handleFiles(files);
                    e.target.value = ''; 
                }
            };
        }

        // 4. 단축키 시스템 초기화
        ComposerShortcuts.init({
            isVisible: () => ComposerUI.isVisible(),
            onToggleDone: () => {
                this.isDoneStatus = !this.isDoneStatus;
                this.renderCategoryChips();
            },
            onSelectCategory: (cat) => {
                this.selectedCategory = (this.selectedCategory === cat) ? null : cat;
                this.renderCategoryChips();
            },
            onClearCategory: () => {
                this.selectedCategory = null;
                this.renderCategoryChips();
            }
        });

        // 5. 자동 임시저장 및 복원
        this.draftTimer = setInterval(() => this.saveDraft(), 3000);
        ComposerDraft.checkRestore((draft) => this.restoreDraft(draft));
    },

    openEmpty() {
        this.clear();

        // 컨텍스트 기반 그룹 자동 설정
        const currentGroup = AppService.state.currentFilterGroup;
        if (currentGroup && 
            currentGroup !== 'all' && 
            currentGroup !== Constants.GROUPS.DONE && 
            !currentGroup.startsWith('tag:')) {
            this.DOM.group.value = currentGroup;
        }

        ComposerUI.show();
        if (this.DOM.deleteBtn) this.DOM.deleteBtn.style.display = 'none';
        this.renderCategoryChips();
        ComposerUI.focusTitle();
    },

    openForEdit(memo) {
        if (!memo) return;
        this.clear();
        this.DOM.id.value = memo.id;
        this.DOM.title.value = memo.title || '';
        this.DOM.group.value = memo.group_name || Constants.GROUPS.DEFAULT;
        this.DOM.tags.value = (memo.tags || []).filter(t => t.source === 'user').map(t => t.name).join(', ');
        
        this.selectedCategory = memo.category || null;
        this.isDoneStatus = memo.status === 'done';

        EditorManager.setMarkdown(memo.content || '');
        EditorManager.setAttachedFiles(memo.attachments || []);
        
        if (memo.was_encrypted || memo.is_encrypted) {
            ComposerSecurity.setLocked(true, memo.tempPassword || '');
        }

        if (this.DOM.dueDate) this.DOM.dueDate.value = memo.due_date || '';

        ComposerUI.show();
        if (this.DOM.deleteBtn) this.DOM.deleteBtn.style.display = 'block';
        this.renderCategoryChips();
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
            password: ComposerSecurity.getPassword(),
            is_encrypted: ComposerSecurity.isLocked(),
            attachment_filenames: EditorManager.getAttachedFilenames(),
            due_date: this.DOM.dueDate ? this.DOM.dueDate.value : null
        };

        if (!data.title && !data.content) { this.close(); return; }
        if (data.is_encrypted && !data.password) { alert(I18nManager.t('msg_alert_password_required')); return; }

        try {
            await API.saveMemo(data, this.DOM.id.value);
            EditorManager.sessionFiles.clear();
            ComposerDraft.clear(); 
            if (callback) await callback();
            this.clear();
            this.close();
        } catch (err) { alert(err.message); }
    },

    close() {
        ComposerUI.hide();
    },

    forceClose() {
        EditorManager.cleanupSessionFiles().catch(e => console.error(e));
        this.clear();
        this.close();
    },

    clear() {
        ComposerUI.clear();
        this.selectedCategory = null;
        this.isDoneStatus = false;
        EditorManager.setMarkdown('');
        EditorManager.setAttachedFiles([]);
        ComposerSecurity.setLocked(false);
        this.renderCategoryChips();
    },

    saveDraft() {
        if (!ComposerUI.isVisible()) return;
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
    }
};
