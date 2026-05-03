import { AppState } from './AppState.js';
import { FilterService } from './FilterService.js';
import { SessionHeartbeat } from './utils/SessionHeartbeat.js';

export const AppService = {
    get state() {
        return AppState;
    },
    
    async refreshData(onUpdateSidebar) {
        return FilterService.refreshData(onUpdateSidebar);
    },

    async loadMore(onUpdateSidebar, isAppend = true) {
        return FilterService.loadMore(onUpdateSidebar, isAppend);
    },

    async setFilter(params, onUpdateSidebar) {
        return FilterService.setFilter(params, onUpdateSidebar);
    },

    startSessionHeartbeat() {
        SessionHeartbeat.start();
    }
};
