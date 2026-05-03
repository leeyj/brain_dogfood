import { I18nManager } from '../utils/I18nManager.js';

export const GraphRenderer = {
    render(container, width, height, graphData, onNodeClick, simulationRef) {
        const { nodes, links, groupCenters, uniqueGroups } = graphData;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('background', 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)')
            .attr('viewBox', `0 0 ${width} ${height}`);

        const starCount = 100;
        const stars = Array.from({ length: starCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5,
            opacity: Math.random()
        }));

        svg.selectAll('.star')
            .data(stars)
            .enter()
            .append('circle')
            .attr('class', 'star')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r)
            .style('fill', '#fff')
            .style('opacity', d => d.opacity);

        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow');
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3.5')
            .attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const g = svg.append('g').attr('class', 'main-g');

        const zoom = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);

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

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.1))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('collide', d3.forceCollide().radius(d => d.weight + 20))
            .force('x', d3.forceX(d => groupCenters[d.group].x).strength(0.08))
            .force('y', d3.forceY(d => groupCenters[d.group].y).strength(0.08))
            .force('center', d3.forceCenter(width / 2, height / 2).strength(0.01));
            
        // store reference in the parent object
        simulationRef.simulation = simulation;

        const link = g.selectAll('.link')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .style('stroke', d => {
                if (d.type === 'explicit') return '#38bdf8';
                if (d.type === 'tag') return '#8b5cf6';
                return 'rgba(56, 189, 248, 0.05)';
            })
            .style('stroke-width', d => d.type === 'explicit' ? 2 : 1)
            .style('stroke-dasharray', d => d.type === 'group' ? '2,2' : 'none')
            .style('opacity', d => d.type === 'group' ? 0.3 : 0.6);

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

        node.append('circle')
            .attr('r', d => d.weight)
            .style('fill', d => d.is_encrypted ? '#64748b' : '#38bdf8')
            .style('filter', 'url(#glow)')
            .style('cursor', 'pointer');

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

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return svg;
    }
};
