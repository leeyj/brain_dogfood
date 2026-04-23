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
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                const langSelect = document.getElementById('set-lang');
                if (langSelect) this.initialLang = langSelect.value;
                settingsModal.classList.add('active');
            };
        }
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
                data['enable_categories'] = document.getElementById('set-enable-categories').checked;
                
                // 언어 설정 처리
                const langSelect = document.getElementById('set-lang');
                const newLang = langSelect ? langSelect.value : (this.initialLang || 'ko');
                if (langSelect) data['lang'] = newLang;

                // 세션 타임아웃 검증
                const timeoutInput = document.getElementById('set-session-timeout');
                let sessionTimeout = timeoutInput ? parseInt(timeoutInput.value) : 60;
                
                if (sessionTimeout < 10) {
                    alert(I18nManager.t('msg_session_timeout_min') || '세션 타임아웃은 최소 10분 이상이어야 합니다.');
                    sessionTimeout = 10;
                    timeoutInput.value = 10;
                    return;
                }
                data['session_timeout'] = sessionTimeout;
                
                try {
                    await API.saveSettings(data);
                    
                    // 언어가 변경되었다면 페이지를 새로고침하여 모든 매니저들을 새로운 언어로 재초기화합니다.
                    if (this.initialLang && this.initialLang !== newLang) {
                        alert(I18nManager.t('msg_settings_saved'));
                        window.location.reload();
                        return;
                    }

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
                        lang: "ko",
                        enable_categories: false,
                        session_timeout: 60
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
        this.settings = settings; // NEW: 설정 캐시 저장

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

        // 3. 카테고리 활성화 상태 적용 (고급 옵션)
        const enableCategories = (settings.enable_categories === true);
        const catToggle = document.getElementById('set-enable-categories');
        if (catToggle) catToggle.checked = enableCategories;
        if (enableCategories) {
            import('./SidebarManager.js').then(m => m.SidebarManager.applyCategoryVisibility(true));
        } else {
            import('./SidebarManager.js').then(m => m.SidebarManager.applyCategoryVisibility(false));
        }

        // 4. i18n 적용
        const lang = settings.lang || 'ko';
        await I18nManager.init(lang);
        const langSelect = document.getElementById('set-lang');
        if (langSelect) langSelect.value = lang;

        // 5. 세션 타임아웃 UI 반영 및 Heartbeat 시작
        const sessionTimeout = settings.session_timeout || 60;
        const timeoutInput = document.getElementById('set-session-timeout');
        if (timeoutInput) timeoutInput.value = sessionTimeout;

        // 세션 타이머(종료/EXIT) 즉시 반영
        import('./SessionManager.js').then(({ SessionManager }) => {
            if (SessionManager && typeof SessionManager.updateTimeout === 'function') {
                SessionManager.updateTimeout(sessionTimeout);
            }
        });

        // 6. 자동 대비 (Auto-Contrast) 반영
        if (settings.card_color) {
            const textColor = this.getContrastColor(settings.card_color);
            const mutedColor = textColor === '#0f172a' ? '#64748b' : '#94a3b8';
            document.documentElement.style.setProperty('--text', textColor);
            document.documentElement.style.setProperty('--muted', mutedColor);
            
            // 에디터 테마 연동 (ToastUI)
            const isDark = textColor !== '#0f172a';
            this.updateEditorTheme(isDark);
        }

        // 세션 체크 시작 (Heartbeat)
        import('../AppService.js').then(m => m.AppService.startSessionHeartbeat());
    },

    /**
     * 배경색에 따른 최적의 텍스트 색상 반환
     */
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

        // YIQ Luma formula
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#0f172a' : '#f8fafc';
    },

    /**
     * 에디터 테마 동적 전환 (필요 시)
     */
    updateEditorTheme(isDark) {
        // 에디터가 로드된 상태라면 테마 변경 시도
        import('../editor.js').then(({ EditorManager }) => {
            if (EditorManager && EditorManager.editor) {
                // ToastUI Editor는 초기화 시 테마가 결정되므로, 
                // 실시간 전환은 어려울 수 있으나 클래스 조작 등으로 보정 가능여부 확인
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
