import { API } from './api.js';
import { UI } from './ui.js';
import { CalendarManager } from './components/CalendarManager.js';
import { HeatmapManager } from './components/HeatmapManager.js';
import { WeeklyManager } from './components/WeeklyManager.js';
import { RelationManager } from './components/RelationManager.js';
import { AppState } from './AppState.js';

export const FilterService = {
    async refreshData(onUpdateSidebar) {
        AppState.offset = 0;
        AppState.hasMore = true;
        AppState.isLoading = false;
        AppState.autoLoadCount = 0;
        
        RelationManager.clearFocus();

        if (HeatmapManager && HeatmapManager.refresh) {
            HeatmapManager.refresh();
        }

        await this.loadMore(onUpdateSidebar, false);
    },

    async loadMore(onUpdateSidebar, isAppend = true) {
        if (AppState.isLoading || !AppState.hasMore) return;
        
        AppState.isLoading = true;
        
        try {
            const filters = {
                group: AppState.currentFilterGroup,
                category: AppState.currentFilterCategory,
                date: AppState.currentFilterDate,
                start_date: AppState.currentStartDate,
                end_date: AppState.currentEndDate,
                query: AppState.currentSearchQuery,
                offset: AppState.offset,
                limit: AppState.limit
            };

            const newMemos = await API.fetchMemos(filters);
            
            if (newMemos.length < AppState.limit) {
                AppState.hasMore = false;
            }

            AppState.offset += newMemos.length;
            
            if (!isAppend) AppState.allMemos = newMemos;
            else AppState.allMemos = [...AppState.allMemos, ...newMemos];

            if (onUpdateSidebar) {
                onUpdateSidebar(AppState.currentFilterGroup, AppState.currentFilterCategory);
            }
            
            UI.setHasMore(AppState.hasMore);
            UI.renderMemos(newMemos, {}, AppState.eventHandlers, isAppend);
            
            if (AppState.hasMore && AppState.autoLoadCount < 3) {
                setTimeout(() => {
                    if (UI.isSentinelVisible()) {
                        console.log(`[FilterService] Auto-loading (${AppState.autoLoadCount + 1}/3)...`);
                        AppState.autoLoadCount++;
                        this.loadMore(onUpdateSidebar, true);
                    }
                }, 300);
            } else if (!UI.isSentinelVisible()) {
                AppState.autoLoadCount = 0;
            }

        } catch (err) {
            console.error('[FilterService] loadMore failed:', err);
        } finally {
            AppState.isLoading = false;
        }
    },

    async setFilter({ group, category, date, start_date, end_date, query }, onUpdateSidebar) {
        let changed = false;
        
        if (group !== undefined) {
            AppState.currentFilterGroup = group;
            AppState.currentFilterCategory = null; 
            AppState.currentFilterDate = null;
            AppState.currentStartDate = null;
            AppState.currentEndDate = null;
            changed = true;
            
            if (CalendarManager && CalendarManager.setSelectedDate) CalendarManager.setSelectedDate(null);
            if (typeof WeeklyManager !== 'undefined' && WeeklyManager.render) WeeklyManager.render();
        }

        if (category !== undefined) {
            if (AppState.currentFilterCategory === category) {
                AppState.currentFilterCategory = null;
            } else {
                AppState.currentFilterCategory = category;
            }
            AppState.currentFilterGroup = 'all';
            changed = true;
        }

        if (date !== undefined && AppState.currentFilterDate !== date) {
            AppState.currentFilterDate = date;
            AppState.currentStartDate = null;
            AppState.currentEndDate = null;
            changed = true;
            
            CalendarManager.setSelectedDate(date);
            if (HeatmapManager.setSelectedDate) {
                HeatmapManager.setSelectedDate(date);
            }
        }

        if (start_date !== undefined && end_date !== undefined) {
            if (AppState.currentStartDate !== start_date || AppState.currentEndDate !== end_date) {
                AppState.currentStartDate = start_date;
                AppState.currentEndDate = end_date;
                AppState.currentFilterDate = null;
                changed = true;
            }
        }

        if (query !== undefined && AppState.currentSearchQuery !== query) {
            AppState.currentSearchQuery = query;
            changed = true;
        }

        if (changed) {
            await this.refreshData(onUpdateSidebar);
        }
    }
};
