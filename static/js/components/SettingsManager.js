import { API } from '../api.js';
import { I18nManager } from '../utils/I18nManager.js';
import { ThemeEngine } from './ThemeEngine.js';

export const SettingsManager = {
    initialLang: 'ko',

    async initSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveThemeBtn = document.getElementById('saveThemeBtn');
        const resetThemeBtn = document.getElementById('resetThemeBtn');
        const pickers = settingsModal ? settingsModal.querySelectorAll('input[type="color"]') : [];

        try {
            const settings = await API.fetchSettings();
            await ThemeEngine.applyTheme(settings);
            if (Object.keys(settings).length === 0) {
                ThemeEngine.initSystemThemeDetection();
            }
        } catch (err) { 
            console.error('Failed to load settings:', err);
            ThemeEngine.initSystemThemeDetection(); 
        }

        const { VersionManager } = await import('./VersionManager.js');
        const verDisplay = document.getElementById('currentVerDisplay');
        if (verDisplay) verDisplay.innerText = VersionManager.state.localVersion;

        const checkUpdateBtn = document.getElementById('checkUpdateBtn');
        if (checkUpdateBtn) {
            checkUpdateBtn.onclick = async () => {
                const originalHtml = checkUpdateBtn.innerHTML;
                checkUpdateBtn.disabled = true;
                checkUpdateBtn.innerHTML = `<span class="spinner"></span> ${I18nManager.t('update_checking') || '업데이트 확인 중...'}`;
                
                try {
                    await VersionManager.checkUpdate();
                    VersionManager.openUpdateModal();
                } catch (err) {
                    alert('Check failed: ' + err.message);
                } finally {
                    checkUpdateBtn.disabled = false;
                    checkUpdateBtn.innerHTML = originalHtml;
                }
            };
        }

        if (settingsBtn && settingsModal) {
            settingsBtn.onclick = () => {
                const langSelect = document.getElementById('set-lang');
                if (langSelect) this.initialLang = langSelect.value;
                settingsModal.classList.add('active');
            };
        }
        if (closeSettingsBtn && settingsModal) {
            closeSettingsBtn.onclick = () => settingsModal.classList.remove('active');
        }
        
        window.addEventListener('click', (e) => {
            if (settingsModal && e.target === settingsModal) settingsModal.classList.remove('active');
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
                
                const aiToggle = document.getElementById('set-enable-ai');
                if (aiToggle) data['enable_ai'] = aiToggle.checked;
                
                const catToggle = document.getElementById('set-enable-categories');
                if (catToggle) data['enable_categories'] = catToggle.checked;
                
                const langSelect = document.getElementById('set-lang');
                const newLang = langSelect ? langSelect.value : (this.initialLang || 'ko');
                if (langSelect) data['lang'] = newLang;

                const timeoutInput = document.getElementById('set-session-timeout');
                let sessionTimeout = timeoutInput ? parseInt(timeoutInput.value) : 60;
                
                if (sessionTimeout < 10) {
                    alert(I18nManager.t('msg_session_timeout_min') || '세션 타임아웃은 최소 10분 이상이어야 합니다.');
                    sessionTimeout = 10;
                    if(timeoutInput) timeoutInput.value = 10;
                    return;
                }
                data['session_timeout'] = sessionTimeout;
                
                try {
                    await API.saveSettings(data);
                    
                    if (this.initialLang && this.initialLang !== newLang) {
                        alert(I18nManager.t('msg_settings_saved') || '설정이 저장되었습니다.');
                        window.location.reload();
                        return;
                    }

                    await ThemeEngine.applyTheme(data); 
                    alert(I18nManager.t('msg_settings_saved') || '설정이 저장되었습니다.');
                    if (settingsModal) settingsModal.classList.remove('active');
                } catch (err) { alert('저장 실패: ' + err.message); }
            };
        }

        if (resetThemeBtn) {
            resetThemeBtn.onclick = () => {
                if (confirm(I18nManager.t('msg_reset_theme') || '모든 색상을 기본값으로 되돌릴까요?')) {
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
                    ThemeEngine.applyTheme(defaults);
                }
            };
        }
    }
};
