/**
 * 백엔드 API와의 통신을 관리하는 모듈
 */

import { I18nManager } from './utils/I18nManager.js';

export const API = {
    async request(url, options = {}) {
        const res = await fetch(url, options);
        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Request failed: ${res.statusText}`);
        }
        return await res.json();
    },

    async fetchMemos(filters = {}) {
        const { limit = 20, offset = 0, group = 'all', query = '' } = filters;
        
        // 💡 null/undefined 값을 빈 문자열로 안전하게 변환
        const date = filters.date || ''; 
        const start_date = filters.start_date || '';
        const end_date = filters.end_date || '';
        const category = (filters.category === null || filters.category === undefined) ? '' : filters.category;
        
        const params = new URLSearchParams({ 
            limit, 
            offset, 
            group, 
            query, 
            category, 
            date,
            start_date,
            end_date,
            _t: Date.now() // 브라우저 캐시 방지용 타임스탬프
        });
        return await this.request(`/api/memos?${params.toString()}`);
    },
    async fetchMemo(id) {
        return await this.request(`/api/memos/${id}?_t=${Date.now()}`);
    },
    async fetchHeatmapData(days = 365) {
        return await this.request(`/api/stats/heatmap?days=${days}&_t=${Date.now()}`);
    },

    async saveMemo(payload, id = null) {
        const url = id ? `/api/memos/${id}` : '/api/memos';
        return await this.request(url, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    async decryptMemo(id, password) {
        return await this.request(`/api/memos/${id}/decrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
    },

    async deleteMemo(id) {
        return await this.request(`/api/memos/${id}`, { method: 'DELETE' });
    },

    async triggerAI(id) {
        const lang = I18nManager.currentLang || 'ko';
        return await this.request(`/api/memos/${id}/analyze?lang=${lang}`, { method: 'POST' });
    },

    async fetchAssets() {
        return await this.request(`/api/assets?_t=${Date.now()}`);
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        return await this.request('/api/upload', { method: 'POST', body: formData });
    },
    async deleteAttachment(filename) {
        return await this.request(`/api/attachments/${filename}`, { method: 'DELETE' });
    },
    // 설정 관련
    fetchSettings: async function() {
        return await this.request('/api/settings');
    },
    saveSettings: async function(data) {
        return await this.request('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    // 인증 상태 확인 (Heartbeat용)
    checkAuthStatus: async function() {
        try {
            return await this.request('/api/auth/status');
        } catch (err) {
            // API.request 내부에서 401 발생 시 이미 리다이렉트 처리함
            throw err;
        }
    }
};
