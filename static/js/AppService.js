/**
 * 앱의 전역 상태 및 데이터 관리 엔진 (State Management & Core Services)
 */
import { API } from './api.js';
import { UI } from './ui.js';
import { CalendarManager } from './components/CalendarManager.js';
import { HeatmapManager } from './components/HeatmapManager.js';

export const AppService = {
    state: {
        memosCache: [],
        currentFilterGroup: 'all',
        currentFilterDate: null,
        currentSearchQuery: '',
        offset: 0,
        limit: 20,
        hasMore: true,
        isLoading: false
    },

    /**
     * 필터 상태 초기화 및 데이터 첫 페이지 로딩
     */
    async refreshData(onUpdateSidebar) {
        this.state.offset = 0;
        this.state.memosCache = [];
        this.state.hasMore = true;
        this.state.isLoading = false;
        
        // 히트맵 데이터 새로고침
        if (HeatmapManager && HeatmapManager.refresh) {
            HeatmapManager.refresh();
        }

        await this.loadMore(onUpdateSidebar, false);
    },

    /**
     * 다음 페이지 데이터를 가져와 병합
     */
    async loadMore(onUpdateSidebar, isAppend = true) {
        if (this.state.isLoading || !this.state.hasMore) return;
        
        this.state.isLoading = true;
        // UI.showLoading(true)는 호출부에서 관리하거나 여기서 직접 호출 가능
        
        try {
            const filters = {
                group: this.state.currentFilterGroup,
                date: this.state.currentFilterDate,
                query: this.state.currentSearchQuery,
                offset: this.state.offset,
                limit: this.state.limit
            };

            const newMemos = await API.fetchMemos(filters);
            
            if (newMemos.length < this.state.limit) {
                this.state.hasMore = false;
            }

            if (isAppend) {
                this.state.memosCache = [...this.state.memosCache, ...newMemos];
            } else {
                this.state.memosCache = newMemos;
            }
            window.allMemosCache = this.state.memosCache;

            this.state.offset += newMemos.length;

            // 캘린더 점 표시는 첫 로드 시에면 하면 부족할 수 있으므로, 
            // 필요 시 전체 데이터를 새로 고침하는 별도 API가 필요할 수 있음. 
            // 여기서는 현재 캐시된 데이터 기반으로 업데이트.
            CalendarManager.updateMemoDates(this.state.memosCache);
            
            if (onUpdateSidebar) {
                onUpdateSidebar(this.state.memosCache, this.state.currentFilterGroup);
            }
            
            UI.setHasMore(this.state.hasMore);
            UI.renderMemos(newMemos, {}, window.memoEventHandlers, isAppend);
            
        } catch (err) {
            console.error('[AppService] loadMore failed:', err);
        } finally {
            this.state.isLoading = false;
        }
    },

    /**
     * 필터 상태를 변경하고 데이터 초기화 후 다시 로딩
     */
    async setFilter({ group, date, query }, onUpdateSidebar) {
        let changed = false;
        if (group !== undefined && this.state.currentFilterGroup !== group) {
            this.state.currentFilterGroup = group;
            changed = true;
        }
        if (date !== undefined && this.state.currentFilterDate !== date) {
            this.state.currentFilterDate = date;
            changed = true;
        }
        if (query !== undefined && this.state.currentSearchQuery !== query) {
            this.state.currentSearchQuery = query;
            changed = true;
        }

        if (changed) {
            await this.refreshData(onUpdateSidebar);
        }
    }
};
