/**
 * @module AppService
 * @description 애플리케이션의 전역 상태 관리 및 핵심 비즈니스 로직을 담당하는 엔진 (Controller 역할)
 */
import { API } from './api.js';
import { UI } from './ui.js';
import { CalendarManager } from './components/CalendarManager.js';
import { HeatmapManager } from './components/HeatmapManager.js';
import { WeeklyManager } from './components/WeeklyManager.js';
import { RelationManager } from './components/RelationManager.js';

export const AppService = {
    /**
     * @namespace state
     * @description 애플리케이션의 반응형 상태 값 정의
     */
    state: {
        /** @type {string} 현재 선택된 필터 그룹 (예: 'all', 'starred', 'today', 'files' 등) */
        currentFilterGroup: 'all',
        /** @type {string|null} 현재 선택된 카테고리 이름 */
        currentFilterCategory: null,
        /** @type {string|null} 현재 선택된 특정 날짜 (YYYY-MM-DD 형식) */
        currentFilterDate: null,
        /** @type {string|null} 주간 뷰 등 범위 검색 시의 시작 날짜 */
        currentStartDate: null,
        /** @type {string|null} 주간 뷰 등 범위 검색 시의 종료 날짜 */
        currentEndDate: null,
        /** @type {string} 현재 입력된 검색어 */
        currentSearchQuery: '',
        /** @type {Map<string|number, Object>} 암호 해독된 메모의 휘발성 저장소 (ID -> {content, tempPassword}) */
        unlockedMemos: new Map(),
        /** @type {number} 페이징 처리를 위한 현재 데이터 오프셋 */
        offset: 0,
        /** @type {number} 한 번의 요청으로 가져올 메모 최대 개수 */
        limit: 20,
        /** @type {boolean} 서버에 더 가져올 수 있는 데이터가 남아있는지 여부 */
        hasMore: true,
        /** @type {boolean} 현재 데이터를 서버에서 불러오는 중인지 여부 (중복 요청 방지) */
        isLoading: false,
        /** @type {number} 큰 화면에서 스크롤 없이 빈 공간이 생길 경우 수행하는 자동 추가 로딩 횟수 */
        autoLoadCount: 0,
        /** @type {Array<Object>} 현재 화면에 로드된 모든 메모 객체 배열 (전역 캐시) */
        allMemos: [],
        /** @type {Object|null} 메모 카드 렌더링 시 바인딩할 공통 이벤트 핸들러 모음 */
        eventHandlers: null,
        /** @type {string|number|null} 현재 마우스 커서가 위치한 메모의 ID */
        hoveredMemoId: null,
        /** @type {Object} 시스템 설정 데이터 (기본값 빈 객체) */
        settings: {}
    },

    /**
     * 필터 상태를 초기화하고 데이터의 첫 페이지를 다시 로딩합니다.
     * @async
     * @param {Function} [onUpdateSidebar] - 사이드바 UI 상태를 갱신하기 위한 콜백 함수
     * @returns {Promise<void>}
     */
    async refreshData(onUpdateSidebar) {
        this.state.offset = 0;
        this.state.hasMore = true;
        this.state.isLoading = false;
        this.state.autoLoadCount = 0;
        
        // 관계 포커스 모드 해제
        RelationManager.clearFocus();

        // 히트맵 데이터 새로고침
        if (HeatmapManager && HeatmapManager.refresh) {
            HeatmapManager.refresh();
        }

        // 첫 페이지 로드 (기존 내용 교체)
        await this.loadMore(onUpdateSidebar, false);
    },

    /**
     * 현재 필터 조건에 맞는 다음 페이지 데이터를 가져와 화면에 추가하거나 교체합니다.
     * @async
     * @param {Function} [onUpdateSidebar] - 사이드바 UI 상태 갱신용 콜백
     * @param {boolean} [isAppend=true] - 데이터를 기존 목록 하단에 붙일지(true), 새로 갈아끼울지(false) 여부
     * @returns {Promise<void>}
     */
    async loadMore(onUpdateSidebar, isAppend = true) {
        if (this.state.isLoading || !this.state.hasMore) return;
        
        this.state.isLoading = true;
        
        try {
            const filters = {
                group: this.state.currentFilterGroup,
                category: this.state.currentFilterCategory,
                date: this.state.currentFilterDate,
                start_date: this.state.currentStartDate,
                end_date: this.state.currentEndDate,
                query: this.state.currentSearchQuery,
                offset: this.state.offset,
                limit: this.state.limit
            };

            const newMemos = await API.fetchMemos(filters);
            
            // 가져온 데이터가 limit보다 적으면 더 이상 데이터가 없는 것으로 판단
            if (newMemos.length < this.state.limit) {
                this.state.hasMore = false;
            }

            this.state.offset += newMemos.length;
            
            // 데이터 병합 또는 초기화
            if (!isAppend) this.state.allMemos = newMemos;
            else this.state.allMemos = [...this.state.allMemos, ...newMemos];

            // 새로운 필터 적용 시(isAppend=false) 사이드바 등 상태 갱신
            if (onUpdateSidebar) {
                onUpdateSidebar(this.state.currentFilterGroup, this.state.currentFilterCategory);
            }
            
            // UI 렌더링 수행
            UI.setHasMore(this.state.hasMore);
            UI.renderMemos(newMemos, {}, this.state.eventHandlers, isAppend);
            
            // 💡 무한 스크롤 보정: 렌더링 후에도 센티넬이 보이면(화면이 덜 찼으면) 최대 3회까지 자동 추가 로딩
            if (this.state.hasMore && this.state.autoLoadCount < 3) {
                setTimeout(() => {
                    if (UI.isSentinelVisible()) {
                        console.log(`[AppService] Auto-loading (${this.state.autoLoadCount + 1}/3)...`);
                        this.state.autoLoadCount++;
                        this.loadMore(onUpdateSidebar, true);
                    }
                }, 300);
            } else if (!UI.isSentinelVisible()) {
                this.state.autoLoadCount = 0;
            }

        } catch (err) {
            console.error('[AppService] loadMore failed:', err);
        } finally {
            this.state.isLoading = false;
        }
    },

    /**
     * 필터 조건을 변경하고 관련 UI 컴포넌트들의 상태를 동기화한 뒤 데이터를 새로고침합니다.
     * @async
     * @param {Object} params - 변경할 필터 파라미터 모음
     * @param {string} [params.group] - 선택할 그룹명
     * @param {string} [params.category] - 선택할 카테고리명 (토글 가능)
     * @param {string} [params.date] - 선택할 단일 날짜 (YYYY-MM-DD)
     * @param {string} [params.start_date] - 검색 시작 날짜
     * @param {string} [params.end_date] - 검색 종료 날짜
     * @param {string} [params.query] - 검색 키워드
     * @param {Function} [onUpdateSidebar] - 사이드바 갱신 콜백
     * @returns {Promise<void>}
     */
    async setFilter({ group, category, date, start_date, end_date, query }, onUpdateSidebar) {
        let changed = false;
        
        // 1. 그룹 선택 처리 (그룹 변경 시 날짜/카테고리 필터 초기화)
        if (group !== undefined) {
            this.state.currentFilterGroup = group;
            this.state.currentFilterCategory = null; 
            this.state.currentFilterDate = null;
            this.state.currentStartDate = null;
            this.state.currentEndDate = null;
            changed = true;
            
            // 관련 컴포넌트 UI 초기화
            if (CalendarManager && CalendarManager.setSelectedDate) CalendarManager.setSelectedDate(null);
            if (typeof WeeklyManager !== 'undefined' && WeeklyManager.render) WeeklyManager.render();
        }

        // 2. 카테고리 선택 처리 (토글 방식)
        if (category !== undefined) {
            if (this.state.currentFilterCategory === category) {
                this.state.currentFilterCategory = null;
            } else {
                this.state.currentFilterCategory = category;
            }
            this.state.currentFilterGroup = 'all'; // 카테고리 필터 시 그룹은 전체로 설정
            changed = true;
        }

        // 3. 단일 날짜 선택 처리
        if (date !== undefined && this.state.currentFilterDate !== date) {
            this.state.currentFilterDate = date;
            this.state.currentStartDate = null;
            this.state.currentEndDate = null;
            changed = true;
            
            CalendarManager.setSelectedDate(date);
            if (HeatmapManager.setSelectedDate) {
                HeatmapManager.setSelectedDate(date);
            }
        }

        // 4. 주간/날짜 범위 선택 처리
        if (start_date !== undefined && end_date !== undefined) {
            if (this.state.currentStartDate !== start_date || this.state.currentEndDate !== end_date) {
                this.state.currentStartDate = start_date;
                this.state.currentEndDate = end_date;
                this.state.currentFilterDate = null;
                changed = true;
            }
        }

        // 5. 검색어 처리
        if (query !== undefined && this.state.currentSearchQuery !== query) {
            this.state.currentSearchQuery = query;
            changed = true;
        }

        if (changed) {
            await this.refreshData(onUpdateSidebar);
        }
    },

    /**
     * 서버 세션을 유지하기 위해 주기적인 인증 상태 확인(Heartbeat)을 수행합니다.
     * @returns {void}
     */
    startSessionHeartbeat() {
        if (this.heartbeatInterval) return;
        
        console.log('[AppService] Session heartbeat started.');
        
        API.checkAuthStatus().catch(() => {});

        this.heartbeatInterval = setInterval(async () => {
            try {
                await API.checkAuthStatus();
            } catch (err) {
                console.warn('[AppService] Session expired or server error during heartbeat.');
            }
        }, 120000); // 2분 간격
    }
};
