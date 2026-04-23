/**
 * DeadlineManager: 메모의 기한(due_date) 상태를 계산하고 
 * 시각적 스타일(색상, 라벨)을 결정하는 유틸리티
 */
export const DeadlineManager = {
    /**
     * 현재 상태에 따른 기한 정보 반환
     * @param {string} dueDate - 마감일 (YYYY-MM-DD)
     * @returns {Object|null} { status, color, text }
     */
    getStatus(dueDate) {
        if (!dueDate) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        // 💡 현재 필터링 중인 날짜가 있다면 그 날짜를 기준으로 '당일' 여부 판단
        const filterDateStr = window.AppService && window.AppService.state ? window.AppService.state.currentFilterDate : null;
        const isSelectedDeadline = filterDateStr === dueDate;

        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'upcoming';
        let color = '#38bdf8'; // Blue
        let text = `D-${diffDays}`;

        if (diffDays < 0 && !isSelectedDeadline) {
            status = 'overdue';
            color = '#ff4d4d'; // Red
            text = `Exceeded ${Math.abs(diffDays)}`;
        } else if (diffDays === 0 || isSelectedDeadline) {
            status = 'today';
            color = '#ff4d4d'; // Red
            text = 'D-Day';
        } else if (diffDays <= 3) {
            status = 'urgent';
            color = '#f59e0b'; // Orange
        }

        return { status, color, text, diffDays };
    },

    /**
     * 테두리 스타일 적용
     * @param {HTMLElement} element 
     * @param {string} dueDate 
     */
    applyBorderStyle(element, dueDate) {
        const info = this.getStatus(dueDate);
        if (!info) return;

        // 마감 지남 제외하고 강조 (또는 사용자의 선택에 따라 조절 가능)
        if (info.diffDays >= 0 || info.status === 'today') {
            element.style.border = `2px solid ${info.color}`;
            element.style.boxShadow = `0 0 15px ${info.color}20`;
        }
    }
};
