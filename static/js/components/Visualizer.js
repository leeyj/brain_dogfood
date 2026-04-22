/**
 * 지식 시각화 맵(Graph) 관리 모듈 (v7.5 - D3.js 기반 혁신)
 */
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';

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
        
        // 초기 크기 설정
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        console.log(`[Visualizer] Init - Size: ${this.width}x${this.height}`);
    },

    async render(onNodeClick) {
        if (!this.container) return;
        
        // 0. API 통신을 통해 전체 데이터를 가져옴 (파편화 방지)
        let memos = [];
        try {
            const { API } = await import('../api.js');
            console.log('[Visualizer] Fetching all memos (limit=-1) strictly from endpoint...');
            memos = await API.fetchMemos({ limit: -1 });
        } catch (e) {
            console.error('[Visualizer] Failed to fetch graph data:', e);
            return;
        }
        
        console.log(`[Visualizer] Rendering ${memos.length} memos...`);
        
        // 모달이 열리는 중이라 크기가 0일 경우 대비 재측정
        if (this.width === 0 || this.height === 0) {
            this.width = this.container.clientWidth || 800;
            this.height = this.container.clientHeight || 600;
            console.log(`[Visualizer] Re-measured Size: ${this.width}x${this.height}`);
        }

        // 0. 기존 내용 청소
        this.container.innerHTML = '';
        
        // 1. 데이터 전처리
        const uniqueGroups = [...new Set(memos.map(m => m.group_name || Constants.GROUPS.DEFAULT))];
        const groupCenters = {};
        const radius = Math.min(this.width, this.height) * 0.35;
        
        // 그룹별 성단 중심점 계산 (원형 레이아웃)
        uniqueGroups.forEach((g, i) => {
            const angle = (i / uniqueGroups.length) * Math.PI * 2;
            groupCenters[g] = {
                x: this.width / 2 + Math.cos(angle) * radius,
                y: this.height / 2 + Math.sin(angle) * radius
            };
        });

        const nodes = memos.map(m => ({
            ...m,
            id: m.id.toString(),
            group: m.group_name || Constants.GROUPS.DEFAULT,
            weight: (m.links ? m.links.length : 0) + 5
        }));

        const links = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        
        // 1. 명시적 링크 (Internal Links) 처리
        memos.forEach(m => {
            if (m.links) {
                m.links.forEach(l => {
                    const targetId = (l.target_id || l.id).toString();
                    if (nodeMap.has(targetId)) {
                        links.push({ source: m.id.toString(), target: targetId, type: 'explicit' });
                    }
                });
            }
        });

        // 2. 공통 태그 및 그룹 기반 자동 연결 (Constellation Links)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];
                
                // 태그 목록 추출
                const tagsA = new Set((nodeA.tags || []).map(t => t.name));
                const tagsB = new Set((nodeB.tags || []).map(t => t.name));
                
                // 교집합 확인 (태그 링크)
                const commonTags = [...tagsA].filter(t => tagsB.has(t));
                if (commonTags.length > 0) {
                    links.push({ 
                        source: nodeA.id, 
                        target: nodeB.id, 
                        type: 'tag', 
                        strength: commonTags.length 
                    });
                } else if (nodeA.group === nodeB.group) {
                    // 동일 그룹 내 자동 연결 (성단 형성) - 태그가 없을 때만
                    links.push({
                        source: nodeA.id,
                        target: nodeB.id,
                        type: 'group',
                        strength: 0.1
                    });
                }
            }
        }

        console.log(`[Visualizer] Data Prepared - Nodes: ${nodes.length}, Links: ${links.length}, Groups: ${uniqueGroups.length}`);
        const totalTags = nodes.reduce((acc, n) => acc + (n.tags ? n.tags.length : 0), 0);
        console.log(`[Visualizer] Total Tags in Data: ${totalTags}`);

        // 2. SVG 생성
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('background', 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        // 우주 배경 (작은 별들) 생성
        const starCount = 100;
        const stars = Array.from({ length: starCount }, () => ({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            r: Math.random() * 1.5,
            opacity: Math.random()
        }));

        this.svg.selectAll('.star')
            .data(stars)
            .enter()
            .append('circle')
            .attr('class', 'star')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r)
            .style('fill', '#fff')
            .style('opacity', d => d.opacity);

        // 글로우 효과 필터 정의
        const defs = this.svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow');
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3.5')
            .attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const g = this.svg.append('g').attr('class', 'main-g');

        // 3. 줌(Zoom) 설정
        const zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => g.attr('transform', event.transform));
        this.svg.call(zoom);

        // 4. 그룹 라벨 생성 (Subtle Center Labels)
        const groupLabels = g.selectAll('.group-label')
            .data(uniqueGroups)
            .join('text')
            .attr('class', 'group-label')
            .attr('x', d => groupCenters[d].x)
            .attr('y', d => groupCenters[d].y)
            .text(d => d)
            .style('fill', 'rgba(56, 189, 248, 0.2)')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none');

        // 5. 물리 시뮬레이션 설정 (Force Simulation)
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.1))
            .force('charge', d3.forceManyBody().strength(-200)) // 서로 밀어냄
            .force('collide', d3.forceCollide().radius(d => d.weight + 20))
            .force('x', d3.forceX(d => groupCenters[d.group].x).strength(0.08)) // 그룹 중심으로 당김
            .force('y', d3.forceY(d => groupCenters[d.group].y).strength(0.08))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2).strength(0.01));

        // 6. 링크(선) 활성화
        const link = g.selectAll('.link')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .style('stroke', d => {
                if (d.type === 'explicit') return '#38bdf8';
                if (d.type === 'tag') return '#8b5cf6';
                return 'rgba(56, 189, 248, 0.05)'; // group links
            })
            .style('stroke-width', d => d.type === 'explicit' ? 2 : 1)
            .style('stroke-dasharray', d => d.type === 'group' ? '2,2' : 'none')
            .style('opacity', d => d.type === 'group' ? 0.3 : 0.6);

        // 7. 노드(점) 활성화
        const node = g.selectAll('.node')
            .data(nodes)
            .join('g')
            .attr('class', d => `node ${d.is_encrypted ? 'encrypted' : ''}`)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('click', (event, d) => onNodeClick && onNodeClick(d.id))
            .on('mouseover', function(event, d) {
                // 이웃 노드 및 링크 하이라이트
                const neighborIds = new Set();
                neighborIds.add(d.id);
                links.forEach(l => {
                    if (l.source.id === d.id) neighborIds.add(l.target.id);
                    if (l.target.id === d.id) neighborIds.add(l.source.id);
                });

                node.style('opacity', n => neighborIds.has(n.id) ? 1 : 0.1);
                link.style('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#38bdf8' : 'rgba(56, 189, 248, 0.05)')
                    .style('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.2);
            })
            .on('mouseout', function() {
                node.style('opacity', 1);
                link.style('stroke', 'rgba(56, 189, 248, 0.1)')
                    .style('stroke-opacity', 0.6);
            });

        // 노드 원형 스타일
        node.append('circle')
            .attr('r', d => d.weight)
            .style('fill', d => d.is_encrypted ? '#64748b' : '#38bdf8')
            .style('filter', 'url(#glow)')
            .style('cursor', 'pointer');

        // 노드 텍스트 라벨
        node.append('text')
            .attr('dy', d => d.weight + 15)
            .text(d => {
                const untitled = I18nManager.t('label_untitled');
                const title = d.title || untitled;
                return d.is_encrypted ? `🔒 ${title}` : title;
            })
            .style('fill', d => d.is_encrypted ? '#94a3b8' : '#cbd5e1')
            .style('font-size', '10px')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');

        // 8. 틱(Tick)마다 좌표 업데이트
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        // 드래그 함수
        const self = this;
        function dragstarted(event, d) {
            if (!event.active) self.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) self.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    },

    resize() {
        if (!this.container || !this.svg) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(0.3).restart();
    }
};
