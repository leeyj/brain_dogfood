/**
 * 애플리케이션 공통 날짜 유틸리티 (DateUtils)
 */
export const DateUtils = {
    /**
     * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환합니다.
     */
    format(date) {
        if (!date) return '';
        const d = (typeof date === 'string' || typeof date === 'number') ? new Date(date) : date;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    /**
     * 오늘의 날짜 문자열(YYYY-MM-DD)을 반환합니다.
     */
    getTodayStr() {
        return this.format(new Date());
    },

    /**
     * 특정 날짜가 포함된 주의 시작일(일요일)과 종료일(토요일) 범위를 반환합니다.
     * @param {Date} [baseDate=new Date()] - 기준 날짜
     * @returns {Object} { start: Date, end: Date, startStr: string, endStr: string }
     */
    getWeekRange(baseDate = new Date()) {
        const curr = new Date(baseDate);
        const first = curr.getDate() - curr.getDay();
        const last = first + 6;

        const startDate = new Date(curr.getFullYear(), curr.getMonth(), first);
        const endDate = new Date(curr.getFullYear(), curr.getMonth(), last);

        return {
            start: startDate,
            end: endDate,
            startStr: this.format(startDate),
            endStr: this.format(endDate)
        };
    },

    /**
     * 특정 날짜의 요일 인덱스(0-6)를 반환합니다.
     */
    getDayOfWeek(date) {
        return new Date(date).getDay();
    }
};
