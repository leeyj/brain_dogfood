/**
 * Masonry(그리드) 레이아웃 엔진
 */
import { renderMemoCard } from '../MemoCard.js';
import { AppService } from '../../AppService.js';
import { Constants } from '../../utils/Constants.js';

export const MasonryLayout = {
    name: 'masonry',
    
    render(container, memos, handlers, options = {}) {
        const { isAppend = false, isResize = false } = options;
        const S = Constants.SELECTORS;

        // 1. 컬럼 초기화 (isAppend가 아닐 때만)
        if (!isAppend) {
            container.innerHTML = '';
            const gridWidth = container.offsetWidth || window.innerWidth;
            const columnCount = Math.max(1, Math.floor(gridWidth / 262)); // 250px + 12px(gap)
            
            for (let i = 0; i < columnCount; i++) {
                const col = document.createElement('div');
                col.className = 'masonry-column';
                col.dataset.index = i;
                container.appendChild(col);
            }
        }

        const columns = Array.from(container.querySelectorAll(S.MASONRY_COLUMN));
        if (columns.length === 0) return;

        // 2. 메모 배치
        memos.forEach(memo => {
            // 해독 상태 반영
            const unlocked = AppService.state.unlockedMemos.get(String(memo.id));
            if (unlocked) {
                memo.content = unlocked.content;
                memo.is_encrypted = false;
                memo.was_encrypted = true;
            }

            const card = renderMemoCard(memo, handlers, { mode: 'full' });
            
            if (isAppend) card.classList.add('memo-new');
            else if (isResize) card.classList.add('memo-refresh');

            // 가장 짧은 컬럼에 배치
            const targetCol = columns.reduce((prev, curr) => 
                (prev.children.length <= curr.children.length) ? prev : curr
            );
            targetCol.appendChild(card);
        });
    }
};
