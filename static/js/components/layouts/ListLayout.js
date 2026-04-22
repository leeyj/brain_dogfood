/**
 * 리스트(목록) 레이아웃 엔진
 * v2.1: 좌우 여백 최적화 및 고밀도 콤팩트 리스트 구현
 */
import { renderMemoCard } from '../MemoCard.js';
import { AppService } from '../../AppService.js';

export const ListLayout = {
    name: 'list',

    render(container, memos, handlers, options = {}) {
        const { isAppend = false } = options;

        // 1. 초기화 (isAppend가 아닐 때만)
        if (!isAppend) {
            container.innerHTML = '';
            // 리스트 전용 컨테이너 생성 (좌우 공간을 최대한 확보하도록 width/max-width 조정)
            const listWrapper = document.createElement('div');
            listWrapper.className = 'list-layout-wrapper';
            listWrapper.style.cssText = `
                width: 95%; 
                max-width: 1400px; 
                margin: 0 auto; 
                display: flex; 
                flex-direction: column; 
                gap: 6px; 
                padding: 10px 0;
            `;
            container.appendChild(listWrapper);
        }

        const listWrapper = container.querySelector('.list-layout-wrapper');
        if (!listWrapper) return;

        // 2. 메모 배치
        memos.forEach(memo => {
            // 해독 상태 반영
            const unlocked = AppService.state.unlockedMemos.get(String(memo.id));
            if (unlocked) {
                memo.content = unlocked.content;
                memo.is_encrypted = false;
                memo.was_encrypted = true;
            }

            // 'compact' 모드로 카드 생성 (제목, 태그, 날짜가 한 줄에 배치됨)
            const card = renderMemoCard(memo, handlers, { 
                mode: 'compact',
                showActions: true 
            });
            
            // 리스트 스타일 조정
            card.style.width = '100%';
            if (isAppend) card.classList.add('memo-new');

            listWrapper.appendChild(card);
        });
    }
};
