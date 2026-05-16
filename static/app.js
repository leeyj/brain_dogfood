/**
 * 뇌사료 메인 엔트리 포인트 (v5.0 리팩토링 완료)
 */
// --- 🎨 CSS Imports (for Vite Bundling) ---
import './lib/font-awesome/css/all.min.css';
import './lib/toastui/toastui-editor.min.css';
import './lib/toastui/toastui-editor-dark.min.css';
import './lib/toastui/tui-color-picker.min.css';
import './lib/toastui/toastui-editor-plugin-color-syntax.min.css';
import './css/components/weekly.css';
import './css/components/toast.css';
import './style.css';

import { API } from './js/api.js';
import { UI } from './js/ui.js';
import { AppService } from './js/AppService.js';
import { EditorManager } from './js/editor.js';
import { ComposerManager } from './js/components/ComposerManager.js';
import { CalendarManager } from './js/components/CalendarManager.js';
import { HeatmapManager } from './js/components/HeatmapManager.js';
import { Constants } from './js/utils/Constants.js';
import { ToastManager } from './js/components/ToastManager.js';
import { I18nManager } from './js/utils/I18nManager.js';
import { ModalManager } from './js/components/ModalManager.js';
import { DateUtils } from './js/utils/DateUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    window.PerfLogger = {
        marks: { 'HTML Head': window.PERF_START || 0, 'DOM Content Loaded': performance.now() },
        mark(label) {
            this.marks[label] = performance.now();
            const time = (this.marks[label] - this.marks['HTML Head']).toFixed(2);
            console.log(`%c[PERF] ${label}: ${time}ms`, 'color: #8b5cf6; font-weight: bold;');
        }
    };
    window.PerfLogger.mark('JS Initialization Start');

    ToastManager.init();
    UI.initSidebarToggle();
    
    // --- 🔹 Callbacks ---
    const updateSidebarCallback = (activeGroup, activeCategory) => {
        UI.updateSidebar(activeGroup, activeCategory, (newFilter) => {
            if (newFilter === Constants.GROUPS.FILES) {
                ModalManager.openAssetLibrary((id) => UI.openMemoModal(id));
            } else if (newFilter === 'weekly') {
                // 💡 "이번주 메모": group_name 매칭이 아닌 날짜 범위로 필터링
                const range = DateUtils.getWeekRange(new Date());
                const start_date = range.startStr;
                const end_date = range.endStr;
                AppService.setFilter({ group: 'all', start_date, end_date }, updateSidebarCallback);
            } else if (newFilter === 'daily') {
                // 💡 "오늘의 메모": 오늘 날짜 기반 필터링
                const today = DateUtils.getTodayStr();
                AppService.setFilter({ group: 'all', date: today }, updateSidebarCallback);
            } else {
                AppService.setFilter({ group: newFilter }, updateSidebarCallback);
            }
        }, (newCat) => {
            AppService.setFilter({ category: newCat }, updateSidebarCallback);
        });
    };

    // --- 🔹 Initialization (Parallelized for Performance) ---
    window.PerfLogger.mark('Settings API Fetch Start');
    const settingsPromise = UI.initSettings().then(data => {
        window.PerfLogger.mark('Settings API Fetch End');
        return data;
    }); 

    // 💡 전역 참조를 위해 window 객체에 할당 (상호 참조 용도)
    window.HeatmapManager = HeatmapManager;
    window.AppService = AppService;

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
    
    // 나머지 부가 기능 모듈들은 백그라운드에서 동적 로드
    const loadSecondaryModules = async () => {
        const [{ DrawerManager }, { CategoryManager }, { BackupManager }, { Visualizer }, { VersionManager }, { helpModal }] = await Promise.all([
            import('./js/components/DrawerManager.js'),
            import('./js/components/CategoryManager.js'),
            import('./js/components/BackupManager.js'),
            import('./js/components/Visualizer.js'),
            import('./js/components/VersionManager.js'),
            import('./js/components/modals/HelpModal.js')
        ]);

        DrawerManager.init();
        CategoryManager.init(onSaveSuccess);
        BackupManager.init();
        Visualizer.init('graphContainer');
        helpModal.init();
        VersionManager.init();
    };
    loadSecondaryModules();

    // 드래그 앤 드롭 파일 탐지
    EditorManager.bindDropEvent('.composer-wrapper', (shouldOpen) => {
        if (shouldOpen && ComposerManager.DOM.composer.style.display === 'none') {
            ComposerManager.openEmpty();
        }
    });

    // --- 🔹 모듈화된 이벤트 핸들러 초기화 ---
    const initEventHandlers = async () => {
        const [{ ShortcutManager }, { MemoActionHandler }, { UIEventBinder }] = await Promise.all([
            import('./js/events/ShortcutManager.js'),
            import('./js/events/MemoActionHandler.js'),
            import('./js/events/UIEventBinder.js')
        ]);
        ShortcutManager.init(updateSidebarCallback);
        MemoActionHandler.init(updateSidebarCallback);
        UIEventBinder.init(updateSidebarCallback);
    };
    initEventHandlers();
    
    UI.initResizeHandler(updateSidebarCallback); // 📱 반응형 레이아웃 초기화

    // --- 🔹 App Start ---
    settingsPromise.then(async () => {
        window.PerfLogger.mark('Component Rendering Start');
        
        const [{ WeeklyManager }, { SessionManager }, { VisualLinker }] = await Promise.all([
            import('./js/components/WeeklyManager.js'),
            import('./js/components/SessionManager.js'),
            import('./js/components/VisualLinker.js')
        ]);
        window.WeeklyManager = WeeklyManager;

        CalendarManager.init('calendarContainer', (date) => {
            AppService.setFilter({ date }, updateSidebarCallback);
        });
        WeeklyManager.init('weeklyContainer', updateSidebarCallback);

        window.PerfLogger.mark('Initial Data Fetch Start');
        await AppService.refreshData(updateSidebarCallback);
        
        VisualLinker.init(); // 💡 연결 도구 초기화
        SessionManager.init(); // ⏱️ 세션 타이머 초기화

        // 🚀 첫 데이터 로드 후에만 무한 스크롤 감시 시작 (중복 요청 방지)
        UI.initInfiniteScroll(() => {
            AppService.loadMore(updateSidebarCallback);
        });
    });


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
