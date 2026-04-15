import { API } from '../api.js';
import { I18nManager } from '../utils/I18nManager.js';

export const ThemeManager = {
    /**
     * 환경 설정 및 개인화 테마 로직 초기화
     */
    async initSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveThemeBtn = document.getElementById('saveThemeBtn');
        const resetThemeBtn = document.getElementById('resetThemeBtn');
        const pickers = settingsModal.querySelectorAll('input[type="color"]');

        // 1. 서버에서 설정 불러오기 및 적용
        try {
            const settings = await API.fetchSettings();
            await this.applyTheme(settings);
            // 만약 서버에 설정된 테마가 없다면 시스템 테마 감지 시작
            if (Object.keys(settings).length === 0) {
                this.initSystemThemeDetection();
            }
        } catch (err) { 
            console.error('Failed to load settings:', err);
            this.initSystemThemeDetection(); 
        }

        // ... 나머지 모달 제어 로직 유지 (기존 코드와 동일)
        if (settingsBtn) settingsBtn.onclick = () => settingsModal.classList.add('active');
        if (closeSettingsBtn) closeSettingsBtn.onclick = () => settingsModal.classList.remove('active');
        
        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove('active');
        });

        pickers.forEach(picker => {
            picker.oninput = (e) => {
                const variable = e.target.dataset.var;
                const value = e.target.value;
                document.documentElement.style.setProperty(variable, value);
            };
        });

        if (saveThemeBtn) {
            saveThemeBtn.onclick = async () => {
                const data = {};
                const mapping = {
                    'set-bg': 'bg_color',
                    'set-sidebar': 'sidebar_color',
                    'set-card': 'card_color',
                    'set-encrypted': 'encrypted_border',
                    'set-ai': 'ai_accent'
                };
                
                pickers.forEach(p => {
                    data[mapping[p.id]] = p.value;
                });
                data['enable_ai'] = document.getElementById('set-enable-ai').checked;
                
                // 언어 설정이 UI에 있다면 추가 (현재는 config.json 수동 명시 권장이나 대비책 마련)
                const langSelect = document.getElementById('set-lang');
                if (langSelect) data['lang'] = langSelect.value;
                
                try {
                    await API.saveSettings(data);
                    await this.applyTheme(data); 
                    alert(I18nManager.t('msg_settings_saved'));
                    settingsModal.classList.remove('active');
                } catch (err) { alert('저장 실패: ' + err.message); }
            };
        }

        if (resetThemeBtn) {
            resetThemeBtn.onclick = () => {
                if (confirm('모든 색상을 기본값으로 되돌릴까요?')) {
                    const defaults = {
                        bg_color: "#0f172a",
                        sidebar_color: "rgba(30, 41, 59, 0.7)",
                        card_color: "rgba(30, 41, 59, 0.85)",
                        encrypted_border: "#00f3ff",
                        ai_accent: "#8b5cf6",
                        lang: "ko"
                    };
                    this.applyTheme(defaults);
                }
            };
        }
    },

    /**
     * 테마 데이터를 실제 CSS 변수 및 UI 요소에 반영
     */
    async applyTheme(settings) {
        const mapping = {
            'bg_color': '--bg',
            'sidebar_color': '--sidebar',
            'card_color': '--card',
            'encrypted_border': '--encrypted-border',
            'ai_accent': '--ai-accent'
        };

        for (const [key, variable] of Object.entries(mapping)) {
            if (settings[key]) {
                document.documentElement.style.setProperty(variable, settings[key]);
                const pickerId = 'set-' + key.split('_')[0];
                const picker = document.getElementById(pickerId);
                if (picker) {
                    picker.value = settings[key].startsWith('rgba') ? this.rgbaToHex(settings[key]) : settings[key];
                }
            }
        }

        // 2. AI 활성화 상태 적용
        const enableAI = (settings.enable_ai !== false); 
        document.body.classList.toggle('ai-disabled', !enableAI);
        const aiToggle = document.getElementById('set-enable-ai');
        if (aiToggle) aiToggle.checked = enableAI;

        // 3. i18n 적용
        const lang = settings.lang || 'ko';
        await I18nManager.init(lang);
        const langSelect = document.getElementById('set-lang');
        if (langSelect) langSelect.value = lang;
    },

    rgbaToHex(rgba) {
        const parts = rgba.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return '#0f172a';
        const r = parseInt(parts[0]);
        const g = parseInt(parts[1]);
        const b = parseInt(parts[2]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    /**
     * 시스템 다크/라이트 모드 감지 및 자동 적용
     */
    initSystemThemeDetection() {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleThemeChange = (e) => {
            const isDark = e.matches;
            const theme = isDark ? {
                bg_color: "#0f172a",
                sidebar_color: "rgba(30, 41, 59, 0.7)",
                card_color: "rgba(30, 41, 59, 0.85)",
                encrypted_border: "#00f3ff",
                ai_accent: "#8b5cf6",
                lang: "ko"
            } : {
                bg_color: "#f8fafc",
                sidebar_color: "rgba(241, 245, 249, 0.8)",
                card_color: "#ffffff",
                encrypted_border: "#0ea5e9",
                ai_accent: "#6366f1",
                lang: "ko"
            };
            this.applyTheme(theme);
        };

        darkModeMediaQuery.addEventListener('change', handleThemeChange);
        handleThemeChange(darkModeMediaQuery); 
    },
};
