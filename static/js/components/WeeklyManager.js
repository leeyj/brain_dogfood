/**
 * 주간 뷰 매니저 (Weekly View Manager)
 * 검색창 하단에 일~토 주간 선택기를 표시하고 날짜별 필터링 제공
 */
import { AppService } from '../AppService.js';
import { I18nManager } from '../utils/I18nManager.js';

export const WeeklyManager = {
    currentDate: new Date(),
    container: null,
    onUpdate: null,
    isVisible: localStorage.getItem('weekly_visible') !== 'false', // 기본값 true

    init(containerId, onUpdate) {
        this.container = document.getElementById(containerId);
        this.onUpdate = onUpdate;
        if (!this.container) return;
        
        this.updateVisibilityUI();
        console.log('[WeeklyManager] Initialized');
        this.render();
    },

    toggle() {
        this.isVisible = !this.isVisible;
        localStorage.setItem('weekly_visible', this.isVisible);
        this.updateVisibilityUI();
    },

    updateVisibilityUI() {
        if (!this.container) return;
        this.container.style.display = this.isVisible ? 'block' : 'none';
        
        const toggleBtn = document.getElementById('toggleWeeklyBtn');
        if (toggleBtn) {
            if (this.isVisible) toggleBtn.classList.add('active');
            else toggleBtn.classList.remove('active');
        }
    },

    /**
     * 주간 선택기 렌더링
     */
    render() {
        const week = this.getCurrentWeek(this.currentDate);
        const start = week[0];
        const end = week[6];
        
        // 💡 토글 상태 확인: 현재 주간 범위 필터나 날짜 필터가 걸려있는가?
        const isDateFiltered = AppService.state.currentFilterDate !== null || AppService.state.currentStartDate !== null;
        const fullBtnText = isDateFiltered ? (I18nManager.t('groups.all') || 'All') : (I18nManager.t('groups.weekly') || 'Weekly');
        const fullBtnIcon = isDateFiltered ? '🔄' : '📅';

        const html = `
            <div class="weekly-selector glass-panel">
                <div class="weekly-header">
                    <button class="week-nav-btn prev-week">◀</button>
                    <span class="week-info" title="Click to show all week">${this.formatMonthYear(start)}</span>
                    <button class="week-nav-btn next-week">▶</button>
                    <button class="week-full-btn ${isDateFiltered ? 'active' : ''}" title="Toggle Weekly/All View">
                        ${fullBtnIcon} ${fullBtnText}
                    </button>
                </div>
                <div class="week-days">
                    ${week.map(d => {
                        const dateStr = this.formatDate(d);
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isSelected = AppService.state.currentFilterDate === dateStr;
                        return `
                            <div class="day-item ${isToday ? 'today' : ''} ${isSelected ? 'active' : ''}" data-date="${dateStr}">
                                <span class="day-label">${this.getDayLabel(d.getDay())}</span>
                                <span class="day-number">${d.getDate()}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.bindEvents(start, end, isDateFiltered);
    },

    bindEvents(start, end, isDateFiltered) {
        // 1. 날짜 클릭 이벤트 (토글 기능 포함)
        this.container.querySelectorAll('.day-item').forEach(el => {
            el.onclick = () => {
                const date = el.dataset.date;
                const isAlreadySelected = AppService.state.currentFilterDate === date;
                
                if (isAlreadySelected) {
                    // 이미 선택된 날짜면 주간 전체 보기로 전환
                    const startStr = this.formatDate(start);
                    const endStr = this.formatDate(end);
                    AppService.setFilter({ start_date: startStr, end_date: endStr }, this.onUpdate);
                } else {
                    AppService.setFilter({ date }, this.onUpdate);
                }
                this.render();
            };
        });

        // 2. 월/년도 헤더 클릭 시 주간 전체 보기
        const weekInfo = this.container.querySelector('.week-info');
        if (weekInfo) {
            weekInfo.style.cursor = 'pointer';
            weekInfo.onclick = () => {
                const startStr = this.formatDate(start);
                const endStr = this.formatDate(end);
                AppService.setFilter({ start_date: startStr, end_date: endStr }, this.onUpdate);
                this.render();
            };
        }

        // 3. 주간 전체 보기 <-> 전체 보기 토글 버튼 (마우스 동선 최적화)
        const fullBtn = this.container.querySelector('.week-full-btn');
        if (fullBtn) {
            fullBtn.onclick = () => {
                if (isDateFiltered) {
                    // 필터가 걸려있으면 -> 전체 보기로 리셋 (현재 그룹 유지)
                    console.log(`[WeeklyManager] Toggle: Resetting to all view`);
                    AppService.setFilter({ group: AppService.state.currentFilterGroup }, this.onUpdate);
                } else {
                    // 필터가 없으면 -> 주간 전체 보기 적용
                    const startStr = this.formatDate(start);
                    const endStr = this.formatDate(end);
                    console.log(`[WeeklyManager] Toggle: Setting to week range`);
                    AppService.setFilter({ start_date: startStr, end_date: endStr }, this.onUpdate);
                }
                this.render();
            };
        }

        // 이전 주 이동
        this.container.querySelector('.prev-week').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
            this.render();
        };

        // 다음 주 이동
        this.container.querySelector('.next-week').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
            this.render();
        };
    },

    // --- Utils ---

    getCurrentWeek(baseDate) {
        const curr = new Date(baseDate);
        const first = curr.getDate() - curr.getDay(); // Sunday
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(new Date(curr.setDate(first + i)));
        }
        return week;
    },

    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    formatMonthYear(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return I18nManager.t('date_month_year').replace('{year}', year).replace('{month}', month);
    },

    getDayLabel(dayIndex) {
        const labels = I18nManager.t('calendar_days');
        return Array.isArray(labels) ? labels[dayIndex] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
    }
};
