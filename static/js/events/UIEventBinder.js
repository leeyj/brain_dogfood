import { AppService } from '../AppService.js';
import { UI } from '../ui.js';
import { Visualizer } from '../components/Visualizer.js';
import { DrawerManager } from '../components/DrawerManager.js';
import { CategoryManager } from '../components/CategoryManager.js';

export const UIEventBinder = {
    init(updateSidebarCallback) {
        // --- 🔹 Search & Graph ---
        const searchInput = document.getElementById('searchInput');
        let searchTimer;
        if (searchInput) {
            searchInput.oninput = () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    AppService.setFilter({ query: searchInput.value }, updateSidebarCallback);
                }, 300);
            };
        }

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
    }
};
