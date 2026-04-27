/**
 * @module WeeklyManager
 * @description 주간 뷰(Weekly View)를 관리하는 컴포넌트.
 * 검색창 하단에 일~토 주간 선택기를 표시하고, 날짜별 활동량(Heatmap) 연동 및 필터링 기능을 제공합니다.
 */
import { AppService } from '../AppService.js';
import { I18nManager } from '../utils/I18nManager.js';

export const WeeklyManager = {
    /**
     * @namespace state
     * @description 컴포넌트 내부 상태 관리
     */
    state: {
        /** @type {Date} 현재 표시 중인 주의 기준 날짜 */
        currentDate: new Date(),
        /** @type {boolean} 주간 뷰의 화면 표시 여부 (localStorage와 연동) */
        isVisible: localStorage.getItem('weekly_visible') !== 'false',
    },
    
    /** @type {HTMLElement|null} 컴포넌트가 렌더링될 DOM 컨테이너 요소 */
    container: null,
    
    /** @type {Function|null} 데이터 변경 시 외부(AppService 등)에서 전달받은 콜백 함수 */
    onUpdate: null,

    /**
     * 주간 뷰 매니저를 초기화합니다.
     * @param {string} containerId - 컨테이너 요소의 DOM ID
     * @param {Function} onUpdate - 필터 변경 시 호출할 콜백 함수
     */
    init(containerId, onUpdate) {
        this.container = document.getElementById(containerId);
        this.onUpdate = onUpdate;
        if (!this.container) return;
        
        // 📊 히트맵 데이터 로드 완료 이벤트 구독
        window.removeEventListener('heatmapDataRefreshed', this._handleRefresh);
        this._handleRefresh = () => this.render();
        window.addEventListener('heatmapDataRefreshed', this._handleRefresh);
        
        this.updateVisibilityUI();
        console.log('[WeeklyManager] Initialized');
        this.render();
    },

    /**
     * 주간 뷰의 가시성을 토글하고 설정을 유지합니다.
     */
    toggle() {
        this.state.isVisible = !this.state.isVisible;
        localStorage.setItem('weekly_visible', this.state.isVisible);
        this.updateVisibilityUI();
    },

    /**
     * 현재 가시성 상태(isVisible)에 따라 실제 DOM의 display 스타일을 업데이트합니다.
     */
    updateVisibilityUI() {
        if (!this.container) return;
        this.container.style.display = this.state.isVisible ? 'block' : 'none';
        
        const toggleBtn = document.getElementById('toggleWeeklyBtn');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', this.state.isVisible);
        }
    },

    /**
     * 주간 뷰 전체 UI를 다시 그립니다.
     * 현재 상태에 따라 헤더, 날짜 목록을 생성하고 이벤트를 바인딩합니다.
     */
    render() {
        if (!this.container) return;

        const week = this._getCurrentWeek(this.state.currentDate);
        const start = week[0];
        const end = week[6];
        
        // 현재 앱의 필터링 상태가 특정 날짜 또는 범위에 고정되어 있는지 확인
        const isDateFiltered = AppService.state.currentFilterDate !== null || AppService.state.currentStartDate !== null;
        
        this.container.innerHTML = `
            <div class="wk-container glass-panel">
                ${this._renderHeader(start, isDateFiltered)}
                ${this._renderDays(week)}
            </div>
        `;

        this._bindEvents(start, end, isDateFiltered);
    },

    /**
     * 주간 뷰의 상단 헤더(네비게이션 및 전체보기 버튼)를 렌더링합니다.
     * @private
     * @param {Date} startDate - 현재 주의 시작일 (일요일)
     * @param {boolean} isDateFiltered - 현재 날짜 필터링 적용 여부
     * @returns {string} 헤더 HTML 문자열
     */
    _renderHeader(startDate, isDateFiltered) {
        const fullBtnText = isDateFiltered ? (I18nManager.t('groups.all') || 'All') : (I18nManager.t('groups.weekly') || 'Weekly');
        const fullBtnIcon = isDateFiltered ? '🔄' : '📅';

        return `
            <div class="wk-header">
                <div class="wk-nav-group">
                    <button class="wk-nav-btn prev-week" title="Previous Week">◀</button>
                    <span class="wk-info" title="Click to show all week">${this._formatMonthYear(startDate)}</span>
                    <button class="wk-nav-btn next-week" title="Next Week">▶</button>
                </div>
                <button class="wk-full-btn ${isDateFiltered ? 'active' : ''}" title="Toggle Weekly/All View">
                    ${fullBtnIcon} ${fullBtnText}
                </button>
            </div>
        `;
    },

    /**
     * 한 주간의 날짜 목록 컨테이너를 렌더링합니다.
     * @private
     * @param {Array<Date>} week - 7일치의 Date 객체 배열
     * @returns {string} 날짜 목록 HTML 문자열
     */
    _renderDays(week) {
        return `
            <div class="wk-days">
                ${week.map(date => this._renderDayItem(date)).join('')}
            </div>
        `;
    },

    /**
     * 개별 날짜 아이템(요일, 날짜, 활동량 도트)을 렌더링합니다.
     * @private
     * @param {Date} date - 렌더링할 특정 날짜 객체
     * @returns {string} 개별 날짜 HTML 문자열
     */
    _renderDayItem(date) {
        const dateStr = this._formatDate(date);
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = AppService.state.currentFilterDate === dateStr;
        
        // HeatmapManager에서 관리하는 전역 활동량 데이터 참조
        let count = 0;
        let deadlineCount = 0;
        const heatmapData = window.HeatmapManager?.data;
        if (heatmapData) {
            const stats = heatmapData.find(item => item.date.split(' ')[0] === dateStr);
            if (stats) {
                count = stats.count || 0;
                deadlineCount = stats.deadline_count || 0;
            }
        }
        
        const level = this._calculateLevel(count);
        
        return `
            <div class="wk-item ${isToday ? 'today' : ''} ${isSelected ? 'active' : ''}" data-date="${dateStr}">
                <span class="wk-label">
                    ${this._getDayLabel(date.getDay())}
                    ${deadlineCount > 0 ? '<span class="wk-deadline-dot"></span>' : ''}
                </span>
                <span class="wk-number">${date.getDate()}</span>
                <div class="wk-activity">
                    <div class="wk-dot lvl-${level}" data-count="${count}"></div>
                </div>
            </div>
        `;
    },

    /**
     * 렌더링된 요소들에 상호작용 이벤트를 바인딩합니다.
     * @private
     * @param {Date} start - 주의 시작일
     * @param {Date} end - 주의 종료일
     * @param {boolean} isDateFiltered - 현재 필터링 적용 여부
     */
    _bindEvents(start, end, isDateFiltered) {
        const startStr = this._formatDate(start);
        const endStr = this._formatDate(end);

        // 날짜 클릭: 단일 날짜 필터 적용 또는 주간 전체 보기로 전환
        this.container.querySelectorAll('.wk-item').forEach(el => {
            el.onclick = () => {
                const date = el.dataset.date;
                const isAlreadySelected = AppService.state.currentFilterDate === date;
                
                if (isAlreadySelected) {
                    AppService.setFilter({ start_date: startStr, end_date: endStr }, this.onUpdate);
                } else {
                    AppService.setFilter({ date }, this.onUpdate);
                }
                this.render();
            };
        });

        // 월/년도 헤더 클릭: 해당 주간 전체 보기 필터 적용
        const weekInfo = this.container.querySelector('.wk-info');
        if (weekInfo) {
            weekInfo.onclick = () => {
                AppService.setFilter({ start_date: startStr, end_date: endStr }, this.onUpdate);
                this.render();
            };
        }

        // 주간/전체 보기 토글 버튼 클릭
        const fullBtn = this.container.querySelector('.wk-full-btn');
        if (fullBtn) {
            fullBtn.onclick = () => {
                if (isDateFiltered) {
                    AppService.setFilter({ group: AppService.state.currentFilterGroup }, this.onUpdate);
                } else {
                    AppService.setFilter({ start_date: startStr, end_date: endStr }, this.onUpdate);
                }
                this.render();
            };
        }

        // 이전/다음 주 이동 버튼
        this.container.querySelector('.prev-week').onclick = () => {
            this.state.currentDate.setDate(this.state.currentDate.getDate() - 7);
            this.render();
        };

        this.container.querySelector('.next-week').onclick = () => {
            this.state.currentDate.setDate(this.state.currentDate.getDate() + 7);
            this.render();
        };
    },

    /**
     * 기준 날짜가 포함된 주의 일요일부터 토요일까지의 Date 객체 배열을 생성합니다.
     * @private
     * @param {Date} baseDate - 기준 날짜
     * @returns {Array<Date>} 7일간의 Date 객체 배열
     */
    _getCurrentWeek(baseDate) {
        const curr = new Date(baseDate);
        const first = curr.getDate() - curr.getDay();
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(new Date(curr.getFullYear(), curr.getMonth(), first + i));
        }
        return week;
    },

    /**
     * 메모 작성 수에 따른 활동량 레벨(0~4)을 반환합니다.
     * @private
     * @param {number} count - 해당 날짜의 메모 개수
     * @returns {number} 레벨값
     */
    _calculateLevel(count) {
        if (count === 0) return 0;
        if (count <= 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
    },

    /**
     * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환합니다.
     * @private
     * @param {Date} date - 변환할 날짜 객체
     * @returns {string} 포맷팅된 날짜 문자열
     */
    _formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    /**
     * 다국어 설정을 반영하여 'YYYY년 M월' 형태의 문자열을 반환합니다.
     * @private
     * @param {Date} date - 포맷팅할 날짜 객체
     * @returns {string} 현지화된 연/월 문자열
     */
    _formatMonthYear(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return I18nManager.t('date_month_year')
            .replace('{year}', year)
            .replace('{month}', month);
    },

    /**
     * 요일 인덱스에 따른 현지화된 요일 이름을 반환합니다.
     * @private
     * @param {number} dayIndex - 요일 인덱스 (0: 일요일 ~ 6: 토요일)
     * @returns {string} 요일 이름
     */
    _getDayLabel(dayIndex) {
        const labels = I18nManager.t('calendar_days');
        return Array.isArray(labels) ? labels[dayIndex] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
    }
};
