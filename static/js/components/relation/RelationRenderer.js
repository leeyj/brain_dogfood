/**
 * 관계 화살표 시각화 및 SVG 렌더링 담당 모듈 (RelationRenderer)
 */
export const RelationRenderer = {
    state: {
        svg: null
    },

    /**
     * SVG 오버레이 초기화
     */
    initSVG() {
        if (this.state.svg) return this.state.svg;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'relation-focus-svg';
        svg.style.position = 'fixed';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100vw';
        svg.style.height = '100vh';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '95'; 
        
        // 화살표 정의
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // 1. 나가는 링크용 (Solid)
        const markerOut = this.createMarker('arrow-out', 'var(--accent)');
        // 2. 들어오는 링크용 (Amber)
        const markerIn = this.createMarker('arrow-in', '#fbbf24');

        defs.appendChild(markerOut);
        defs.appendChild(markerIn);
        svg.appendChild(defs);
        
        document.body.appendChild(svg);
        this.state.svg = svg;
        return svg;
    },

    createMarker(id, color) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', id);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', '0 0, 10 3.5, 0 7');
        poly.setAttribute('fill', color);
        marker.appendChild(poly);
        return marker;
    },

    /**
     * 화살표 그리기
     */
    drawArrows(focusId, neighbors, cardMap) {
        const svg = this.initSVG();
        svg.innerHTML = svg.querySelector('defs').outerHTML; 
        
        const focusCard = cardMap.get(focusId);
        if (!focusCard) return;
        const fRect = focusCard.getBoundingClientRect();

        neighbors.forEach((type, nId) => {
            const nCard = cardMap.get(nId);
            if (!nCard) return;
            const nRect = nCard.getBoundingClientRect();

            const p1 = this.getEdgePoint(fRect, nRect);
            const p2 = this.getEdgePoint(nRect, fRect);

            if (type === 'out' || type === 'both') {
                this.createLine(p1.x, p1.y, p2.x, p2.y, 'out');
            }
            if (type === 'in' || type === 'both') {
                this.createLine(p2.x, p2.y, p1.x, p1.y, 'in');
            }
        });
    },

    createLine(x1, y1, x2, y2, type) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const margin = 5;
        
        line.setAttribute('x1', x1 + Math.cos(angle) * margin);
        line.setAttribute('y1', y1 + Math.sin(angle) * margin);
        line.setAttribute('x2', x2 - Math.cos(angle) * margin);
        line.setAttribute('y2', y2 - Math.sin(angle) * margin);
        
        if (type === 'out') {
            line.setAttribute('stroke', 'var(--accent)');
            line.setAttribute('marker-end', 'url(#arrow-out)');
            line.setAttribute('stroke-width', '2');
        } else {
            line.setAttribute('stroke', '#fbbf24');
            line.setAttribute('marker-end', 'url(#arrow-in)');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '4,4');
        }
        
        line.style.opacity = '0.6';
        this.state.svg.appendChild(line);
    },

    /**
     * 기하학 계산: 두 사각형의 중앙을 잇는 선이 첫 번째 사각형의 외곽선과 만나는 지점
     */
    getEdgePoint(rectA, rectB) {
        const cxA = rectA.left + rectA.width / 2;
        const cyA = rectA.top + rectA.height / 2;
        const cxB = rectB.left + rectB.width / 2;
        const cyB = rectB.top + rectB.height / 2;

        const dx = cxB - cxA;
        const dy = cyB - cyA;

        if (dx === 0 && dy === 0) return { x: cxA, y: cyA };

        const halfW = rectA.width / 2;
        const halfH = rectA.height / 2;
        const slope = dy / dx;
        const rectSlope = halfH / halfW;

        let x, y;
        if (Math.abs(slope) <= rectSlope) {
            const sign = dx > 0 ? 1 : -1;
            x = cxA + sign * halfW;
            y = cyA + sign * halfW * slope;
        } else {
            const sign = dy > 0 ? 1 : -1;
            y = cyA + sign * halfH;
            x = cxA + (sign * halfH) / slope;
        }
        return { x, y };
    },

    clear() {
        if (this.state.svg) {
            this.state.svg.remove();
            this.state.svg = null;
        }
    }
};
