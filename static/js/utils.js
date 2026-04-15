import { I18nManager } from './utils/I18nManager.js';

/**
 * 유틸리티 기능을 담은 모듈
 */

/**
 * HTML 특수 문자를 이스케이프 처리합니다.
 */
export function escapeHTML(str) {
    if (!str) return '';
    const charMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    };
    return str.replace(/[&<>'"]/g, t => charMap[t] || t);
}

/**
 * [[#ID]] 형태의 내부 링크를 HTML 링크로 변환합니다.
 */
export function parseInternalLinks(text, onLinkClick) {
    if (!text) return '';
    // 이 함수는 단순히 텍스트만 변환하며, 이벤트 바인딩은 UI 모듈에서 수행합니다.
    return text.replace(/\[\[#(\d+)\]\]/g, (match, id) => {
        const prefix = I18nManager.t('label_memo_id_prefix');
        return `<a href="javascript:void(0)" class="internal-link" data-id="${id}">${prefix}${id}</a>`;
    });
}

/**
 * HTML 내의 상대 경로 이미지 src를 서버 API 경로(/api/download/...)로 변환합니다.
 */
export function fixImagePaths(html) {
    if (!html) return '';
    // src="image.png" 같이 상대 경로로 시작하는 경우만 가로채서 API 경로로 변경
    return html.replace(/<img\s+src="([^"\/][^":]+)"/g, (match, filename) => {
        return `<img src="/api/download/${filename}"`;
    });
}
