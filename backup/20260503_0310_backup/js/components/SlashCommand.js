/**
 * SlashCommand: 슬래시 명령어 엔진 (UI 및 입력 제어)
 * v7.0: 명령어 레지스트리 분리 (SlashRegistry 도입)
 */
import { SlashRegistry } from './SlashRegistry.js';

export const SlashCommand = {
    commands: [],           // Registry에서 로드됨
    popupEl: null,
    selectedIndex: 0,
    isOpen: false,
    editorRef: null,
    editorElRef: null,
    filterText: '',         // '/' 이후 입력된 필터 텍스트
    filteredCommands: [],   // 필터링된 명령 목록

    /**
     * 초기화: 팝업 DOM 생성 및 이벤트 바인딩
     */
    init(editor, editorEl) {
        this.editorRef = editor;
        this.editorElRef = editorEl;
        this.commands = SlashRegistry.getCommands();

        // 팝업 컨테이너 생성
        this.popupEl = document.createElement('div');
        this.popupEl.id = 'slashCommandPopup';
        this.popupEl.className = 'slash-popup';
        this.popupEl.style.display = 'none';
        document.body.appendChild(this.popupEl);

        // 이벤트 바인딩
        this._bindEvents();
    },

    _bindEvents() {
        // 에디터 keydown (네비게이션 가로채기)
        this.editorElRef.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            this._handleKeyDown(e);
        }, true);

        // 에디터 keyup ('/' 입력 감지)
        this.editorElRef.addEventListener('keyup', (e) => {
            if (this.isOpen) return;
            if (e.key === '/') this._tryOpenPopup();
        }, true);

        // 닫기 이벤트들
        document.addEventListener('mousedown', (e) => {
            if (this.isOpen && !this.popupEl.contains(e.target)) this.hide();
        });
        this.editorElRef.addEventListener('scroll', () => { if (this.isOpen) this.hide(); }, true);
        window.addEventListener('resize', () => { if (this.isOpen) this.hide(); });
    },

    _handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowDown': e.preventDefault(); this.navigate(1); break;
            case 'ArrowUp': e.preventDefault(); this.navigate(-1); break;
            case 'Enter':
            case 'Tab': e.preventDefault(); this.executeSelected(); break;
            case 'Escape': e.preventDefault(); this.hide(); break;
            case 'Backspace':
                if (this.filterText.length > 0) {
                    this.filterText = this.filterText.slice(0, -1);
                    this.updateFilter();
                } else {
                    this.hide();
                }
                break;
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    this.filterText += e.key;
                    this.updateFilter();
                    if (this.filteredCommands.length === 0) this.hide();
                }
                break;
        }
    },

    _tryOpenPopup() {
        if (!this.editorRef.isWysiwygMode()) return;
        if (this._shouldActivate()) {
            const rect = this._getCursorRect();
            if (rect) {
                this.filterText = '';
                this.filteredCommands = [...this.commands];
                this.show(rect);
            }
        }
    },

    _shouldActivate() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return false;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        const offset = range.startOffset;

        if (node.nodeType === Node.TEXT_NODE) {
            const textBefore = node.textContent.substring(0, offset);
            return (textBefore === '/' || textBefore.endsWith(' /') || textBefore.endsWith('\n/'));
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const childBefore = node.childNodes[offset - 1];
            const text = childBefore ? (childBefore.textContent || '') : (node.textContent || '');
            return (text === '/' || text.endsWith(' /') || text.endsWith('\n/'));
        }
        return false;
    },

    _getCursorRect() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;

        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);

        const span = document.createElement('span');
        span.textContent = '\u200b';
        range.insertNode(span);
        const rect = span.getBoundingClientRect();
        const result = { top: rect.top, left: rect.left, bottom: rect.bottom };
        span.parentNode.removeChild(span);

        sel.removeAllRanges();
        sel.addRange(range);
        return result;
    },

    show(rect) {
        this.selectedIndex = 0;
        this.isOpen = true;
        this._renderItems();

        const popupHeight = this.popupEl.offsetHeight || 280;
        const viewportH = window.innerHeight;

        this.popupEl.style.top = (rect.bottom + popupHeight > viewportH) 
            ? `${rect.top - popupHeight - 4}px` 
            : `${rect.bottom + 4}px`;
        this.popupEl.style.left = `${Math.max(8, rect.left)}px`;
        this.popupEl.style.display = 'block';
    },

    hide() {
        this.isOpen = false;
        this.popupEl.style.display = 'none';
        this.filterText = '';
    },

    updateFilter() {
        const q = this.filterText.toLowerCase();
        const isAIDisabled = document.body.classList.contains('ai-disabled');
        
        this.filteredCommands = this.commands.filter(c => {
            if (c.isAI && isAIDisabled) return false;
            return c.label.toLowerCase().includes(q) || (c.cmd && c.cmd.toLowerCase().includes(q));
        });
        this.selectedIndex = 0;
        this._renderItems();
    },

    _renderItems() {
        this.popupEl.innerHTML = this.filteredCommands.map((c, i) => `
            <div class="slash-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}">
                <span class="slash-icon">${c.icon}</span>
                <span class="slash-label">${c.label}</span>
            </div>
        `).join('');

        this.popupEl.querySelectorAll('.slash-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectedIndex = parseInt(item.dataset.index);
                this.executeSelected();
            });
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = parseInt(item.dataset.index);
                this._highlightSelected();
            });
        });
    },

    _highlightSelected() {
        this.popupEl.querySelectorAll('.slash-item').forEach((el, i) => {
            el.classList.toggle('selected', i === this.selectedIndex);
        });
        const selectedEl = this.popupEl.querySelector('.slash-item.selected');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
    },

    navigate(direction) {
        const len = this.filteredCommands.length;
        if (len === 0) return;
        this.selectedIndex = (this.selectedIndex + direction + len) % len;
        this._highlightSelected();
    },

    executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (!cmd) { this.hide(); return; }

        this._deleteSlashAndFilter();
        this.hide();

        this.editorRef.focus();
        requestAnimationFrame(() => {
            SlashRegistry.execute(this.editorRef, cmd);
        });
    },

    _deleteSlashAndFilter() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        const offset = range.startOffset;

        // '/' 문자와 필터 텍스트의 길이를 계산 (1은 '/' 자체의 길이)
        const deleteLen = 1 + (this.filterText || '').length;
        const start = offset - deleteLen;

        if (start >= 0) {
            try {
                // 삭제할 범위를 정확히 지정하여 삭제 (ToastUI 호환성 보장)
                const deleteRange = document.createRange();
                deleteRange.setStart(node, start);
                deleteRange.setEnd(node, offset);
                deleteRange.deleteContents();
                
                // 삭제 후 커서 위치 강제 복원
                range.setStart(node, start);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                console.warn('[SlashCmd] Range 삭제 실패, Fallback 실행:', e);
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = node.textContent.substring(0, start) + node.textContent.substring(offset);
                }
            }
        }
    }
};
