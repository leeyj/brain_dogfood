/**
 * 앱의 전역 상태 및 데이터 관리 엔진 (State Management & Core Services)
 */
import { API } from './api.js';
import { UI } from './ui.js';
import { CalendarManager } from './components/CalendarManager.js';
import { HeatmapManager } from './components/HeatmapManager.js';
import { WeeklyManager } from './components/WeeklyManager.js';

export const AppService = {
    state: {
        currentFilterGroup: 'all',
        currentFilterCategory: null,
        currentFilterDate: null,
        currentStartDate: null, // NEW: 주간 뷰용 시작일
        currentEndDate: null,   // NEW: 주간 뷰용 종료일
        currentSearchQuery: '',
        unlockedMemos: new Map(), // 🔑 해독된 메모 임시 저장소 (ID -> {content, tempPassword})
        offset: 0,
        limit: 20,
        hasMore: true,
        isLoading: false,
        autoLoadCount: 0, // 💡 큰 화면 대응 자동 로딩 횟추 추적
        allMemos: [], // 📦 전체 메모 캐시 (window.allMemosCache 대체)
        eventHandlers: null, // 🛠️ 메모 카드 이벤트 핸들러 (window.memoEventHandlers 대체)
        hoveredMemoId: null // 🖱️ 현재 마우스가 올라간 메모 ID
    },

    /**
     * 필터 상태 초기화 및 데이터 첫 페이지 로딩
     */
    async refreshData(onUpdateSidebar) {
        this.state.offset = 0;
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
                start_date: this.state.currentStartDate,
                end_date: this.state.currentEndDate,
                query: this.state.currentSearchQuery,
                offset: this.state.offset,
                limit: this.state.limit
            };

            const newMemos = await API.fetchMemos(filters);
            
            if (newMemos.length < this.state.limit) {
                this.state.hasMore = false;
            }

            this.state.offset += newMemos.length;
            
            // 📦 전역 캐시 업데이트
            if (!isAppend) this.state.allMemos = newMemos;
            else this.state.allMemos = [...this.state.allMemos, ...newMemos];

            if(!isAppend) {
                // 새 필터시 달력 등 갱신 트리거
                CalendarManager.refresh();
            }
            
            if (onUpdateSidebar) {
                // UI 단에 필터 상태만 전달
                onUpdateSidebar(this.state.currentFilterGroup, this.state.currentFilterCategory);
            }
            
            UI.setHasMore(this.state.hasMore);
            UI.renderMemos(newMemos, {}, this.state.eventHandlers, isAppend);
            
            // 💡 [개선] 큰 화면 대응: 렌더링 후에도 센티넬이 보이면(스크롤바가 아직 안 생겼으면) 추가 로드
            // 사용자 요청에 따라 자동 로딩은 최대 3회(총 80개 분량)까지만 진행
            if (this.state.hasMore && this.state.autoLoadCount < 3) {
                // 💡 애니메이션 시간을 고려하여 지연 시간 상향 (100ms -> 300ms)
                setTimeout(() => {
                    if (UI.isSentinelVisible()) {
                        console.log(`[AppService] Auto-loading (${this.state.autoLoadCount + 1}/3)...`);
                        this.state.autoLoadCount++;
                        this.loadMore(onUpdateSidebar, true);
                    }
                }, 300);
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
    async setFilter({ group, category, date, start_date, end_date, query }, onUpdateSidebar) {
        let changed = false;
        
        // 1. 그룹 선택 처리
        if (group !== undefined) {
            // 💡 사이드바 메뉴 클릭 시에는 무조건 날짜/카테고리 필터를 초기화하여 '전체 보기' 상태로 만듦
            this.state.currentFilterGroup = group;
            this.state.currentFilterCategory = null; 
            this.state.currentFilterDate = null;
            this.state.currentStartDate = null;
            this.state.currentEndDate = null;
            changed = true;
            
            // UI 상태 업데이트 트리거
            if (CalendarManager && CalendarManager.setSelectedDate) CalendarManager.setSelectedDate(null);
            if (typeof WeeklyManager !== 'undefined' && WeeklyManager.render) WeeklyManager.render();
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
            this.state.currentStartDate = null; // 단일 날짜 선택 시 범위 초기화
            this.state.currentEndDate = null;
            changed = true;
            
            CalendarManager.setSelectedDate(date);
            if (HeatmapManager.setSelectedDate) {
                HeatmapManager.setSelectedDate(date);
            }
        }
        // 💡 주간 범위 선택 처리
        if (start_date !== undefined && end_date !== undefined) {
            if (this.state.currentStartDate !== start_date || this.state.currentEndDate !== end_date) {
                this.state.currentStartDate = start_date;
                this.state.currentEndDate = end_date;
                this.state.currentFilterDate = null; // 범위 선택 시 단일 날짜 초기화
                changed = true;
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
