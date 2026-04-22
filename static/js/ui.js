/**
 * UI 렌더링 및 이벤트를 관리하는 오케스트레이터 (Orchestrator)
 * v6.0: LayoutManager 및 SidebarManager로 모듈 분기 완료
 */
import { VisualLinker } from './components/VisualLinker.js';
import { ThemeManager } from './components/ThemeManager.js';
import { I18nManager } from './utils/I18nManager.js';
import { LayoutManager } from './components/LayoutManager.js';
import { SidebarManager } from './components/SidebarManager.js';
import { debounce } from './utils.js';

export const UI = {
    // --- 🔹 Sidebar & Category 모듈 위임 ---
    initSidebarToggle: () => SidebarManager.initSidebarToggle(),
    updateSidebar: (...args) => SidebarManager.updateSidebar(...args),
    applyCategoryVisibility: (enabled) => SidebarManager.applyCategoryVisibility(enabled),

    // --- 🔹 Layout & Grid 모듈 위임 ---
    renderMemos: (...args) => LayoutManager.renderMemos(...args),
    initResizeHandler: (handlers) => LayoutManager.initResizeHandler(handlers),
    showLoading: (show) => LayoutManager.showLoading(show),
    setHasMore: (hasMore) => LayoutManager.setHasMore(hasMore),
    isSentinelVisible: () => LayoutManager.isSentinelVisible(),

    /**
     * 환경 설정 캐시 업데이트 (ThemeManager/CategoryManager 호환성 유지)
     */
    _updateSettingsCache(settings) {
        // 내부 캐시가 필요한 컴포넌트가 있다면 여기서 배분할 수 있습니다.
        // 현재는 ThemeManager.settings를 직접 참조하도록 설계되었습니다.
    },
    
    // --- 🔹 공통 초기화 및 유틸리티 ---
    async initSettings() {
        return await ThemeManager.initSettings();
    },

    initInfiniteScroll(onLoadMore) {
        const sentinel = document.getElementById('scrollSentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) onLoadMore();
        }, { threshold: 0.1 });

        observer.observe(sentinel);
    },

    debounce,

    /**
     * 카드 내 액션 버튼 및 링크 이벤트 바인딩
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
        bind('.link-item', (linkId) => this.openMemoModal(linkId));
        bind('.unlock-btn', handlers.onUnlock);

        // ID 복구/시각적 연결 모드
        const copyBtn = card.querySelector('.copy-id-btn');
        if (copyBtn) {
            copyBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.altKey) {
                    VisualLinker.start(id, copyBtn);
                    return;
                }
                if (VisualLinker.state.isActive) {
                    VisualLinker.finish(id);
                    return;
                }

                const linkText = `[[#${id}]]`;
                navigator.clipboard.writeText(linkText).then(() => {
                    const originalTitle = copyBtn.title;
                    copyBtn.title = I18nManager.t('msg_link_copied');
                    copyBtn.style.color = 'var(--accent)';
                    setTimeout(() => {
                        copyBtn.title = originalTitle;
                        copyBtn.style.color = '';
                    }, 2000);
                });
            };
        }
    },

    openMemoModal(id) {
        import('./components/ModalManager.js').then(m => m.ModalManager.openMemoModal(id));
    },

    async promptPassword(label) {
        const { ModalManager } = await import('./components/ModalManager.js');
        return await ModalManager.promptPassword(label);
    }
};

// 전역 호환성 유지
window.UI = UI;

/**
 * 전역 파일 다운로드 함수
 */
window.downloadFile = async function(filename, originalName) {
    try {
        const res = await fetch(`/api/download/${filename}`);
        if (!res.ok) {
            alert(res.status === 403 ? I18nManager.t('msg_permission_denied') : `${I18nManager.t('msg_download_failed')}: ${res.statusText}`);
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
