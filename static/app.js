/**
 * 뇌사료 메인 엔트리 포인트 (v5.0 리팩토링 완료)
 */
import { API } from './js/api.js';
import { UI } from './js/ui.js';
import { AppService } from './js/AppService.js';
import { EditorManager } from './js/editor.js';
import { ComposerManager } from './js/components/ComposerManager.js';
import { CalendarManager } from './js/components/CalendarManager.js';
import { Visualizer } from './js/components/Visualizer.js';
import { HeatmapManager } from './js/components/HeatmapManager.js';
import { ThemeManager } from './js/components/ThemeManager.js';
import { VisualLinker } from './js/components/VisualLinker.js';
import { DrawerManager } from './js/components/DrawerManager.js';
import { CategoryManager } from './js/components/CategoryManager.js';
import { ModalManager } from './js/components/ModalManager.js';
import { I18nManager } from './js/utils/I18nManager.js';
import { Constants } from './js/utils/Constants.js';
import { SessionManager } from './js/components/SessionManager.js';


document.addEventListener('DOMContentLoaded', async () => {
    UI.initSidebarToggle();
    
    // --- 🔹 Callbacks ---
    const updateSidebarCallback = (memos, activeGroup, activeCategory) => {
        UI.updateSidebar(memos, activeGroup, activeCategory, (newFilter) => {
            if (newFilter === Constants.GROUPS.FILES) {
                ModalManager.openAssetLibrary((id, ms) => UI.openMemoModal(id, ms));
            } else {
                AppService.setFilter({ group: newFilter }, updateSidebarCallback);
            }
        }, (newCat) => {
            AppService.setFilter({ category: newCat }, updateSidebarCallback);
        });
    };

    // --- 🔹 Initialization (After callbacks are defined) ---
    await UI.initSettings(); 

    // 달력 초기화 (I18n 로드 후 처리)
    CalendarManager.init('calendarContainer', (date) => {
        AppService.setFilter({ date }, updateSidebarCallback);
    });

    // 무한 스크롤 초기화
    UI.initInfiniteScroll(() => {
        AppService.loadMore(updateSidebarCallback);
    });

    // 작성기 콜백
    const onSaveSuccess = () => AppService.refreshData(updateSidebarCallback);

    // 에디터 초기화 (Ctrl+Enter 연동)
    EditorManager.init('#editor', () => {
        if (ComposerManager.DOM.composer.style.display === 'block') {
            ComposerManager.handleSave(onSaveSuccess);
        }
    });
    
    // 작성기 초기화
    ComposerManager.init(onSaveSuccess);
    
    // 히트맵 초기화
    HeatmapManager.init('heatmapContainer', (date) => {
        AppService.setFilter({ date }, updateSidebarCallback);
    });
    
    DrawerManager.init();
    CategoryManager.init(onSaveSuccess);
    Visualizer.init('graphContainer');

    // 드래그 앤 드롭 파일 탐지
    EditorManager.bindDropEvent('.composer-wrapper', (shouldOpen) => {
        if (shouldOpen && ComposerManager.DOM.composer.style.display === 'none') {
            ComposerManager.openEmpty();
        }
    });

    // --- 🔹 Global Event Handlers for Memo Cards ---
    window.memoEventHandlers = {
        onEdit: (id) => {
            const memo = AppService.state.memosCache.find(m => m.id == id);
            ComposerManager.openForEdit(memo);
        },
        onDelete: async (id) => {
            if (confirm(I18nManager.t('msg_delete_confirm'))) {
                try {
                    await API.deleteMemo(id);
                    AppService.refreshData(updateSidebarCallback);
                } catch (err) {
                    alert(err.message);
                }
            }
        },
        onAI: async (id) => {
            UI.showLoading(true);
            try {
                await API.triggerAI(id);
                await AppService.refreshData(updateSidebarCallback);
            } catch (err) { alert(err.message); }
            finally { UI.showLoading(false); }
        },
        onTogglePin: async (id) => {
            const memo = AppService.state.memosCache.find(m => m.id == id);
            await API.saveMemo({ is_pinned: !memo.is_pinned }, id);
            AppService.refreshData(updateSidebarCallback);
        },
        onToggleStatus: async (id) => {
            const memo = AppService.state.memosCache.find(m => m.id == id);
            const newStatus = memo.status === 'done' ? 'active' : 'done';
            await API.saveMemo({ status: newStatus }, id);
            AppService.refreshData(updateSidebarCallback);
        },
        onOpenModal: (id) => UI.openMemoModal(id, AppService.state.memosCache),
        onUnlock: async (id) => {
            const password = prompt(I18nManager.t('prompt_password'));
            if (!password) return;
            try {
                const data = await API.decryptMemo(id, password);
                const memo = AppService.state.memosCache.find(m => m.id == id);
                if (memo) {
                    memo.content = data.content;
                    memo.is_encrypted = false;
                    memo.was_encrypted = true;
                    memo.tempPassword = password;
                    // 검색 필터 적용 (현재 데이터 기준)
                    UI.renderMemos(AppService.state.memosCache, {}, window.memoEventHandlers, false);
                }
            } catch (err) { alert(err.message); }
        }
    };

    // --- 🔹 Search & Graph ---
    const searchInput = document.getElementById('searchInput');
    let searchTimer;
    searchInput.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            AppService.setFilter({ query: searchInput.value }, updateSidebarCallback);
        }, 300);
    };

    document.getElementById('openGraphBtn').onclick = () => {
        document.getElementById('graphModal').classList.add('active');
        setTimeout(() => {
            Visualizer.render(AppService.state.memosCache, (id) => {
                document.getElementById('graphModal').classList.remove('active');
                UI.openMemoModal(id, AppService.state.memosCache);
            });
        }, 150);
    };

    document.getElementById('closeGraphBtn').onclick = () => {
        document.getElementById('graphModal').classList.remove('active');
    };

    document.getElementById('openExplorerBtn').onclick = () => {
        DrawerManager.open(AppService.state.memosCache, AppService.state.currentFilterGroup, (filter) => {
            AppService.setFilter({ group: filter }, updateSidebarCallback);
        });
    };

    // --- 🔹 Category Management ---
    document.getElementById('manageCategoryBtn').onclick = () => {
        CategoryManager.open();
    };

    // --- 🔹 Global Shortcuts (Comprehensive Shift to Ctrl-based System) ---

    // --- 🔹 Global Shortcuts (Comprehensive Shift to Ctrl-based System) ---
    document.addEventListener('keydown', (e) => {
        if (!e.key) return;
        const isCtrl = e.ctrlKey || e.metaKey;
        const isAlt = e.altKey;
        const key = e.key.toLowerCase();

        // 1. ESC: 모든 창 닫기
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active, .drawer.active').forEach(el => el.classList.remove('active'));
            if (ComposerManager.DOM.composer.style.display === 'block') ComposerManager.close();
            return;
        }

        // 2. Ctrl + Enter / Ctrl + S: 저장 (작성기 열려있을 때)
        if (isCtrl && (key === 'enter' || key === 's')) {
            if (ComposerManager.DOM.composer.style.display === 'block') {
                e.preventDefault();
                ComposerManager.handleSave(updateSidebarCallback);
            }
            return;
        }

        // 3. Ctrl + Shift + Key 조합들 (네비게이션)
        if (isCtrl && e.shiftKey) {
            e.preventDefault();
            switch (key) {
                case 'n': // 새 메모
                    ComposerManager.openEmpty();
                    break;
                case 'g': // 지식 네뷸라
                    document.getElementById('openGraphBtn').click();
                    break;
                case 'e': // 지식 탐색기
                    document.getElementById('openExplorerBtn').click();
                    break;
                case 'c': // 캘린더 토글
                    CalendarManager.isCollapsed = !CalendarManager.isCollapsed;
                    localStorage.setItem('calendar_collapsed', CalendarManager.isCollapsed);
                    CalendarManager.updateCollapseUI();
                    break;
                case 'q': // 닫기
                    document.querySelectorAll('.modal.active, .drawer.active').forEach(el => el.classList.remove('active'));
                    ComposerManager.close();
                    break;
            }
        }

        // 4. Quake-style Shortcut: Alt + ` (새 메모)
        if (isAlt && key === '`') {
            e.preventDefault();
            ComposerManager.openEmpty();
            return;
        }

        // 5. Category Slots: Alt + 1~4
        if (isAlt && (key >= '1' && key <= '4')) {
            if (ComposerManager.DOM.composer.style.display === 'block') {
                e.preventDefault();
                const slotIndex = parseInt(key) - 1; // 1->0 (Done), 2->1 (Cat1)...
                ComposerManager.toggleCategoryBySlot(slotIndex);
            }
        }

        // 6. 'e': 즉시 수정 (마우스 오버 상태일 때)
        if (key === 'e' && !isCtrl && !isAlt && !e.shiftKey) {
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                            document.activeElement.isContentEditable;
            if (!isInput && window.hoveredMemoId) {
                e.preventDefault();
                window.memoEventHandlers.onEdit(window.hoveredMemoId);
            }
        }
    });

    // --- 🔹 App Start ---
    AppService.refreshData(updateSidebarCallback);
    VisualLinker.init(); // 💡 연결 도구 초기화
    SessionManager.init(); // ⏱️ 세션 타이머 초기화 (종료/EXIT)


    // 💡 전역 취소 리스너 (시각적 연결용)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && VisualLinker.state.isActive) {
            VisualLinker.cancel();
        }
    });
    window.addEventListener('contextmenu', (e) => {
        if (VisualLinker.state.isActive) {
            e.preventDefault();
            VisualLinker.cancel();
        }
    });

    // 💡 전역 클릭 슈퍼 디버깅 (어디가 클릭되는지 추적)
});
