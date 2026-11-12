import { I18nManager } from '../utils/I18nManager.js';
import { SessionHeartbeat } from '../utils/SessionHeartbeat.js';

export const ThemeEngine = {
    settings: {},

    THEME_PRESETS: {
        dark: {
            bg_color: "#0f172a",
            sidebar_color: "rgba(30, 41, 59, 0.7)",
            card_color: "rgba(30, 41, 59, 0.85)",
            encrypted_border: "#00f3ff",
            ai_accent: "#8b5cf6"
        },
        white: {
            bg_color: "#f8fafc",
            sidebar_color: "#f1f5f9",
            card_color: "#ffffff",
            encrypted_border: "#cbd5e1",
            ai_accent: "#64748b"
        }
    },

    COLOR_VARS: {
        'bg_color': '--bg',
        'sidebar_color': '--sidebar',
        'card_color': '--card',
        'encrypted_border': '--encrypted-border',
        'ai_accent': '--ai-accent'
    },

    /**
     * 색상만 적용 (CSS 변수 + 색상 피커 + 글자색 대비 + 에디터 테마).
     * 저장(applyTheme)·설정 모달 미리보기·미저장 닫기 시 복원이 모두 이 함수를 공유합니다.
     * (이전에는 미리보기가 배경색만 바꾸고 글자색(--text)을 재계산하지 않아
     *  화이트→다크 미리보기 시 어두운 배경에 어두운 글자가 남았음)
     */
    applyColors(settings) {
        if (settings.theme_preset && this.THEME_PRESETS[settings.theme_preset]) {
            settings = { ...settings, ...this.THEME_PRESETS[settings.theme_preset] };
        }

        for (const [key, variable] of Object.entries(this.COLOR_VARS)) {
            if (settings[key]) {
                document.documentElement.style.setProperty(variable, settings[key]);
                const picker = document.getElementById('set-' + key.split('_')[0]);
                if (picker) picker.value = this.toHex(settings[key]);
            }
        }

        const root = document.documentElement.style;
        const mutedFor = text => (text === '#0f172a' ? '#64748b' : '#94a3b8');
        if (settings.card_color) {
            const textColor = this.getContrastColor(settings.card_color);
            root.setProperty('--text', textColor);
            root.setProperty('--muted', mutedFor(textColor));
            root.setProperty('--text-card', textColor);
            root.setProperty('--muted-card', mutedFor(textColor));
            this.updateEditorTheme(textColor !== '#0f172a');
        }
        if (settings.bg_color) {
            // 모달 등 --bg 위에 그려지는 영역용 (layout.css .modal-content에서 사용)
            const bgText = this.getContrastColor(settings.bg_color);
            root.setProperty('--text-bg', bgText);
            root.setProperty('--muted-bg', mutedFor(bgText));

            // 강조색도 배경 밝기에 맞춤: 고정 #475569는 어두운 배경에서 글자(2.3:1)·저장 버튼(2.4:1)이 거의 안 보였음
            const darkBg = bgText !== '#0f172a';
            root.setProperty('--accent', darkBg ? '#94a3b8' : '#475569');
            root.setProperty('--accent-hover', darkBg ? '#cbd5e1' : '#334155');
            root.setProperty('--on-accent', darkBg ? '#0f172a' : '#ffffff');
        }
        return settings;
    },

    async applyTheme(settings) {
        this.settings = settings;
        settings = this.applyColors(settings);

        const enableAI = (settings.enable_ai !== false); 
        document.body.classList.toggle('ai-disabled', !enableAI);
        const aiToggle = document.getElementById('set-enable-ai');
        if (aiToggle) aiToggle.checked = enableAI;

        const enableCategories = (settings.enable_categories === true);
        const catToggle = document.getElementById('set-enable-categories');
        if (catToggle) catToggle.checked = enableCategories;
        if (enableCategories) {
            import('./SidebarManager.js').then(m => m.SidebarManager.applyCategoryVisibility(true));
        } else {
            import('./SidebarManager.js').then(m => m.SidebarManager.applyCategoryVisibility(false));
        }

        const lang = settings.lang || 'ko';
        await I18nManager.init(lang);
        const langSelect = document.getElementById('set-lang');
        if (langSelect) langSelect.value = lang;

        const sessionTimeout = settings.session_timeout || 60;
        const timeoutInput = document.getElementById('set-session-timeout');
        if (timeoutInput) timeoutInput.value = sessionTimeout;

        import('./SessionManager.js').then(({ SessionManager }) => {
            if (SessionManager && typeof SessionManager.updateTimeout === 'function') {
                SessionManager.updateTimeout(sessionTimeout);
            }
        });

        SessionHeartbeat.start();
    },

    getContrastColor(colorStr) {
        if (!colorStr) return '#f8fafc';
        
        let r, g, b;
        if (colorStr.startsWith('#')) {
            let hex = colorStr.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            const parts = colorStr.match(/[\d.]+/g);
            if (parts && parts.length >= 3) {
                r = parseInt(parts[0]);
                g = parseInt(parts[1]);
                b = parseInt(parts[2]);
            } else {
                return '#f8fafc';
            }
        }

        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#0f172a' : '#f8fafc';
    },

    updateEditorTheme(isDark) {
        import('../editor.js').then(({ EditorManager }) => {
            if (EditorManager && EditorManager.editor) {
                const editorEl = document.querySelector('.toastui-editor-defaultUI');
                if (editorEl) {
                    editorEl.classList.toggle('toastui-editor-dark', isDark);
                }
            }
        }).catch(() => {});
    },

    /** '#abc' / '#aabbcc' / 'rgb(a)(...)' → '#rrggbb' (input[type=color] 용) */
    toHex(color) {
        if (!color) return '#0f172a';
        const c = String(color).trim();
        if (c.startsWith('#')) {
            let hex = c.slice(1);
            if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
            return /^[0-9a-fA-F]{6}$/.test(hex.slice(0, 6)) ? '#' + hex.slice(0, 6).toLowerCase() : '#0f172a';
        }
        return this.rgbaToHex(c);
    },

    rgbaToHex(rgba) {
        // hex가 들어오면 숫자만 뽑아 rgb로 오인하던 문제 방지 (#f1f5f9 → rgb(1,5,9) = 검정)
        if (String(rgba).trim().startsWith('#')) return this.toHex(rgba);
        const parts = rgba.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return '#0f172a';
        const r = parseInt(parts[0]);
        const g = parseInt(parts[1]);
        const b = parseInt(parts[2]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    initSystemThemeDetection() {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleThemeChange = (e) => {
            const isDark = e.matches;
            const theme = isDark ? {
                ...this.THEME_PRESETS.dark,
                theme_preset: "dark",
                lang: "ko"
            } : {
                ...this.THEME_PRESETS.white,
                theme_preset: "white",
                lang: "ko"
            };
            this.applyTheme(theme);
        };

        darkModeMediaQuery.addEventListener('change', handleThemeChange);
        handleThemeChange(darkModeMediaQuery); 
    }
};
