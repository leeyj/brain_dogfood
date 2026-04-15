/**
 * 사이드바 그룹 목록 컴포넌트
 */
import { escapeHTML } from '../utils.js';
import { Constants } from '../utils/Constants.js';
import { I18nManager } from '../utils/I18nManager.js';

/**
 * 그룹 목록 HTML 렌더링
 */
export function renderGroupList(container, groups, activeGroup, onGroupClick) {
    if (!container) return;
    
    container.innerHTML = '';
    groups.forEach(group => {
        const li = document.createElement('li');
        const isActive = group === activeGroup || (group === Constants.GROUPS.DEFAULT && activeGroup === 'all');
        li.className = isActive ? 'active' : '';
        
        // 아이콘 선택 및 클래스 추가
        let icon = '📁';
        if (group === Constants.GROUPS.DEFAULT || group === 'all') icon = '💡';
        else if (group === Constants.GROUPS.FILES) icon = '📂';
        else if (group === Constants.GROUPS.DONE) icon = '✅';
        else if (group.startsWith('tag:')) {
            const parts = group.split(':'); // tag:source:name
            const source = parts[1];
            icon = source === 'ai' ? '🪄' : '🏷️';
            li.classList.add(source === 'ai' ? 'tag-ai' : 'tag-user');
        }
        
        // 표시 이름 결정
        let label = group;
        if (group === 'all') label = I18nManager.t('groups.all');
        else if (group === Constants.GROUPS.DEFAULT) label = I18nManager.t('groups.default');
        else if (group === Constants.GROUPS.FILES) label = I18nManager.t('groups.files');
        else if (group === Constants.GROUPS.DONE) label = I18nManager.t('groups.done');
        else if (group.startsWith('tag:')) {
            const parts = group.split(':');
            label = parts[2]; // 태그 이름
        }
        
        li.innerHTML = `<span class="icon">${icon}</span> <span class="text">${escapeHTML(label)}</span>`;
        li.onclick = () => onGroupClick(group);
        container.appendChild(li);
    });
}
