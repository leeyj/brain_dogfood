import { AppService } from '../AppService.js';
import { UI } from '../ui.js';
import { Visualizer } from '../components/Visualizer.js';
import { DrawerManager } from '../components/DrawerManager.js';
import { CategoryManager } from '../components/CategoryManager.js';

export const UIEventBinder = {
    async init(updateSidebarCallback) {
        // --- 🔹 Search & Graph ---
        const searchInput = document.getElementById('sb_query_v5');
        let searchTimer;
        if (searchInput) {
            searchInput.oninput = () => {
                const val = searchInput.value.trim();
                // 💡 커맨드 트릭: ? 입력 시 도움말 모달 띄우기
                if (val === '?') {
                    searchInput.value = ''; // 입력창 비우기
                    document.getElementById('shortcutModal').classList.add('active');
                    return;
                }
                
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    AppService.setFilter({ query: val }, updateSidebarCallback);
                }, 300);
            };
        }

        // (helpBtn 로직은 SidebarFooter에서 처리됨)

        const openGraphBtn = document.getElementById('openGraphBtn');
        if (openGraphBtn) {
            openGraphBtn.onclick = () => {
                const graphModal = document.getElementById('graphModal');
                if (graphModal) graphModal.classList.add('active');
                setTimeout(() => {
                    Visualizer.render((id) => {
                        const gm = document.getElementById('graphModal');
                        if (gm) gm.classList.remove('active');
                        UI.openMemoModal(id);
                    });
                }, 150);
            };
        }

        const closeGraphBtn = document.getElementById('closeGraphBtn');
        if (closeGraphBtn) {
            closeGraphBtn.onclick = () => {
                const graphModal = document.getElementById('graphModal');
                if (graphModal) graphModal.classList.remove('active');
            };
        }

        const openExplorerBtn = document.getElementById('openExplorerBtn');
        if (openExplorerBtn) {
            openExplorerBtn.onclick = () => {
                DrawerManager.open(AppService.state.currentFilterGroup, (filter) => {
                    AppService.setFilter({ group: filter }, updateSidebarCallback);
                });
            };
        }

        // --- 🔹 Category Management ---
        const manageCategoryBtn = document.getElementById('manageCategoryBtn');
        if (manageCategoryBtn) {
            manageCategoryBtn.onclick = () => {
                CategoryManager.open();
            };
        }

        // --- 🧪 실험실(Labs) 메뉴 이벤트 ---
        const openLabBtn = document.getElementById('openLabBtn');
        if (openLabBtn) {
            openLabBtn.onclick = () => {
                window.open(`/lab?group=${AppService.state.currentFilterGroup || 'all'}`, '_blank');
            };
        }

        // --- 🔲 레이아웃 전환 이벤트 ---
        const viewGridBtn = document.getElementById('viewGridBtn');
        const viewListBtn = document.getElementById('viewListBtn');
        
        if (viewGridBtn && viewListBtn) {
            const { LayoutManager } = await import('../components/LayoutManager.js');
            
            viewGridBtn.onclick = () => {
                viewGridBtn.classList.add('active');
                viewListBtn.classList.remove('active');
                LayoutManager.switchLayout('masonry');
            };
            
            viewListBtn.onclick = () => {
                viewListBtn.classList.add('active');
                viewGridBtn.classList.remove('active');
                LayoutManager.switchLayout('list');
            };
        }

        const toggleWeeklyBtn = document.getElementById('toggleWeeklyBtn');
        if (toggleWeeklyBtn) {
            const { WeeklyManager } = await import('../components/WeeklyManager.js');
            toggleWeeklyBtn.onclick = () => {
                WeeklyManager.toggle();
            };
        }
    }
};
