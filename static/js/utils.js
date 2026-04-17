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

/**
 * 본문에서 메타데이터 기능어($그룹, #태그)를 시각적으로 가립니다.
 * 원본 보존 정책에 따라 렌더링 시에만 필터링 용도로 사용됩니다.
 */
export function stripMetadata(text) {
    if (!text) return '';
    
    let processed = text;

    // 1. 기존 자동생성 푸터 블록(--- 및 하단 메타데이터) 시각적 제거
    const footerRegex = /\n+[\*\-\_]{3,}\s*\n(?:^[\$\#][^\s\#].*$(?:\n|$))*/gm;
    processed = processed.replace(footerRegex, '');

    // 태그/그룹 구성에서 제외할 특수문자들 (한글 및 유니코드 지원을 위해 제외 문자 방식 사용)
    const excludeChars = "\\s\\#\\!\\@\\%\\^\\&\\*\\(\\)\\=\\+\\[\\]\\{\\}\\;\\:\\'\\\"\\,\\<\\.\\>\\/\\?\\-";

    // 2. 본문 내 $그룹 제거
    const groupRegex = new RegExp("\\$[^" + excludeChars + "]+", "g");
    processed = processed.replace(groupRegex, '');
    
    // 3. 본문 내 #태그 제거 (마크다운 헤더 및 내부 링크 제외)
    // 패턴 설명: 공백 또는 줄 시작 뒤의 #로 시작하고, 뒤에 숫자가 아닌 문자가 오는 태그 매칭
    const tagRegex = new RegExp("(^|\\s)#[^" + excludeChars + "0-9]+[^" + excludeChars + "]*", "g");
    processed = processed.replace(tagRegex, '$1');
    
    return processed.trim();
}
