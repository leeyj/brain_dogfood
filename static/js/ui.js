/**
 * UI 렌더링 및 이벤트를 관리하는 오케스트레이터 (Orchestrator)
 */
import { API } from './api.js';
import { createMemoCardHtml } from './components/MemoCard.js';
import { renderGroupList } from './components/SidebarUI.js';
import { ThemeManager } from './components/ThemeManager.js';
import { ModalManager } from './components/ModalManager.js';
import { I18nManager } from './utils/I18nManager.js';

const DOM = {
    memoGrid: document.getElementById('memoGrid'),
    groupList: document.getElementById('groupList'),
    modal: document.getElementById('memoModal'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    searchInput: document.getElementById('searchInput'),
    sidebar: document.getElementById('sidebar'),
    systemNav: document.getElementById('systemNav'),
    scrollSentinel: document.getElementById('scrollSentinel')
};

export const UI = {
    /**
     * 사이드바 및 로그아웃 버튼 초기화
     */
    initSidebarToggle() {
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = DOM.sidebar;
        const overlay = document.getElementById('sidebarOverlay');
        const logoutBtn = document.getElementById('logoutBtn');

        if (toggle && sidebar) {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                const calendar = document.getElementById('calendarContainer');
                if (calendar) calendar.style.display = 'none';
            }
            
            const toggleSidebar = () => {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    sidebar.classList.toggle('mobile-open');
                    overlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
                } else {
                    sidebar.classList.toggle('collapsed');
                    const collapsed = sidebar.classList.contains('collapsed');
                    localStorage.setItem('sidebarCollapsed', collapsed);
                    
                    const calendar = document.getElementById('calendarContainer');
                    if (calendar) calendar.style.display = collapsed ? 'none' : 'block';
                }
            };

            toggle.onclick = toggleSidebar;
            const mobileBtn = document.getElementById('mobileMenuBtn');
            if (mobileBtn) mobileBtn.onclick = toggleSidebar;

            if (overlay) {
                overlay.onclick = () => {
                    sidebar.classList.remove('mobile-open');
                    overlay.style.display = 'none';
                };
            }
        }

        if (logoutBtn) {
            logoutBtn.onclick = () => {
                if (confirm(I18nManager.t('msg_logout_confirm'))) {
                    window.location.href = '/logout';
                }
            };
        }
    },

    /**
     * 환경 설정 및 테마 엔진 초기화 (ThemeManager 위임)
     */
    async initSettings() {
        return await ThemeManager.initSettings();
    },

    /**
     * 무한 스크롤 초기화
     */
    initInfiniteScroll(onLoadMore) {
        if (!DOM.scrollSentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                onLoadMore();
            }
        }, { threshold: 0.1 });

        observer.observe(DOM.scrollSentinel);
    },

    /**
     * 사이드바 시스템 고정 메뉴 상태 갱신
     */
    updateSidebar(memos, activeGroup, onGroupClick) {
        if (!DOM.systemNav) return;
        
        DOM.systemNav.querySelectorAll('li').forEach(li => {
            const group = li.dataset.group;
            li.className = (group === activeGroup) ? 'active' : '';
            li.onclick = () => onGroupClick(group);
        });
    },

    /**
     * 메모 목록 메인 렌더링 (서버 사이드 필터링 결과 기반)
     */
    renderMemos(memos, filters = {}, handlers, isAppend = false) {
        if (!isAppend) {
            DOM.memoGrid.innerHTML = '';
        }
        
        if (!memos || memos.length === 0) {
            if (!isAppend) {
                DOM.memoGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--muted);">${I18nManager.t('label_no_results')}</div>`;
            }
            return;
        }

        memos.forEach(memo => {
            const { className, style, innerHtml } = createMemoCardHtml(memo, memo.status === 'done');
            const card = document.createElement('div');
            card.className = className;
            card.dataset.id = memo.id; // ID 저장
            if (style) card.setAttribute('style', style);
            card.innerHTML = innerHtml;
            card.style.cursor = 'pointer';
            card.title = I18nManager.t('tooltip_edit_hint');
            card.onclick = (e) => {
                // 버튼(삭제, 핀 등) 클릭 시에는 무시
                if (e.target.closest('.action-btn')) return;

                if (e.altKey) {
                    // Alt + 클릭: 즉시 수정 모드
                    handlers.onEdit(memo.id);
                } else {
                    // 일반 클릭: 상세 모달 열기
                    this.openMemoModal(memo.id, window.allMemosCache || memos);
                }
            };
            DOM.memoGrid.appendChild(card);
            
            // 신규 카드에만 이벤트 바인딩
            this.bindCardEventsToElement(card, handlers);
        });

        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.innerText = I18nManager.t('msg_loading');
        }
    },

    /**
     * 특정 요소(카드) 내부에 이벤트 바인딩
     */
    bindCardEventsToElement(card, handlers) {
        const id = card.dataset.id;
        const bind = (selector, handler) => {
            const btn = card.querySelector(selector);
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    handler(id);
                };
            }
        };

        bind('.edit-btn', handlers.onEdit);
        bind('.delete-btn', handlers.onDelete);
        bind('.ai-btn', handlers.onAI);
        bind('.toggle-pin', handlers.onTogglePin);
        bind('.toggle-status', handlers.onToggleStatus);
        bind('.link-item', (linkId) => this.openMemoModal(linkId, window.allMemosCache || []));
        bind('.unlock-btn', handlers.onUnlock);
    },

    /**
     * 모달 열기 위임 (ModalManager 위임)
     */
    openMemoModal(id, memos) {
        ModalManager.openMemoModal(id, memos);
    },

    showLoading(show) {
        DOM.loadingOverlay.style.display = show ? 'flex' : 'none';
        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.style.display = show ? 'none' : 'flex';
        }
    },
    
    setHasMore(hasMore) {
        if (DOM.scrollSentinel) {
            DOM.scrollSentinel.style.visibility = hasMore ? 'visible' : 'hidden';
            DOM.scrollSentinel.innerText = hasMore ? I18nManager.t('msg_loading') : I18nManager.t('msg_last_memo');
        }
    }
};

/**
 * 전역 파일 다운로드 함수 (항상 전역 스코프 유지)
 */
window.downloadFile = async function(filename, originalName) {
    try {
        const res = await fetch(`/api/download/${filename}`);
        if (!res.ok) {
            if (res.status === 403) alert(I18nManager.t('msg_permission_denied'));
            else alert(`${I18nManager.t('msg_download_failed')}: ${res.statusText}`);
            return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = originalName;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { alert(`${I18nManager.t('msg_download_error')}: ` + err.message); }
};
