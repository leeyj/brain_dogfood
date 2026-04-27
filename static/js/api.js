/**
 * @module API
 * @description 백엔드 Flask 서버와의 모든 HTTP 통신을 담당하는 코어 모듈
 */

import { I18nManager } from './utils/I18nManager.js';

export const API = {
    /**
     * 공통 API 요청 래퍼 (인증 만료 감지 및 공통 에러 처리)
     * @async
     * @param {string} url - 요청 엔드포인트 URL
     * @param {Object} [options={}] - fetch 옵션 (method, headers, body 등)
     * @returns {Promise<any>} 서버 응답 JSON 데이터
     * @throws {Error} 네트워크 오류 또는 서버 에러 발생 시
     */
    async request(url, options = {}) {
        const res = await fetch(url, options);
        if (res.status === 401) {
            console.warn('🔒 Session expired. Redirecting to login...');
            window.location.href = '/login';
            return;
        }
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Request failed: ${res.statusText}`);
        }
        return await res.json();
    },

    /**
     * 필터 조건에 따른 메모 목록 페이징 조회
     * @async
     * @param {Object} [filters={}] - 필터 객체
     * @param {number} [filters.limit=20] - 가져올 개수
     * @param {number} [filters.offset=0] - 시작 지점
     * @param {string} [filters.group='all'] - 그룹 필터
     * @param {string} [filters.category] - 카테고리 필터
     * @param {string} [filters.date] - 단일 날짜 필터 (YYYY-MM-DD)
     * @param {string} [filters.start_date] - 시작 날짜 범위
     * @param {string} [filters.end_date] - 종료 날짜 범위
     * @param {string} [filters.query] - 검색어
     * @returns {Promise<Array>} 메모 객체 배열
     */
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

    /**
     * 특정 메모 상세 정보 가져오기
     * @async
     * @param {string|number} id - 메모 ID
     * @returns {Promise<Object>} 메모 상세 데이터
     */
    async fetchMemo(id) {
        return await this.request(`/api/memos/${id}?_t=${Date.now()}`);
    },

    /**
     * 지식 성장 히트맵 데이터 가져오기
     * @async
     * @param {number} [days=365] - 조회 기간 (일 단위)
     * @returns {Promise<Array>} 히트맵 데이터 배열
     */
    async fetchHeatmapData(days = 365) {
        return await this.request(`/api/stats/heatmap?days=${days}&_t=${Date.now()}`);
    },

    /**
     * 메모 저장 (신규 생성 또는 수정)
     * @async
     * @param {Object} payload - 저장할 메모 데이터
     * @param {string|number|null} [id=null] - 수정 시 메모 ID (null이면 생성)
     * @returns {Promise<Object>} 서버 저장 결과
     */
    async saveMemo(payload, id = null) {
        const url = id ? `/api/memos/${id}` : '/api/memos';
        return await this.request(url, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    /**
     * 암호화된 메모 해독 요청
     * @async
     * @param {string|number} id - 메모 ID
     * @param {string} password - 해독용 비밀번호
     * @returns {Promise<Object>} 해독된 메모 데이터
     */
    async decryptMemo(id, password) {
        return await this.request(`/api/memos/${id}/decrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
    },

    /**
     * 특정 메모 삭제 (논리 삭제 또는 물리 삭제)
     * @async
     * @param {string|number} id - 삭제할 메모 ID
     * @param {boolean} [permanent=false] - true일 경우 데이터베이스에서 영구 삭제 (Hard Delete)
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteMemo(id, permanent = false) {
        const url = `/api/memos/${id}${permanent ? '?permanent=true' : ''}`;
        return await this.request(url, { method: 'DELETE' });
    },

    /**
     * 삭제된 메모 복원
     * @async
     * @param {string|number} id - 복원할 메모 ID
     * @returns {Promise<Object>} 복원 결과
     */
    async restoreMemo(id) {
        return await this.request(`/api/memos/${id}/restore`, { method: 'POST' });
    },

    /**
     * AI 분석 트리거 요청
     * @async
     * @param {string|number} id - 메모 ID
     * @returns {Promise<Object>} AI 분석 결과
     */
    async triggerAI(id) {
        const lang = I18nManager.currentLang || 'ko';
        return await this.request(`/api/memos/${id}/analyze?lang=${lang}`, { method: 'POST' });
    },

    /**
     * 첨부파일 목록 가져오기
     * @async
     * @returns {Promise<Array>} 첨부파일 데이터 배열
     */
    async fetchAssets() {
        return await this.request(`/api/assets?_t=${Date.now()}`);
    },

    /**
     * 파일 업로드
     * @async
     * @param {File} file - 업로드할 파일 객체
     * @returns {Promise<Object>} 업로드 결과
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        return await this.request('/api/upload', { method: 'POST', body: formData });
    },

    /**
     * 첨부파일 삭제
     * @async
     * @param {string} filename - 삭제할 파일 이름
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteAttachment(filename) {
        return await this.request(`/api/attachments/${filename}`, { method: 'DELETE' });
    },

    /**
     * 시스템 설정 가져오기
     * @async
     * @returns {Promise<Object>} 설정 정보 객체
     */
    fetchSettings: async function() {
        return await this.request('/api/settings');
    },

    /**
     * 시스템 설정 저장
     * @async
     * @param {Object} data - 저장할 설정 데이터
     * @returns {Promise<Object>} 저장 결과
     */
    saveSettings: async function(data) {
        return await this.request('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    /**
     * 인증 상태 확인 (Heartbeat)
     * @async
     * @returns {Promise<Object>} 인증 상태 정보
     */
    checkAuthStatus: async function() {
        try {
            return await this.request('/api/auth/status');
        } catch (err) {
            throw err;
        }
    },

    /**
     * 현재 시스템 버전 정보 가져오기
     * @async
     * @returns {Promise<Object>} 버전 정보
     */
    fetchLocalVersion: async function() {
        return await this.request('/api/system/version');
    },

    /**
     * 업데이트 가능 여부 확인
     * @async
     * @returns {Promise<Object>} 업데이트 상태 정보
     */
    checkUpdate: async function() {
        return await this.request('/api/system/check-update');
    },

    /**
     * 시스템 업데이트 실행
     * @async
     * @returns {Promise<Object>} 업데이트 처리 결과
     */
    executeUpdate: async function() {
        return await this.request('/api/system/update', { method: 'POST' });
    }
};
