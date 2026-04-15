import { I18nManager } from '../utils/I18nManager.js';

/**
 * 지식 성장 히트맵(Heatmap) 관리 모듈
 * 최근 지정된 기간(기본 365일) 동안의 메모 작성 활동량을 시각화합니다.
 */
export const HeatmapManager = {
    container: null,
    data: [], // [{date: 'YYYY-MM-DD', count: N}, ...]
    currentRange: 365, // 기본 365일

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('[Heatmap] Container not found:', containerId);
            return;
        }

        // 로컬스토리지에서 이전에 선택한 범위 복구
        const savedRange = localStorage.getItem('heatmap_range');
        if (savedRange) {
            this.currentRange = parseInt(savedRange, 10);
        }
    },

    /**
     * 데이터를 서버에서 가져와 렌더링합니다.
     */
    async refresh() {
        try {
            const { API } = await import('../api.js');
            this.data = await API.fetchHeatmapData(this.currentRange);
            this.render();
        } catch (error) {
            console.error('[Heatmap] Failed to fetch stats:', error);
        }
    },

    /**
     * 히트맵 그리드를 생성합니다.
     */
    render() {
        if (!this.container) return;

        const dataMap = new Map(this.data.map(d => [d.date, d.count]));
        
        // 날짜 계산
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (this.currentRange - 1));
        
        // 요일 맞추기 (일요일 시작 기준)
        const dayOfWeek = startDate.getDay();
        const adjustedStartDate = new Date(startDate);
        adjustedStartDate.setDate(startDate.getDate() - dayOfWeek);

        const rangeLabel = I18nManager.t(`heatmap_ranges.${this.currentRange}`) || I18nManager.t('label_select_range');

        const heatmapTitle = I18nManager.t('label_heatmap_title');
        const rangeOptions = I18nManager.t('heatmap_ranges');
        const labelLess = I18nManager.t('label_less');
        const labelMore = I18nManager.t('label_more');

        let html = `
            <div class="heatmap-wrapper glass-panel">
                <div class="heatmap-header">
                    <span class="heatmap-title">${heatmapTitle}</span>
                    <select id="heatmapRangeSelect" class="heatmap-select">
                        ${Object.entries(rangeOptions).map(([val, label]) => `
                            <option value="${val}" ${this.currentRange.toString() === val ? 'selected' : ''}>${label}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="heatmap-grid" id="heatmapGrid">
        `;

        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        // 전체 표시 일수 (범위 + 요일 보정)
        const totalCells = this.currentRange + dayOfWeek + (6 - today.getDay());
        
        for (let i = 0; i < totalCells; i++) {
            const currentDate = new Date(adjustedStartDate);
            currentDate.setDate(adjustedStartDate.getDate() + i);
            
            const dateStr = formatDate(currentDate);
            const count = dataMap.get(dateStr) || 0;
            const level = this.calculateLevel(count);
            
            const isOutOfRange = currentDate < startDate || currentDate > today;
            
            const tooltip = I18nManager.t('tooltip_heatmap_stat')
                .replace('{date}', dateStr)
                .replace('{count}', count);

            html += `
                <div class="heatmap-cell ${isOutOfRange ? 'out' : `lvl-${level}`}" 
                     data-date="${dateStr}" 
                     data-count="${count}"
                     title="${tooltip}">
                </div>
            `;
        }

        html += `
                </div>
                <div class="heatmap-legend">
                    <span>${labelLess}</span>
                    <div class="heatmap-cell lvl-0"></div>
                    <div class="heatmap-cell lvl-1"></div>
                    <div class="heatmap-cell lvl-2"></div>
                    <div class="heatmap-cell lvl-3"></div>
                    <div class="heatmap-cell lvl-4"></div>
                    <span>${labelMore}</span>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.bindEvents();
    },

    calculateLevel(count) {
        if (count === 0) return 0;
        if (count <= 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
    },

    bindEvents() {
        const select = this.container.querySelector('#heatmapRangeSelect');
        if (select) {
            select.onchange = (e) => {
                this.currentRange = parseInt(e.target.value, 10);
                localStorage.setItem('heatmap_range', this.currentRange);
                this.refresh();
            };
        }
    }
};
