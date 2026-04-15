/**
 * 지식 탐색 서랍(Drawer) 관리 모듈
 */
import { escapeHTML } from '../utils.js';
import { I18nManager } from '../utils/I18nManager.js';
import { Constants } from '../utils/Constants.js';

export const DrawerManager = {
    DOM: {},

    init() {
        this.DOM.drawer = document.getElementById('knowledgeDrawer');
        this.DOM.drawerContent = document.getElementById('drawerContent');
        const header = this.DOM.drawer?.querySelector('.drawer-header');
        
        if (!this.DOM.drawer || !header) return;
        
        // 닫기 버튼 이벤트
        const closeBtn = document.getElementById('closeDrawerBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.close();
        }

        // --- 드래그 앤 드롭 로직 구현 ---
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.close-btn')) return; // 닫기 버튼 클릭 시 드래그 방지
            
            isDragging = true;
            this.DOM.drawer.classList.add('dragging');
            
            // 마우스 클릭 위치와 요소 좌상단 사이의 거리 계산
            const rect = this.DOM.drawer.getBoundingClientRect();
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            // 새로운 위치 계산
            let left = e.clientX - offset.x;
            let top = e.clientY - offset.y;
            
            // 화면 경계 이탈 방지
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const cardW = this.DOM.drawer.offsetWidth;
            const cardH = this.DOM.drawer.offsetHeight;

            left = Math.max(0, Math.min(left, winW - cardW));
            top = Math.max(0, Math.min(top, winH - cardH));

            this.DOM.drawer.style.left = `${left}px`;
            this.DOM.drawer.style.top = `${top}px`;
            this.DOM.drawer.style.bottom = 'auto'; // bottom 제거
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.DOM.drawer?.classList.remove('dragging');
        });
    },

    open(memos = [], activeFilter, onFilterCallback) {
        if (!this.DOM.drawer || !this.DOM.drawerContent) return;

        // 0. 데이터 유효성 검사
        if (!memos || memos.length === 0) {
            this.DOM.drawerContent.innerHTML = `<p style="color:var(--muted); text-align:center; padding:20px;">${I18nManager.t('label_no_results')}</p>`;
            this.DOM.drawer.classList.add('active');
            return;
        }
        // 1. 그룹 및 태그 카운트 계산
        const groupAllKey = 'all';
        const groupCounts = { [groupAllKey]: memos.length };
        const tagCounts = {};
        const tagsSourceMap = new Map();

        memos.forEach(m => {
            const g = m.group_name || Constants.GROUPS.DEFAULT;
            groupCounts[g] = (groupCounts[g] || 0) + 1;
            
            if (m.tags) {
                m.tags.forEach(t => {
                    tagCounts[t.name] = (tagCounts[t.name] || 0) + 1;
                    const current = tagsSourceMap.get(t.name);
                    if (!current || t.source === 'user') tagsSourceMap.set(t.name, t.source);
                });
            }
        });

        const sortedGroups = Object.keys(groupCounts).filter(g => g !== groupAllKey).sort();
        const sortedTags = Object.keys(tagCounts).sort().map(tn => ({
            name: tn,
            source: tagsSourceMap.get(tn),
            count: tagCounts[tn]
        }));

        // 2. HTML 렌더링
        let html = `
            <div class="explorer-section">
                <h3>${I18nManager.t('drawer_title_groups')}</h3>
                <div class="explorer-grid">
                    <div class="explorer-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
                        💡 ${I18nManager.t('nav_all')} <span class="chip-count">${groupCounts[groupAllKey]}</span>
                    </div>
                    ${sortedGroups.map(g => `
                        <div class="explorer-chip ${activeFilter === g ? 'active' : ''}" data-filter="${escapeHTML(g)}">
                            📁 ${escapeHTML(g)} <span class="chip-count">${groupCounts[g]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="explorer-section" style="margin-top:20px;">
                <h3>${I18nManager.t('drawer_title_tags')}</h3>
                <div class="explorer-grid">
                    ${sortedTags.map(t => `
                        <div class="explorer-chip ${t.source === 'ai' ? 'tag-ai' : 'tag-user'} ${activeFilter === `tag:${t.source}:${t.name}` ? 'active' : ''}" 
                             data-filter="tag:${t.source}:${escapeHTML(t.name)}">
                            ${t.source === 'ai' ? '🪄' : '🏷️'} ${escapeHTML(t.name)} <span class="chip-count">${t.count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.DOM.drawerContent.innerHTML = html;
        this.DOM.drawer.classList.add('active');

        // 3. 이벤트 바인딩
        this.DOM.drawerContent.querySelectorAll('.explorer-chip').forEach(chip => {
            chip.onclick = () => {
                const filter = chip.dataset.filter;
                onFilterCallback(filter);
                // 선택 시 서랍을 닫을지 유지할지는 UX 선택 (일단 닫음)
                // this.close(); 
            };
        });
    },

    close() {
        if (this.DOM.drawer) {
            this.DOM.drawer.classList.remove('active');
        }
    }
};
