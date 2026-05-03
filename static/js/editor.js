import { API } from './api.js';
import { renderAttachmentBox } from './components/AttachmentBox.js';
import { SlashCommand } from './components/SlashCommand.js';
import { I18nManager } from './utils/I18nManager.js';

export const EditorManager = {
    editor: null,
    attachedFiles: [], // 현재 에디터에 첨부된 파일들
    sessionFiles: new Set(), // 이번 세션에 새로 추가된 파일 트래킹 (취소 시 삭제용)

    init(elSelector, onCtrlEnter) {
        // 이미 초기화된 경우 기존 에디터 인스턴스 반환 및 중복 방지
        const container = document.querySelector(elSelector);
        if (this.editor && container && container.querySelector('.toastui-editor-defaultUI')) {
            console.log('[Editor] Already initialized, skipping init.');
            return this.editor;
        }

        const isMobile = window.innerWidth <= 768;
        
        // --- 플러그인 설정 (글자 색상) ---
        const colorPlugin = (window.toastui && window.toastui.EditorPluginColorSyntax) || 
                            (window.toastui && window.toastui.Editor && window.toastui.Editor.plugin && window.toastui.Editor.plugin.colorSyntax);
        
        const plugins = (typeof colorPlugin === 'function') ? [colorPlugin] : [];

        this.editor = new toastui.Editor({
            el: document.querySelector(elSelector),
            height: '100%',
            initialEditType: 'wysiwyg',
            previewStyle: isMobile ? 'tab' : 'vertical',
            theme: 'dark',
            usageStatistics: false,
            placeholder: I18nManager.t('composer_placeholder'),
            plugins: plugins,
            toolbarItems: isMobile ? [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task'],
                ['table', 'image', 'link'],
                ['code', 'codeblock']
            ] : [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task', 'indent', 'outdent'],
                ['table', 'image', 'link'],
                ['code', 'codeblock'],
                ['scrollSync']
            ],
            hooks: {
                addImageBlobHook: async (blob, callback) => {
                    try {
                        const data = await API.uploadFile(blob);
                        if (data.url) {
                            const filename = data.url.split('/').pop();
                            callback(`/api/download/${filename}`, data.name || 'image');
                            
                            this.attachedFiles.push({
                                filename: filename,
                                original_name: data.name || 'image',
                                file_type: blob.type
                            });
                            this.sessionFiles.add(filename);
                            this.refreshAttachmentUI();
                        }
                    } catch (err) { alert(err.message); }
                }
            }
        });

        // --- 키보드 단축키 시스템 ---
        const editorEl = document.querySelector(elSelector);

        // Ctrl+Shift 조합 단축키 맵 (toolbar 메뉴 대체)
        const shortcutMap = {
            'x': 'taskList',        // Ctrl+Shift+X : 체크박스(Task) 토글
            'u': 'bulletList',      // Ctrl+Shift+U : 순서 없는 목록
            'o': 'orderedList',     // Ctrl+Shift+O : 순서 있는 목록
            'q': 'blockQuote',      // Ctrl+Shift+Q : 인용 블록
            'k': 'codeBlock',       // Ctrl+Shift+K : 코드 블록
            'l': 'thematicBreak',   // Ctrl+Shift+L : 수평선(구분선)
            ']': 'indent',          // Ctrl+Shift+] : 들여쓰기
            '[': 'outdent',         // Ctrl+Shift+[ : 내어쓰기
        };

        editorEl.addEventListener('keydown', (e) => {
            // 1. Ctrl+Enter → 저장
            if (onCtrlEnter && e.ctrlKey && !e.shiftKey && (e.key === 'Enter' || e.keyCode === 13)) {
                onCtrlEnter();
                return;
            }

            // 2. Ctrl+Shift+[Key] → toolbar 명령 실행
            if (e.ctrlKey && e.shiftKey) {
                const cmd = shortcutMap[e.key.toLowerCase()];
                if (cmd) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.editor.exec(cmd);
                }
            }
        }, true); // capture 단계에서 잡아서 에디터 내부 이벤트보다 먼저 처리

        // --- 슬래시 명령(/) 팝업 초기화 ---
        SlashCommand.init(this.editor, editorEl);

        return this.editor;
    },

    setAttachedFiles(files) {
        console.log('[Editor] Loading attachments:', files);
        this.attachedFiles = (files || []).map(f => ({
            filename: f.filename || f.file_name,
            original_name: f.original_name || f.name || 'file',
            file_type: f.file_type || f.type || ''
        }));
        this.sessionFiles.clear(); // 기존 파일을 로드할 때는 세션 트래킹 초기화 (기존 파일은 삭제 대상 제외)
        this.refreshAttachmentUI();
    },

    refreshAttachmentUI() {
        const container = document.getElementById('editorAttachments');
        if (!container) {
            console.warn('[Editor] #editorAttachments element not found in DOM!');
            return;
        }
        
        console.log('[Editor] Refreshing UI with:', this.attachedFiles);
        container.innerHTML = '';
        const box = renderAttachmentBox(this.attachedFiles, {
            onRemove: (filename) => this.removeAttachment(filename)
        });
        if (box) container.appendChild(box);
    },

    async removeAttachment(filename) {
        if (!confirm(I18nManager.t('msg_confirm_delete_attachment') || '정말 이 첨부파일을 삭제하시겠습니까?')) return;
        
        // 목록에서 제거
        this.attachedFiles = this.attachedFiles.filter(f => f.filename !== filename);
        
        // 세션 중에 새로 추가한 파일이면 서버에서도 삭제
        if (this.sessionFiles.has(filename)) {
            try {
                await API.deleteAttachment(filename);
                this.sessionFiles.delete(filename);
            } catch (err) {
                console.error(`[Editor] Failed to delete session file ${filename}:`, err);
            }
        }
        
        // UI 갱신
        this.refreshAttachmentUI();
    },

    bindDropEvent(wrapperSelector, onDropComplete) {
        const wrapper = document.querySelector(wrapperSelector);
        wrapper.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
        wrapper.addEventListener('drop', async (e) => {
            e.preventDefault(); e.stopPropagation();
            
            // 💡 1. 메모 카드 드롭 처리 ([[#ID]] 삽입)
            const memoId = e.dataTransfer.getData('memo-id');
            if (memoId) {
                this.editor.focus();
                this.editor.insertText(` [[#${memoId}]] `);
                return;
            }

            // 💡 2. 기존 파일 드롭 처리
            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;

            // 에디터가 닫혀있다면 상위에서 열어줘야 함
            if (onDropComplete) onDropComplete(true); 

            await this.handleFiles(files);
        });
    },

    /**
     * 다중 파일을 처리(업로드 및 UI 반영)함
     */
    async handleFiles(files) {
        if (!files || files.length === 0) return;

        for (let file of files) {
            try {
                const data = await API.uploadFile(file);
                if (data.url) {
                    const filename = data.url.split('/').pop();
                    const isImg = ['png','jpg','jpeg','gif','webp','svg'].includes(data.ext?.toLowerCase());
                    const name = data.name || 'file';
                    
                    // Ensure editor is focused before inserting
                    this.editor.focus();

                    if (isImg) {
                        this.editor.exec('addImage', { altText: name, imageUrl: data.url });
                    }

                    // 공통: 첨부 파일 목록에 추가 및 UI 갱신
                    this.attachedFiles.push({
                        filename: filename,
                        original_name: name,
                        file_type: file.type
                    });
                    this.sessionFiles.add(filename); // 세션 트래킹 추가
                    this.refreshAttachmentUI();
                }
            } catch (err) { console.error('[Editor] File process error:', err); }
        }
    },

    getAttachedFilenames() {
        return this.attachedFiles.map(f => f.filename);
    },

    /**
     * 취소(삭제) 시 세션 동안 추가된 파일들을 서버에서 지움
     */
    async cleanupSessionFiles() {
        if (this.sessionFiles.size === 0) return;
        
        console.log(`[Editor] Cleaning up ${this.sessionFiles.size} session files...`);
        const filesToDelete = Array.from(this.sessionFiles);
        for (const filename of filesToDelete) {
            try {
                await API.deleteAttachment(filename);
            } catch (err) {
                console.error(`Failed to delete session file ${filename}:`, err);
            }
        }
        this.sessionFiles.clear();
    },

    getMarkdown() { return this.editor.getMarkdown().trim(); },
    setMarkdown(md) { this.editor.setMarkdown(md); },
    focus() { this.editor.focus(); }
};
