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
import { WeeklyManager } from './js/components/WeeklyManager.js';
import { I18nManager } from './js/utils/I18nManager.js';
import { Constants } from './js/utils/Constants.js';
import { SessionManager } from './js/components/SessionManager.js';


import { ShortcutManager } from './js/events/ShortcutManager.js';
import { MemoActionHandler } from './js/events/MemoActionHandler.js';
import { UIEventBinder } from './js/events/UIEventBinder.js';
import { helpModal } from './js/components/modals/HelpModal.js';

document.addEventListener('DOMContentLoaded', async () => {
    UI.initSidebarToggle();
    
    // --- 🔹 Callbacks ---
    const updateSidebarCallback = (activeGroup, activeCategory) => {
        UI.updateSidebar(activeGroup, activeCategory, (newFilter) => {
            if (newFilter === Constants.GROUPS.FILES) {
                ModalManager.openAssetLibrary((id) => UI.openMemoModal(id));
            } else if (newFilter === 'weekly') {
                // 💡 "이번주 메모": group_name 매칭이 아닌 날짜 범위로 필터링
                const week = WeeklyManager.getCurrentWeek(new Date());
                const start_date = WeeklyManager.formatDate(week[0]);
                const end_date = WeeklyManager.formatDate(week[6]);
                AppService.setFilter({ group: 'all', start_date, end_date }, updateSidebarCallback);
            } else if (newFilter === 'daily') {
                // 💡 "오늘의 메모": 오늘 날짜 기반 필터링
                const today = WeeklyManager.formatDate(new Date());
                AppService.setFilter({ group: 'all', date: today }, updateSidebarCallback);
            } else {
                AppService.setFilter({ group: newFilter }, updateSidebarCallback);
            }
        }, (newCat) => {
            AppService.setFilter({ category: newCat }, updateSidebarCallback);
        });
    };

    // --- 🔹 Initialization (After callbacks are defined) ---
    await UI.initSettings(); 

    // 💡 전역 참조를 위해 window 객체에 할당 (상호 참조 용도)
    window.HeatmapManager = HeatmapManager;
    window.WeeklyManager = WeeklyManager;
    window.AppService = AppService;

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
    
    // 히트맵 초기화 및 데이터 로드
    HeatmapManager.init('heatmapContainer', (date) => {
        AppService.setFilter({ date }, updateSidebarCallback);
    });
    
    // 📊 히트맵 데이터 로드 후 주간 달력 도트 업데이트를 위해 리프레시 호출
    HeatmapManager.refresh().then(() => {
        if (WeeklyManager.isVisible) WeeklyManager.render();
    });
    
    DrawerManager.init();
    CategoryManager.init(onSaveSuccess);
    WeeklyManager.init('weeklyContainer', updateSidebarCallback);
    Visualizer.init('graphContainer');

    // 드래그 앤 드롭 파일 탐지
    EditorManager.bindDropEvent('.composer-wrapper', (shouldOpen) => {
        if (shouldOpen && ComposerManager.DOM.composer.style.display === 'none') {
            ComposerManager.openEmpty();
        }
    });

    // --- 🔹 모듈화된 이벤트 핸들러 초기화 ---
    ShortcutManager.init(updateSidebarCallback);
    MemoActionHandler.init(updateSidebarCallback);
    UIEventBinder.init(updateSidebarCallback);
    helpModal.init();
    UI.initResizeHandler(updateSidebarCallback); // 📱 반응형 레이아웃 초기화

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
