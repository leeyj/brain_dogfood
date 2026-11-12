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

        const toggleColorPickers = (presetVal) => {
            const isCustom = presetVal === 'custom';
            pickers.forEach(picker => {
                picker.disabled = !isCustom;
                picker.style.opacity = isCustom ? '1' : '0.4';
                picker.style.cursor = isCustom ? 'pointer' : 'not-allowed';
            });
        };

        try {
            const settings = await API.fetchSettings();
            await ThemeEngine.applyTheme(settings);
            const presetSelect = document.getElementById('set-theme-preset');
            if (presetSelect && settings.theme_preset) {
                presetSelect.value = settings.theme_preset;
            } else if (presetSelect) {
                presetSelect.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'white';
            }
            if (presetSelect) toggleColorPickers(presetSelect.value);
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
                    window.ToastManager.error('Check failed: ' + err.message);
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
        // 저장하지 않고 닫히면(닫기 버튼, 바깥 클릭, ESC 전체 닫기, 백업 모달 전환 등 경로 무관)
        // 미리보기 색상을 마지막 저장 상태로 되돌림
        let savedJustNow = false;
        const revertPreview = () => {
            const saved = ThemeEngine.settings || {};
            ThemeEngine.applyColors(saved);
            const sel = document.getElementById('set-theme-preset');
            if (sel) {
                sel.value = saved.theme_preset || sel.value;
                toggleColorPickers(sel.value);
            }
        };
        if (settingsModal) {
            let wasActive = settingsModal.classList.contains('active');
            new MutationObserver(() => {
                const isActive = settingsModal.classList.contains('active');
                if (wasActive && !isActive) {
                    if (!savedJustNow) revertPreview();
                    savedJustNow = false;
                }
                wasActive = isActive;
            }).observe(settingsModal, { attributes: true, attributeFilter: ['class'] });
        }
        const closeWithoutSave = () => settingsModal && settingsModal.classList.remove('active');

        if (closeSettingsBtn && settingsModal) {
            closeSettingsBtn.onclick = closeWithoutSave;
        }

        const presetSelect = document.getElementById('set-theme-preset');
        if (presetSelect) {
            presetSelect.onchange = (e) => {
                const presetVal = e.target.value;
                toggleColorPickers(presetVal);
                if (ThemeEngine.THEME_PRESETS[presetVal]) {
                    // 배경·카드색과 함께 글자색 대비까지 즉시 미리보기
                    ThemeEngine.applyColors({ theme_preset: presetVal });
                }
            };
        }

        window.addEventListener('click', (e) => {
            if (settingsModal && e.target === settingsModal) closeWithoutSave();
        });

        const pickerKeys = {
            'set-bg': 'bg_color', 'set-sidebar': 'sidebar_color', 'set-card': 'card_color',
            'set-encrypted': 'encrypted_border', 'set-ai': 'ai_accent'
        };
        pickers.forEach(picker => {
            picker.oninput = () => {
                // 커스텀 색상 미리보기: 메모지 색이 바뀌면 글자색 대비도 재계산
                const colors = {};
                pickers.forEach(p => { if (pickerKeys[p.id]) colors[pickerKeys[p.id]] = p.value; });
                ThemeEngine.applyColors(colors);
            };
        });

        if (saveThemeBtn) {
            saveThemeBtn.onclick = async () => {
                const data = {};
                const presetSelect = document.getElementById('set-theme-preset');
                if (presetSelect) {
                    data['theme_preset'] = presetSelect.value;
                }
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
                    window.ToastManager.warning(I18nManager.t('msg_session_timeout_min') || '세션 타임아웃은 최소 10분 이상이어야 합니다.');
                    sessionTimeout = 10;
                    if(timeoutInput) timeoutInput.value = 10;
                    return;
                }
                data['session_timeout'] = sessionTimeout;
                
                try {
                    await API.saveSettings(data);
                    
                    if (this.initialLang && this.initialLang !== newLang) {
                        window.ToastManager.success(I18nManager.t('msg_settings_saved') || '설정이 저장되었습니다.');
                        window.location.reload();
                        return;
                    }

                    await ThemeEngine.applyTheme(data);
                    window.ToastManager.success(I18nManager.t('msg_settings_saved') || '설정이 저장되었습니다.');
                    savedJustNow = true;
                    if (settingsModal) settingsModal.classList.remove('active');
                } catch (err) { window.ToastManager.error('저장 실패: ' + err.message); }
            };
        }

        if (resetThemeBtn) {
            resetThemeBtn.onclick = () => {
                if (confirm(I18nManager.t('msg_reset_theme') || '모든 색상을 기본값으로 되돌릴까요?')) {
                    const presetSelect = document.getElementById('set-theme-preset');
                    const presetVal = presetSelect && presetSelect.value !== 'custom' ? presetSelect.value : 'white';
                    if (presetSelect) {
                        presetSelect.value = presetVal;
                        toggleColorPickers(presetVal);
                    }
                    const defaults = {
                        ...ThemeEngine.THEME_PRESETS[presetVal],
                        theme_preset: presetVal,
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
