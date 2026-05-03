import { GraphAnalyzer } from './GraphAnalyzer.js';
import { GraphRenderer } from './GraphRenderer.js';

export const Visualizer = {
    simulation: null,
    svg: null,
    container: null,
    width: 0,
    height: 0,

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[Visualizer] Container #${containerId} not found.`);
            return;
        }
        
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        console.log(`[Visualizer] Init - Size: ${this.width}x${this.height}`);
    },

    async render(onNodeClick) {
        if (!this.container) return;
        
        let memos = [];
        try {
            const { API } = await import('../api.js');
            console.log('[Visualizer] Fetching all memos (limit=-1) strictly from endpoint...');
            memos = await API.fetchMemos({ limit: -1 });
        } catch (e) {
            console.error('[Visualizer] Failed to fetch graph data:', e);
            return;
        }
        
        if (this.width === 0 || this.height === 0) {
            this.width = this.container.clientWidth || 800;
            this.height = this.container.clientHeight || 600;
        }

        this.container.innerHTML = '';
        
        const graphData = GraphAnalyzer.analyze(memos, this.width, this.height);
        
        this.svg = GraphRenderer.render(
            this.container, 
            this.width, 
            this.height, 
            graphData, 
            onNodeClick, 
            this // pass self to store simulation reference
        );
    },

    resize() {
        if (!this.container || !this.svg || !this.simulation) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(0.3).restart();
    }
};
