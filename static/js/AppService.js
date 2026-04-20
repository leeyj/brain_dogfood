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
        currentFilterCategory: null, // NEW: 카테고리 필터
        currentFilterDate: null,
        currentSearchQuery: '',
        offset: 0,
        limit: 20,
        hasMore: true,
        isLoading: false,
        autoLoadCount: 0 // 💡 큰 화면 대응 자동 로딩 횟추 추적
    },

    /**
     * 필터 상태 초기화 및 데이터 첫 페이지 로딩
     */
    async refreshData(onUpdateSidebar) {
        this.state.offset = 0;
        this.state.memosCache = [];
        this.state.hasMore = true;
        this.state.isLoading = false;
        this.state.autoLoadCount = 0; // 초기화
        
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
        
        try {
            const filters = {
                group: this.state.currentFilterGroup,
                category: this.state.currentFilterCategory, // NEW
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

            CalendarManager.updateMemoDates(this.state.memosCache);
            
            if (onUpdateSidebar) {
                onUpdateSidebar(this.state.memosCache, this.state.currentFilterGroup, this.state.currentFilterCategory);
            }
            
            UI.setHasMore(this.state.hasMore);
            UI.renderMemos(newMemos, {}, window.memoEventHandlers, isAppend);
            
            // 💡 [개선] 큰 화면 대응: 렌더링 후에도 센티넬이 보이면(스크롤바가 아직 안 생겼으면) 추가 로드
            // 사용자 요청에 따라 자동 로딩은 최대 3회(총 80개 분량)까지만 진행
            if (this.state.hasMore && this.state.autoLoadCount < 3) {
                setTimeout(() => {
                    if (UI.isSentinelVisible()) {
                        console.log(`[AppService] Auto-loading (${this.state.autoLoadCount + 1}/3)...`);
                        this.state.autoLoadCount++;
                        this.loadMore(onUpdateSidebar, true);
                    }
                }, 100);
            } else if (!UI.isSentinelVisible()) {
                // 스크롤바가 생겼거나 센티넬이 가려지면 카운트 리셋 (다음번 수동 스크롤 트리거를 위해)
                this.state.autoLoadCount = 0;
            }
            
        } catch (err) {
            console.error('[AppService] loadMore failed:', err);
        } finally {
            this.state.isLoading = false;
        }
    },

    /**
     * 필터 상태를 변경하고 데이터 초기화 후 다시 로딩
     */
    async setFilter({ group, category, date, query }, onUpdateSidebar) {
        let changed = false;
        
        // 1. 그룹 선택 처리
        if (group !== undefined) {
            // 그룹이 바뀌거나, 혹은 카테고리가 켜져있는 상태에서 그룹을 누르면 카테고리 해제
            if (this.state.currentFilterGroup !== group || this.state.currentFilterCategory !== null) {
                this.state.currentFilterGroup = group;
                this.state.currentFilterCategory = null; 
                changed = true;
            }
        }

        // 2. 카테고리 선택 처리
        if (category !== undefined) {
            if (this.state.currentFilterCategory === category) {
                // 이미 선택된 카테고리 재클릭 시 해제 (Toggle)
                this.state.currentFilterCategory = null;
            } else {
                this.state.currentFilterCategory = category;
            }
            this.state.currentFilterGroup = 'all'; // 카테고리 필터 적용/변경 시 그룹 초기화
            changed = true;
        }
        if (date !== undefined && this.state.currentFilterDate !== date) {
            this.state.currentFilterDate = date;
            changed = true;
            
            CalendarManager.setSelectedDate(date);
            if (HeatmapManager.setSelectedDate) {
                HeatmapManager.setSelectedDate(date);
            }
        }
        if (query !== undefined && this.state.currentSearchQuery !== query) {
            this.state.currentSearchQuery = query;
            changed = true;
        }

        if (changed) {
            await this.refreshData(onUpdateSidebar);
        }
    },

    /**
     * 세션 유지 확인을 위한 Heartbeat 시작 (1~2분 간격)
     */
    startSessionHeartbeat() {
        if (this.heartbeatInterval) return; // 이미 실행 중이면 무시
        
        console.log('[AppService] Session heartbeat started.');
        
        // 초기 실행 후 인터벌 설정
        API.checkAuthStatus().catch(() => {});

        this.heartbeatInterval = setInterval(async () => {
            try {
                await API.checkAuthStatus();
            } catch (err) {
                console.warn('[AppService] Session expired or server error during heartbeat.');
                // API.request에서 401 발생 시 이미 리다이렉트 처리함
            }
        }, 120000); // 120,000ms = 2분
    }
};
