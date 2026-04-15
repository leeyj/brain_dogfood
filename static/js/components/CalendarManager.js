import { I18nManager } from '../utils/I18nManager.js';

/**
 * 사이드바 미니 캘린더 관리 모듈
 */
export const CalendarManager = {
    currentDate: new Date(),
    selectedDate: null,
    onDateSelect: null,
    memoDates: new Set(), // 메모가 있는 날짜들 (YYYY-MM-DD 형식)
    container: null,
    isCollapsed: false,

    init(containerId, onDateSelect) {
        this.container = document.getElementById(containerId);
        this.onDateSelect = onDateSelect;
        
        // 브라우저 저장소에서 접힘 상태 복구
        this.isCollapsed = localStorage.getItem('calendar_collapsed') === 'true';
        
        this.bindEvents(); // 이벤트 먼저 바인딩
        this.updateCollapseUI();
        this.render();
    },

    updateMemoDates(memos) {
        this.memoDates.clear();
        memos.forEach(memo => {
            if (memo.created_at) {
                const dateStr = memo.created_at.split('T')[0];
                this.memoDates.add(dateStr);
            }
        });
        this.render();
    },

    bindEvents() {
        const header = document.getElementById('calendarHeader');
        if (header) {
            console.log('[Calendar] Binding events to header:', header);
            
            const handleToggle = (e) => {
                console.log('[Calendar] Header clicked!', e.target);
                e.preventDefault();
                e.stopPropagation();
                
                // 시각적 피드백: 클릭 시 잠시 배경색 변경
                const originalBg = header.style.background;
                header.style.background = 'rgba(255, 255, 255, 0.2)';
                setTimeout(() => { header.style.background = originalBg; }, 100);

                this.isCollapsed = !this.isCollapsed;
                localStorage.setItem('calendar_collapsed', this.isCollapsed);
                this.updateCollapseUI();
            };

            header.addEventListener('click', handleToggle, { capture: true });
            // 모바일 터치 대응을 위해 mousedown도 추가 (일부 브라우저 클릭 지연 방지)
            header.addEventListener('mousedown', (e) => console.log('[Calendar] Mousedown detected'), { capture: true });
        } else {
            console.error('[Calendar] Failed to find calendarHeader element!');
        }
    },

    updateCollapseUI() {
        const content = document.getElementById('calendarContainer');
        const icon = document.getElementById('calendarToggleIcon');
        
        if (content) {
            if (this.isCollapsed) {
                content.classList.add('collapsed');
                if (icon) icon.innerText = '▼';
            } else {
                content.classList.remove('collapsed');
                if (icon) icon.innerText = '▲';
            }
        }
    },

    render() {
        if (!this.container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDaysInMonth = new Date(year, month, 0).getDate();

        const monthNames = I18nManager.t('calendar_months');
        const dayLabels = I18nManager.t('calendar_days');
        
        // 문화권에 맞는 날짜 포맷팅 (예: "April 2026" vs "2026년 4월")
        const monthYearHeader = I18nManager.t('date_month_year')
            .replace('{year}', year)
            .replace('{month}', monthNames[month]);

        let html = `
            <div class="calendar-widget glass-panel">
                <div class="calendar-nav">
                    <button id="prevMonth">&lt;</button>
                    <span>${monthYearHeader}</span>
                    <button id="nextMonth">&gt;</button>
                </div>
                <div class="calendar-grid">
                    ${dayLabels.map(day => `<div class="calendar-day-label">${day}</div>`).join('')}
        `;

        // 이전 달 날짜들
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevDaysInMonth - i}</div>`;
        }

        // 현재 달 날짜들
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = this.selectedDate === dateStr;
            const hasMemo = this.memoDates.has(dateStr);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
                    ${day}
                    ${hasMemo ? '<span class="activity-dot"></span>' : ''}
                </div>
            `;
        }

        html += `</div></div>`;
        this.container.innerHTML = html;

        // 이벤트 바인딩
        this.container.querySelector('#prevMonth').onclick = (e) => {
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        };
        this.container.querySelector('#nextMonth').onclick = (e) => {
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        };

        this.container.querySelectorAll('.calendar-day[data-date]').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const date = el.dataset.date;
                if (this.selectedDate === date) {
                    this.selectedDate = null; // 선택 해제
                } else {
                    this.selectedDate = date;
                }
                this.render();
                if (this.onDateSelect) this.onDateSelect(this.selectedDate);
            };
        });
    }
};
