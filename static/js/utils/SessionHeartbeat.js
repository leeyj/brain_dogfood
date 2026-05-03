import { API } from '../api.js';

export const SessionHeartbeat = {
    heartbeatInterval: null,

    start() {
        if (this.heartbeatInterval) return;
        
        console.log('[SessionHeartbeat] Session heartbeat started.');
        
        API.checkAuthStatus().catch(() => {});

        this.heartbeatInterval = setInterval(async () => {
            try {
                await API.checkAuthStatus();
            } catch (err) {
                console.warn('[SessionHeartbeat] Session expired or server error during heartbeat.');
            }
        }, 120000); // 2분 간격
    },

    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('[SessionHeartbeat] Session heartbeat stopped.');
        }
    }
};
