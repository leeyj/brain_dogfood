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
import { DrawerManager } from './js/components/DrawerManager.js';
import { ModalManager } from './js/components/ModalManager.js';
import { I18nManager } from './js/utils/I18nManager.js';
import { Constants } from './js/utils/Constants.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- 🔹 Initialization ---
    await UI.initSettings(); // ⭐ i18n 및 테마 로딩 완료까지 최우선 대기
    EditorManager.init('#editor');
    
    // 작성기 초기화 (저장 성공 시 데이터 새로고침 콜백 등록)
    ComposerManager.init(() => AppService.refreshData(updateSidebarCallback));
    
    HeatmapManager.init('heatmapContainer'); // 히트맵 초기화
    DrawerManager.init();
    Visualizer.init('graphContainer');
    UI.initSidebarToggle();
    
    // --- 🔹 Callbacks ---
    const updateSidebarCallback = (memos, activeGroup) => {
        UI.updateSidebar(memos, activeGroup, (newFilter) => {
            if (newFilter === Constants.GROUPS.FILES) {
                ModalManager.openAssetLibrary((id, ms) => UI.openMemoModal(id, ms));
            } else {
                AppService.setFilter({ group: newFilter }, updateSidebarCallback);
            }
        });
    };

    // 달력 초기화
    CalendarManager.init('calendarContainer', (date) => {
        AppService.setFilter({ date }, updateSidebarCallback);
    });

    // 무한 스크롤 초기화
    UI.initInfiniteScroll(() => {
        AppService.loadMore(updateSidebarCallback);
    });

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
                await API.deleteMemo(id);
                AppService.refreshData(updateSidebarCallback);
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

    // --- 🔹 Global Shortcuts (Comprehensive Shift to Ctrl-based System) ---
    document.addEventListener('keydown', (e) => {
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
        }
    });

    // --- 🔹 App Start ---
    AppService.refreshData(updateSidebarCallback);
});
