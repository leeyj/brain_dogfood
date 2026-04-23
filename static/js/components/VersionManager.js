/**
 * 시스템 버전 관리 및 업데이트 알림 매니저
 */
import { API } from '../api.js';
import { I18nManager } from '../utils/I18nManager.js';

export const VersionManager = {
    state: {
        localVersion: '0.0.0',
        remoteVersion: '0.0.0',
        hasUpdate: false,
        remoteHistory: []
    },

    async init() {
        try {
            const localData = await API.fetchLocalVersion();
            this.state.localVersion = localData.version;
            
            // 💡 버전 표시 DOM 업데이트 (ThemeManager보다 늦게 초기화될 경우 대비)
            const verDisplay = document.getElementById('currentVerDisplay');
            if (verDisplay) verDisplay.innerText = `v${this.state.localVersion}`;

            // 앱 구동 시 업데이트 체크 (자동)
            await this.checkUpdate();
        } catch (err) {
            console.error('[VersionManager] Init failed:', err);
        }
    },

    async checkUpdate() {
        try {
            const data = await API.checkUpdate();
            this.state.hasUpdate = data.has_update;
            this.state.remoteVersion = data.remote_version;
            this.state.remoteHistory = data.remote_history;

            if (this.state.hasUpdate) {
                this.showUpdateBadge();
            }
            return data;
        } catch (err) {
            console.warn('[VersionManager] Check update failed:', err);
            return null;
        }
    },

    showUpdateBadge() {
        // 설정 아이콘 근처에 알림 표시 (사이드바 하단)
        const settingsBtn = document.querySelector('.nav-item[data-tab="settings"]');
        if (settingsBtn && !settingsBtn.querySelector('.update-badge')) {
            const badge = document.createElement('span');
            badge.className = 'update-badge';
            badge.innerHTML = '●';
            badge.style.cssText = `
                color: #ff4757;
                font-size: 10px;
                position: absolute;
                top: 8px;
                right: 8px;
                animation: pulse 2s infinite;
            `;
            settingsBtn.style.position = 'relative';
            settingsBtn.appendChild(badge);
        }
    },

    async openUpdateModal() {
        // 기존 모달이 있으면 제거
        const existing = document.getElementById('updateModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'updateModal';
        modal.className = 'custom-modal-overlay';
        
        const isEn = I18nManager.currentLang === 'en';
        const historyHtml = this.state.remoteHistory.map(h => {
            const changes = isEn ? (h.changes_en || h.changes) : h.changes;
            return `
                <div class="update-log-item">
                    <div class="update-log-header">
                        <span class="update-log-v">v${h.version}</span>
                        <span class="update-log-date">${h.date}</span>
                    </div>
                    <div class="update-log-title">${h.title}</div>
                    <ul class="update-log-list">
                        ${changes.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="custom-modal help-modal-content" style="max-width: 600px; height: auto; max-height: 85vh;">
                <div class="help-modal-header">
                    <div class="help-modal-title">${I18nManager.t('update_title')}</div>
                    <button class="help-close-btn">&times;</button>
                </div>
                
                <div class="help-content-area" style="padding: 25px; overflow-y: auto;">
                    <div class="update-status-box" style="display:flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="text-align:center">
                            <div style="font-size:0.8rem; color:var(--muted)">${I18nManager.t('update_current_version')}</div>
                            <div style="font-size:1.2rem; font-weight:bold">${this.state.localVersion}</div>
                        </div>
                        <div style="display:flex; align-items:center; opacity:0.5">➔</div>
                        <div style="text-align:center">
                            <div style="font-size:0.8rem; color:var(--muted)">${I18nManager.t('update_latest_version')}</div>
                            <div style="font-size:1.2rem; font-weight:bold; color:var(--primary)">${this.state.remoteVersion}</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 12px; opacity:0.8;">${I18nManager.t('update_changelog_title')}</h4>
                        <div class="changelog-container" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; font-size: 0.9rem; line-height: 1.6;">
                            ${historyHtml || I18nManager.t('update_no_new')}
                        </div>
                    </div>

                    <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <p style="font-size: 0.85rem; color: var(--primary); margin-bottom: 10px; font-weight: bold;">
                            <i class="fas fa-info-circle"></i> ${I18nManager.t('update_manual_notice')}
                        </p>
                        <div style="font-size: 0.8rem; opacity: 0.6; line-height: 1.4;">
                            Native: git pull origin main<br>
                            Docker: docker pull leeyj/brain:latest
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 이벤트 바인딩
        modal.querySelector('.help-close-btn').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
};
