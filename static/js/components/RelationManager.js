/**
 * 메모 간의 상호 참조 관계(Relations) 분석 및 시각적 포커스 관리 모듈
 */
export const RelationManager = {
    state: {
        focusedId: null,
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
        svg.style.zIndex = '95'; // 카드(.focused)보다는 낮고 일반 카드보다는 높게
        
        // 💡 화살표 정의
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // 1. 나가는 링크용 (Solid)
        const markerOut = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        markerOut.setAttribute('id', 'arrow-out');
        markerOut.setAttribute('markerWidth', '10');
        markerOut.setAttribute('markerHeight', '7');
        markerOut.setAttribute('refX', '9');
        markerOut.setAttribute('refY', '3.5');
        markerOut.setAttribute('orient', 'auto');
        const polyOut = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polyOut.setAttribute('points', '0 0, 10 3.5, 0 7');
        polyOut.setAttribute('fill', 'var(--accent)');
        markerOut.appendChild(polyOut);
        
        // 2. 들어오는 링크용 (Dashed)
        const markerIn = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        markerIn.setAttribute('id', 'arrow-in');
        markerIn.setAttribute('markerWidth', '10');
        markerIn.setAttribute('markerHeight', '7');
        markerIn.setAttribute('refX', '9');
        markerIn.setAttribute('refY', '3.5');
        markerIn.setAttribute('orient', 'auto');
        const polyIn = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polyIn.setAttribute('points', '0 0, 10 3.5, 0 7');
        polyIn.setAttribute('fill', '#fbbf24'); // Amber for incoming
        markerIn.appendChild(polyIn);

        defs.appendChild(markerOut);
        defs.appendChild(markerIn);
        svg.appendChild(defs);
        
        document.body.appendChild(svg);
        this.state.svg = svg;
        return svg;
    },

    /**
     * 특정 메모를 중심으로 관계 포커스 모드 토글
     */
    toggleFocus(targetId, allMemos) {
        const id = parseInt(targetId);
        
        if (this.state.focusedId === id) {
            this.clearFocus();
            return;
        }

        this.applyFocus(id, allMemos);
    },

    /**
     * 포커스 적용 로직
     */
    applyFocus(id, allMemos) {
        this.clearFocus(); // 기존 것 초기화
        this.state.focusedId = id;
        
        const relations = this.findRelations(id, allMemos);
        const neighbors = relations.neighbors; // Map { id -> type ('in'|'out'|'both') }
        
        // 1. DOM 클래스 적용
        const cards = document.querySelectorAll('.memo-card');
        const cardMap = new Map(); // id -> element

        cards.forEach(card => {
            const cardId = parseInt(card.dataset.id);
            cardMap.set(cardId, card);
            
            card.classList.remove('relation-focused', 'relation-neighbor', 'relation-dimmed');

            if (cardId === id) {
                card.classList.add('relation-focused');
            } else if (neighbors.has(cardId)) {
                card.classList.add('relation-neighbor');
            } else {
                card.classList.add('relation-dimmed');
            }
        });

        // 2. 화살표 그리기
        this.drawArrows(id, neighbors, cardMap);

        // 3. 전역 이벤트 등록
        this.bindGlobalReset();
    },

    /**
     * 화살표 그리기 (외곽선 연결 방식)
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

            // 💡 중앙 좌표 대신 외곽선 교차점 계산
            const p1 = this.getEdgePoint(fRect, nRect);
            const p2 = this.getEdgePoint(nRect, fRect);

            // Outgoing: Focus -> Neighbor
            if (type === 'out' || type === 'both') {
                this.createLine(p1.x, p1.y, p2.x, p2.y, 'out');
            }
            // Incoming: Neighbor -> Focus
            if (type === 'in' || type === 'both') {
                this.createLine(p2.x, p2.y, p1.x, p1.y, 'in');
            }
        });
    },

    /**
     * 두 사각형의 중앙을 잇는 선이 첫 번째 사각형의 외곽선과 만나는 지점 계산
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

        // 기울기에 따라 어느 변과 만나는지 판별
        const slope = dy / dx;
        const rectSlope = halfH / halfW;

        let x, y;
        if (Math.abs(slope) <= rectSlope) {
            // 왼쪽 또는 오른쪽 변과 만남
            const sign = dx > 0 ? 1 : -1;
            x = cxA + sign * halfW;
            y = cyA + sign * halfW * slope;
        } else {
            // 위쪽 또는 아래쪽 변과 만남
            const sign = dy > 0 ? 1 : -1;
            y = cyA + sign * halfH;
            x = cxA + (sign * halfH) / slope;
        }

        return { x, y };
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
        
        line.style.opacity = '0.6'; // 트랜지션 없이 즉시 표시 (스크롤 시 플리커링 방지)
        this.state.svg.appendChild(line);
    },

    /**
     * 관계 분석 (Incoming & Outgoing)
     */
    findRelations(id, allMemos) {
        const neighbors = new Map(); // id -> type
        const targetMemo = allMemos.find(m => m.id === id);
        const linkRegex = /\[\[#(\d+)\]\]/g;

        // 💡 1. Outgoing Links
        if (targetMemo && !targetMemo.is_encrypted && targetMemo.content) {
            let match;
            while ((match = linkRegex.exec(targetMemo.content)) !== null) {
                const outId = parseInt(match[1]);
                neighbors.set(outId, 'out');
            }
        }

        // 💡 2. Incoming Links
        const idPattern = `[[#${id}]]`;
        allMemos.forEach(memo => {
            if (memo.id === id) return;
            if (memo.is_encrypted || !memo.content) return;

            if (memo.content.includes(idPattern)) {
                const existingType = neighbors.get(memo.id);
                neighbors.set(memo.id, existingType === 'out' ? 'both' : 'in');
            }
        });

        return { neighbors };
    },

    /**
     * 포커스 모드 해제
     */
    clearFocus() {
        this.state.focusedId = null;
        const cards = document.querySelectorAll('.memo-card');
        cards.forEach(card => {
            card.classList.remove('relation-focused', 'relation-neighbor', 'relation-dimmed');
        });

        if (this.state.svg) {
            this.state.svg.remove();
            this.state.svg = null;
        }

        this.unbindGlobalReset();
    },

    /**
     * 배경 클릭, ESC 키, 또는 리사이즈/스크롤 시 핸들러
     */
    bindGlobalReset() {
        this.onGlobalClick = (e) => {
            if (!e.target.closest('.memo-card')) {
                this.clearFocus();
            }
        };

        this.onEscKey = (e) => {
            if (e.key === 'Escape') {
                this.clearFocus();
            }
        };

        // 💡 리사이즈/스크롤 시 좌표 갱신 (Redraw)
        this.onRedraw = () => {
            if (this.state.focusedId) {
                const cards = document.querySelectorAll('.memo-card');
                const cardMap = new Map();
                cards.forEach(c => cardMap.set(parseInt(c.dataset.id), c));
                
                const relations = this.findRelations(this.state.focusedId, window.AppService.state.allMemos);
                this.drawArrows(this.state.focusedId, relations.neighbors, cardMap);
            }
        };

        document.addEventListener('mousedown', this.onGlobalClick, true);
        document.addEventListener('keydown', this.onEscKey);
        window.addEventListener('resize', this.onRedraw);
        
        const scrollContainer = document.querySelector('.content');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', this.onRedraw, { passive: true });
        }
    },

    unbindGlobalReset() {
        if (this.onGlobalClick) {
            document.removeEventListener('mousedown', this.onGlobalClick, true);
            this.onGlobalClick = null;
        }
        if (this.onEscKey) {
            document.removeEventListener('keydown', this.onEscKey);
            this.onEscKey = null;
        }
        if (this.onRedraw) {
            window.removeEventListener('resize', this.onRedraw);
            const scrollContainer = document.querySelector('.content');
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', this.onRedraw);
            }
            this.onRedraw = null;
        }
    }
};
