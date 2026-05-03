import { I18nManager } from '../utils/I18nManager.js';
import { SessionHeartbeat } from '../utils/SessionHeartbeat.js';

export const ThemeEngine = {
    settings: {},

    async applyTheme(settings) {
        this.settings = settings;

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

        if (settings.card_color) {
            const textColor = this.getContrastColor(settings.card_color);
            const mutedColor = textColor === '#0f172a' ? '#64748b' : '#94a3b8';
            document.documentElement.style.setProperty('--text', textColor);
            document.documentElement.style.setProperty('--muted', mutedColor);
            
            const isDark = textColor !== '#0f172a';
            this.updateEditorTheme(isDark);
        }

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

    rgbaToHex(rgba) {
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
    }
};
