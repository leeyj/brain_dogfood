import { Constants as S } from '../utils/Constants.js';
import { I18nManager } from '../utils/I18nManager.js';

/**
 * 사이드바 하단 푸터 전담 컴포넌트 (로그아웃, 도움말, 설정)
 */
export class SidebarFooter {
    constructor() {
        this.DOM = {
            logout: document.querySelector(S.SELECTORS.LOGOUT_BTN),
            help: document.querySelector(S.SELECTORS.HELP_BTN),
            settings: document.querySelector(S.SELECTORS.SETTINGS_BTN)
        };
    }

    /**
     * 푸터 버튼 이벤트 바인딩 및 텍스트 적용
     */
    init() {
        // 이벤트 바인딩
        if (this.DOM.logout) {
            this.DOM.logout.onclick = () => this.handleLogout();
        }

        if (this.DOM.help) {
            this.DOM.help.onclick = () => this.showHelp();
        }

        if (this.DOM.settings) {
            this.DOM.settings.onclick = () => this.showSettings();
        }

        // 초기 다국어 텍스트 적용 (title 속성 등)
        this.applyI18n();
    }

    /**
     * 다국어 텍스트 적용
     */
    applyI18n() {
        if (this.DOM.logout) this.DOM.logout.title = I18nManager.t('nav_logout');
        if (this.DOM.help) this.DOM.help.title = I18nManager.t('nav_help');
        if (this.DOM.settings) this.DOM.settings.title = I18nManager.t('nav_settings');
    }

    /**
     * 로그아웃 처리
     */
    handleLogout() {
        if (confirm(I18nManager.t('msg_logout_confirm'))) {
            window.location.href = '/logout';
        }
    }

    /**
     * 단축키 도움말 모달 표시
     */
    showHelp() {
        const modal = document.getElementById('shortcutModal');
        if (modal) modal.classList.add('active');
    }

    /**
     * 설정 모달 표시
     */
    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('active');
    }
}
