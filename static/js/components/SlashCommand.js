import { I18nManager } from '../utils/I18nManager.js';

export const SlashCommand = {
    // 사용 가능한 명령 목록
    commands: [
        { icon: '☑️', label: I18nManager.t('slash.task'),   cmd: 'taskList' },
        { icon: '•',  label: I18nManager.t('slash.bullet'), cmd: 'bulletList' },
        { icon: '1.', label: I18nManager.t('slash.number'), cmd: 'orderedList' },
        { icon: '❝',  label: I18nManager.t('slash.quote'),  cmd: 'blockQuote' },
        { icon: '—',  label: I18nManager.t('slash.line'),   cmd: 'thematicBreak' },
        { icon: '{}', label: I18nManager.t('slash.code'),   cmd: 'codeBlock' },
        { icon: 'H1', label: I18nManager.t('slash.h1'),     cmd: 'heading', payload: { level: 1 } },
        { icon: 'H2', label: I18nManager.t('slash.h2'),     cmd: 'heading', payload: { level: 2 } },
        { icon: 'H3', label: I18nManager.t('slash.h3'),     cmd: 'heading', payload: { level: 3 } },
        { icon: '🪄', label: I18nManager.t('slash.ai_summary'), cmd: 'ai-summary', isAI: true },
        { icon: '🏷️', label: I18nManager.t('slash.ai_tags'), cmd: 'ai-tags', isAI: true },
    ],

    popupEl: null,
    selectedIndex: 0,
    isOpen: false,
    editorRef: null,
    editorElRef: null,
    filterText: '',       // '/' 이후 입력된 필터 텍스트
    filteredCommands: [], // 필터링된 명령 목록

    /**
     * 초기화: 팝업 DOM 생성 및 이벤트 바인딩
     */
    init(editor, editorEl) {
        this.editorRef = editor;
        this.editorElRef = editorEl;
        console.log('[SlashCmd] init 호출됨, editor:', !!editor, 'editorEl:', !!editorEl);

        // 팝업 컨테이너 생성
        this.popupEl = document.createElement('div');
        this.popupEl.id = 'slashCommandPopup';
        this.popupEl.className = 'slash-popup';
        this.popupEl.style.display = 'none';
        document.body.appendChild(this.popupEl);

        // 에디터 keydown 이벤트 (팝업 열린 상태에서 네비게이션 가로채기)
        editorEl.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation();
                    this.navigate(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation();
                    this.navigate(-1);
                    break;
                case 'Enter':
                case 'Tab':
                    e.preventDefault();
                    e.stopPropagation();
                    this.executeSelected();
                    break;
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    this.hide();
                    break;
                case 'Backspace':
                    // 필터 텍스트 삭제, '/'까지 지우면 팝업 닫기
                    if (this.filterText.length > 0) {
                        this.filterText = this.filterText.slice(0, -1);
                        this.updateFilter();
                    } else {
                        // '/' 자체를 지우는 경우 → 팝업 닫기
                        this.hide();
                    }
                    break;
                default:
                    // 일반 문자 입력 시 필터링 적용
                    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                        this.filterText += e.key;
                        this.updateFilter();
                        // 필터 결과가 없으면 팝업 닫기
                        if (this.filteredCommands.length === 0) {
                            this.hide();
                        }
                    }
                    break;
            }
        }, true); // capture 단계

        // 에디터 keyup 이벤트 ('/' 입력 감지)
        editorEl.addEventListener('keyup', (e) => {
            console.log('[SlashCmd] keyup:', e.key, 'isOpen:', this.isOpen);
            if (this.isOpen) return; // 이미 열려있으면 무시

            if (e.key === '/') {
                console.log('[SlashCmd] / 감지, WYSIWYG:', this.editorRef.isWysiwygMode());
                // WYSIWYG 모드에서만 동작
                if (!this.editorRef.isWysiwygMode()) return;

                // 줄 시작이거나 공백 뒤에서만 팝업 활성화
                const shouldActivate = this._shouldActivate();
                console.log('[SlashCmd] shouldActivate:', shouldActivate);
                if (shouldActivate) {
                    const rect = this._getCursorRect();
                    console.log('[SlashCmd] cursorRect:', rect);
                    if (rect) {
                        this.filterText = '';
                        this.filteredCommands = [...this.commands];
                        this.show(rect);
                    }
                }
            }
        }, true);

        // 에디터 외부 클릭 시 팝업 닫기
        document.addEventListener('mousedown', (e) => {
            if (this.isOpen && !this.popupEl.contains(e.target)) {
                this.hide();
            }
        });

        // 에디터 스크롤/리사이즈 시 팝업 닫기
        editorEl.addEventListener('scroll', () => { if (this.isOpen) this.hide(); }, true);
        window.addEventListener('resize', () => { if (this.isOpen) this.hide(); });
    },

    /**
     * '/' 입력이 유효한 위치인지 판별
     * (줄 시작 또는 공백/빈 줄 뒤)
     */
    _shouldActivate() {
        const sel = window.getSelection();
        console.log('[SlashCmd] _shouldActivate - sel:', !!sel, 'rangeCount:', sel?.rangeCount);
        if (!sel || sel.rangeCount === 0) return false;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        const offset = range.startOffset;
        console.log('[SlashCmd] node type:', node.nodeType, 'offset:', offset, 'nodeName:', node.nodeName);

        // Case 1: 텍스트 노드 내부에 커서가 있는 경우
        if (node.nodeType === Node.TEXT_NODE) {
            const textBefore = node.textContent.substring(0, offset);
            console.log('[SlashCmd] TEXT_NODE textBefore:', JSON.stringify(textBefore));
            if (textBefore === '/' || textBefore.endsWith(' /') || textBefore.endsWith('\n/')) {
                return true;
            }
        }

        // Case 2: 요소 노드 내부에 커서가 있는 경우 (WYSIWYG contenteditable)
        if (node.nodeType === Node.ELEMENT_NODE) {
            // offset 위치의 바로 앞 자식 노드 확인
            const childBefore = node.childNodes[offset - 1];
            console.log('[SlashCmd] ELEMENT_NODE childBefore:', childBefore?.nodeType, 'text:', JSON.stringify(childBefore?.textContent));
            
            if (childBefore) {
                const text = childBefore.textContent || '';
                if (text === '/' || text.endsWith(' /') || text.endsWith('\n/')) {
                    return true;
                }
            }

            // 현재 요소의 전체 텍스트에서 마지막 문자 확인 (fallback)
            const fullText = node.textContent || '';
            console.log('[SlashCmd] ELEMENT_NODE fullText:', JSON.stringify(fullText));
            if (fullText === '/' || fullText.endsWith(' /') || fullText.endsWith('\n/')) {
                return true;
            }
        }

        console.log('[SlashCmd] shouldActivate → false (조건 불충족)');
        return false;
    },

    /**
     * 현재 커서의 화면 좌표(px) 반환
     */
    _getCursorRect() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;

        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);

        // 빈 영역에서도 좌표를 얻기 위해 임시 span 삽입
        const span = document.createElement('span');
        span.textContent = '\u200b'; // zero-width space
        range.insertNode(span);
        const rect = span.getBoundingClientRect();
        const result = { top: rect.top, left: rect.left, bottom: rect.bottom };
        span.parentNode.removeChild(span);

        // Selection 복원
        sel.removeAllRanges();
        sel.addRange(range);

        return result;
    },

    /**
     * 팝업 표시
     */
    show(rect) {
        this.selectedIndex = 0;
        this.isOpen = true;
        this._renderItems();

        // 팝업 위치 계산 (커서 바로 아래)
        const popupHeight = this.popupEl.offsetHeight || 280;
        const viewportH = window.innerHeight;

        // 화면 아래 공간이 부족하면 위에 표시
        if (rect.bottom + popupHeight > viewportH) {
            this.popupEl.style.top = `${rect.top - popupHeight - 4}px`;
        } else {
            this.popupEl.style.top = `${rect.bottom + 4}px`;
        }
        this.popupEl.style.left = `${Math.max(8, rect.left)}px`;
        this.popupEl.style.display = 'block';
    },

    /**
     * 팝업 숨기기
     */
    hide() {
        this.isOpen = false;
        this.popupEl.style.display = 'none';
        this.filterText = '';
    },

    /**
     * 필터링 업데이트
     */
    updateFilter() {
        const q = this.filterText.toLowerCase();
        const isAIDisabled = document.body.classList.contains('ai-disabled');
        
        this.filteredCommands = this.commands.filter(c => {
            if (c.isAI && isAIDisabled) return false;
            return c.label.toLowerCase().includes(q) || c.cmd.toLowerCase().includes(q);
        });
        this.selectedIndex = 0;
        this._renderItems();
    },

    /**
     * 팝업 내 항목 DOM 렌더링
     */
    _renderItems() {
        this.popupEl.innerHTML = this.filteredCommands.map((c, i) => `
            <div class="slash-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}">
                <span class="slash-icon">${c.icon}</span>
                <span class="slash-label">${c.label}</span>
            </div>
        `).join('');

        // 마우스 클릭 이벤트
        this.popupEl.querySelectorAll('.slash-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // 에디터 포커스 유지
                this.selectedIndex = parseInt(item.dataset.index);
                this.executeSelected();
            });
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = parseInt(item.dataset.index);
                this._highlightSelected();
            });
        });
    },

    /**
     * 선택 항목 하이라이트 갱신
     */
    _highlightSelected() {
        this.popupEl.querySelectorAll('.slash-item').forEach((el, i) => {
            el.classList.toggle('selected', i === this.selectedIndex);
        });

        // 선택된 항목이 보이도록 스크롤
        const selectedEl = this.popupEl.querySelector('.slash-item.selected');
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest' });
        }
    },

    /**
     * ↑↓ 네비게이션
     */
    navigate(direction) {
        const len = this.filteredCommands.length;
        if (len === 0) return;
        this.selectedIndex = (this.selectedIndex + direction + len) % len;
        this._highlightSelected();
    },

    /**
     * 선택된 명령 실행
     */
    executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (!cmd) { this.hide(); return; }

        // 1. '/' + 필터 텍스트를 에디터에서 삭제
        this._deleteSlashAndFilter();

        // 2. 팝업 닫기
        this.hide();

        // 3. 에디터 포커스 유지 후 명령 실행
        this.editorRef.focus();
        
        // 짧은 딜레이 후 명령 실행 (DOM 반영 대기)
        requestAnimationFrame(() => {
            if (cmd.payload) {
                this.editorRef.exec(cmd.cmd, cmd.payload);
            } else {
                this.editorRef.exec(cmd.cmd);
            }
        });
    },

    /**
     * '/' 문자와 필터 텍스트를 에디터 본문에서 삭제
     */
    _deleteSlashAndFilter() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE) {
            const offset = range.startOffset;
            const deleteLen = 1 + this.filterText.length; // '/' + filter
            const start = offset - deleteLen;

            if (start >= 0) {
                // 텍스트 노드에서 직접 삭제
                node.textContent = node.textContent.substring(0, start) + node.textContent.substring(offset);

                // 커서를 삭제 위치로 복원
                const newRange = document.createRange();
                newRange.setStart(node, start);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
            }
        }
    }
};
