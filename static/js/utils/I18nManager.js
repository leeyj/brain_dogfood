/**
 * 커스텀 i18n 매니저 (Custom i18n Manager)
 * - 서버 설정에 따라 locale 파일을 로드하고 화면을 번역합니다.
 */
export const I18nManager = {
    localeData: {},
    currentLang: 'en',

    /**
     * 초기화 및 언어 팩 로드
     */
    async init(lang = 'en') {
        this.currentLang = lang;
        try {
            const res = await fetch(`/static/locales/${lang}.json?v=2.2`);
            if (!res.ok) throw new Error(`Locale ${lang} not found`);
            this.localeData = await res.json();
            console.log(`🌐 i18n: Language [${lang}] loaded successfully.`);
            
            // 초기 로드 시 한 번 전체 적용
            this.applyTranslations();
        } catch (err) {
            console.error('❌ i18n Load Error:', err);
            // 한국어 로드 실패 시에도 영어로 폴백 시도 가능
        }
    },

    /**
     * 특정 키에 해당하는 번역 텍스트 또는 배열 반환
     */
    t(key) {
        // 객체 깊은 참조 지원 (예: "groups.done")
        const value = key.split('.').reduce((obj, k) => (obj && obj[k]), this.localeData);
        return value !== undefined ? value : key; // 없으면 키 자체 반환
    },

    /**
     * 화면 내 i18n 관련 모든 속성을 번역
     */
    applyTranslations() {
        // 1. 일반 텍스트 번역
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = this.t(key);
        });

        // 2. Placeholder 번역
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = this.t(key);
        });

        // 3. Title (Browser Tooltip) 번역
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = this.t(key);
        });

        // 4. Custom Tooltip (data-tooltip) 번역
        document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
            const key = el.dataset.i18nTooltip;
            el.setAttribute('data-tooltip', this.t(key));
        });
    }
};
