/**
 * 메모 간의 상호 참조 관계(Relations) 분석 및 시각적 포커스 관리 모듈 (Orchestrator)
 */
import { RelationAnalyzer } from './relation/RelationAnalyzer.js';
import { RelationRenderer } from './relation/RelationRenderer.js';

export const RelationManager = {
    state: {
        focusedId: null
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
        this.clearFocus();
        this.state.focusedId = id;
        
        const neighbors = RelationAnalyzer.findRelations(id, allMemos);
        
        // 1. DOM 클래스 적용
        const cards = document.querySelectorAll('.memo-card');
        const cardMap = new Map();

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

        // 2. 화살표 그리기 (Renderer 위임)
        RelationRenderer.drawArrows(id, neighbors, cardMap);

        // 3. 전역 이벤트 등록
        this.bindGlobalReset();
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

        RelationRenderer.clear();
        this.unbindGlobalReset();
    },

    /**
     * 배경 클릭, ESC 키, 또는 리사이즈/스크롤 시 핸들러
     */
    bindGlobalReset() {
        if (this.onGlobalClick) return; // 중복 방지

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

        // 리사이즈/스크롤 시 좌표 갱신 (Redraw)
        this.onRedraw = () => {
            if (this.state.focusedId) {
                const cards = document.querySelectorAll('.memo-card');
                const cardMap = new Map();
                cards.forEach(c => cardMap.set(parseInt(c.dataset.id), c));
                
                // window.AppService가 없는 환경을 대비한 방어 코드
                const allMemos = window.AppService ? window.AppService.state.allMemos : [];
                const neighbors = RelationAnalyzer.findRelations(this.state.focusedId, allMemos);
                RelationRenderer.drawArrows(this.state.focusedId, neighbors, cardMap);
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
