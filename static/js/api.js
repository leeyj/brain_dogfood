/**
 * 백엔드 API와의 통신을 관리하는 모듈
 */

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
        const params = new URLSearchParams({ limit, offset, group, query });
        return await this.request(`/api/memos?${params.toString()}`);
    },
    async fetchHeatmapData(days = 365) {
        return await this.request(`/api/stats/heatmap?days=${days}`);
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
        return await this.request(`/api/memos/${id}/analyze`, { method: 'POST' });
    },

    async fetchAssets() {
        return await this.request('/api/assets');
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
    fetchSettings: async () => {
        const res = await fetch('/api/settings');
        return await res.json();
    },
    saveSettings: async (data) => {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    }
};
