/**
 * 메모 간의 관계 분석 로직 담당 모듈 (RelationAnalyzer)
 */
export const RelationAnalyzer = {
    /**
     * 특정 메모와 관련된 상호 참조(Incoming & Outgoing) 관계 분석
     * @param {number} id - 중심 메모 ID
     * @param {Array} allMemos - 전체 메모 데이터 배열
     * @returns {Map} neighbors - id -> type ('in'|'out'|'both')
     */
    findRelations(id, allMemos) {
        const neighbors = new Map(); // id -> type
        const targetMemo = allMemos.find(m => m.id === id);
        const linkRegex = /\[\[#(\d+)\]\]/g;

        // 1. Outgoing Links (내가 참조하는 메모들)
        if (targetMemo && !targetMemo.is_encrypted && targetMemo.content) {
            let match;
            while ((match = linkRegex.exec(targetMemo.content)) !== null) {
                const outId = parseInt(match[1]);
                neighbors.set(outId, 'out');
            }
        }

        // 2. Incoming Links (나를 참조하는 메모들)
        const idPattern = `[[#${id}]]`;
        allMemos.forEach(memo => {
            if (memo.id === id) return;
            if (memo.is_encrypted || !memo.content) return;

            if (memo.content.includes(idPattern)) {
                const existingType = neighbors.get(memo.id);
                neighbors.set(memo.id, existingType === 'out' ? 'both' : 'in');
            }
        });

        return neighbors;
    }
};
