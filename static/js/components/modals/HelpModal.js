import { I18nManager } from '../../utils/I18nManager.js';
import { ShortcutContent } from './help/ShortcutContent.js';
import { GuideContent } from './help/GuideContent.js';
import { TipsContent } from './help/TipsContent.js';

/**
 * 도움말 모달 전담 컴포넌트 (Tabbed Help Modal)
 * - 하단에 엑셀 시트 스타일의 탭을 구성하여 체계적인 정보 제공
 * - 각 탭의 콘텐츠는 별도의 모듈로 관리
 */
export class HelpModal {
    constructor() {
        this.activeTab = 'shortcuts';
        this.DOM = {
            modal: document.getElementById('shortcutModal'),
            body: null,
            content: null
        };
        
        // 탭 구성 정보
        this.tabs = [
            { id: 'shortcuts', label: '⌨️ 단축키', icon: 'fas fa-keyboard', component: ShortcutContent },
            { id: 'guide', label: '📖 가이드', icon: 'fas fa-book', component: GuideContent },
            { id: 'tips', label: '💡 팁', icon: 'fas fa-lightbulb', component: TipsContent }
        ];
    }

    /**
     * 모달 초기화 및 이벤트 바인딩
     */
    init() {
        this.DOM.modal = document.getElementById('shortcutModal');
        if (!this.DOM.modal) return;
        
        this.DOM.body = this.DOM.modal.querySelector('.modal-body');
        if (!this.DOM.body) return;

        this.renderFrame();
        this.switchTab(this.activeTab);
    }

    /**
     * 기본 프레임(탭 바 등) 렌더링
     */
    renderFrame() {
        this.DOM.body.innerHTML = `
            <div class="help-content-area" id="helpContentArea"></div>
            <div class="help-tab-bar" id="helpTabBar"></div>
        `;
        
        const tabBar = document.getElementById('helpTabBar');
        this.tabs.forEach(tab => {
            const btn = document.createElement('div');
            btn.className = `help-tab ${tab.id === this.activeTab ? 'active' : ''}`;
            btn.innerHTML = `<span><i class="${tab.icon}"></i> ${tab.label}</span>`;
            btn.onclick = () => this.switchTab(tab.id);
            tabBar.appendChild(btn);
        });
        
        this.DOM.content = document.getElementById('helpContentArea');
    }

    /**
     * 특정 탭으로 전환
     */
    switchTab(tabId) {
        this.activeTab = tabId;
        
        // 탭 버튼 활성화 상태 업데이트
        const tabBtns = this.DOM.body.querySelectorAll('.help-tab');
        this.tabs.forEach((tab, index) => {
            if (tabBtns[index]) {
                tabBtns[index].classList.toggle('active', tab.id === tabId);
            }
        });

        // 콘텐츠 렌더링
        this.renderContent(tabId);
    }

    /**
     * 탭별 콘텐츠 렌더링
     */
    async renderContent(tabId) {
        if (!this.DOM.content) return;
        
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab || !tab.component) return;

        this.DOM.content.classList.remove('fade-in');
        
        // 해당 컴포넌트의 render() 함수 호출 (비동기 처리)
        const html = await tab.component.render();
        this.DOM.content.innerHTML = html;
        
        // 동적으로 로드된 HTML에 다국어 적용
        if (I18nManager && I18nManager.applyTranslations) {
            I18nManager.applyTranslations();
        }
        
        // 페이드인 효과를 위해 약간의 지연 후 클래스 추가
        setTimeout(() => this.DOM.content.classList.add('fade-in'), 10);
    }
}

// 싱글톤으로 인스턴스 생성 및 초기화
export const helpModal = new HelpModal();
