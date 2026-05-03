/**
 * 작성기 카테고리/핀 UI 렌더링 엔진
 */
import { I18nManager } from '../../utils/I18nManager.js';
import { ThemeEngine } from '../ThemeEngine.js';

export const ComposerCategoryUI = {
    /**
     * 카테고리 칩 및 상태 UI 렌더링
     */
    render(container, selectedCategory, isDoneStatus, handlers) {
        if (!container) return;
        
        const settings = ThemeEngine.settings || {};
        const slots = settings.pinned_categories || [];
        
        container.innerHTML = '';
        // 💡 인라인 스타일 대신 클래스로 관리하거나 layout.css의 #composerCategoryBar 설정을 따름

        // 1. 완료 칩 (Alt + 1)
        const doneChip = document.createElement('div');
        doneChip.className = `cat-chip done-chip ${isDoneStatus ? 'active' : ''}`;
        doneChip.innerHTML = `<span class="icon">✅</span> <span class="text">${I18nManager.t('label_category_done')}</span> <kbd>Alt+1</kbd>`;
        doneChip.onclick = () => handlers.onToggleDone();
        container.appendChild(doneChip);

        // 2. 외부 카테고리 강조칩 (핀에 없지만 지정된 경우)
        const isExternal = selectedCategory && !slots.includes(selectedCategory);
        if (isExternal) {
            const extChip = document.createElement('div');
            extChip.className = 'cat-chip external-active active';
            extChip.innerHTML = `<span class="icon">📍</span> ${selectedCategory}`;
            extChip.title = `Current: ${selectedCategory}`;
            extChip.onclick = () => handlers.onSelect(selectedCategory);
            container.appendChild(extChip);
            
            const divider = document.createElement('div');
            divider.className = 'chip-divider';
            // 구분선 스타일은 CSS에서 관리하거나 최소한으로 유지
            divider.style.cssText = 'width: 1px; height: 12px; background: var(--muted); opacity: 0.3; margin: 0 5px;';
            container.appendChild(divider);
        }

        // 3. 핀 슬롯(1~3번) 렌더링
        slots.forEach((cat, idx) => {
            const slotNum = idx + 2; // 완료(1) 다음부터 시작
            const key = `shortcut_cat_${idx + 1}`;
            const label = I18nManager.t(key).replace('%s', cat);
            
            const chip = document.createElement('div');
            chip.className = `cat-chip ${selectedCategory === cat ? 'active' : ''}`;
            chip.innerHTML = `<span class="icon">🏷️</span> <span class="text">${cat}</span> <kbd>Alt+${slotNum}</kbd>`;
            chip.title = label;
            chip.onclick = () => handlers.onSelect(cat);
            container.appendChild(chip);
        });

        // 4. Alt+5: 분류 해제 힌트
        const clearHint = document.createElement('div');
        clearHint.className = 'shortcut-hint';
        clearHint.textContent = I18nManager.t('shortcut_cat_clear');
        container.appendChild(clearHint);
    },

    /**
     * 슬롯 인덱스 기반으로 어떤 카테고리를 토글할지 결정
     */
    getCategoryBySlot(index) {
        const settings = ThemeEngine.settings || {};
        const slots = settings.pinned_categories || [];
        return slots[index - 1] || null;
    }
};
