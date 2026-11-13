/**
 * 메모 본문 HTML 정제 (카드·상세 모달 공용)
 *
 * DOMPurify 기본 설정은 스크립트는 막지만 style 속성을 통째로 허용한다.
 * 그래서 메모 본문의 <div style="position:fixed;inset:0"> 같은 HTML이 카드·모달을 덮을 수 있었다.
 * 에디터의 글자 색상 기능(<span style="color:…">)은 살려야 하므로 style 속성은 남기되,
 * 아래 허용 목록의 '표현용' 속성만 남기고 나머지(position, inset, z-index, width …)는 제거한다.
 */
const ALLOWED_STYLE_PROPS = new Set([
    'color', 'background-color', 'text-align', 'text-decoration', 'text-decoration-line',
    'font-weight', 'font-style',
]);
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|var\s*\(|@import|javascript:/i;

// 본문에 있을 이유가 없는 폼·스타일 요소
const FORBID_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'];

function filterStyle(node) {
    if (!node.hasAttribute || !node.hasAttribute('style')) return;
    const kept = [];
    for (const prop of Array.from(node.style)) {
        if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
        const value = node.style.getPropertyValue(prop);
        if (value && !UNSAFE_STYLE_VALUE.test(value)) kept.push(`${prop}: ${value}`);
    }
    if (kept.length) node.setAttribute('style', kept.join('; '));
    else node.removeAttribute('style');
}

export function sanitizeMemoHtml(html) {
    // 훅은 이 호출에만 적용 (전역 DOMPurify 설정 오염 방지)
    DOMPurify.addHook('afterSanitizeAttributes', filterStyle);
    try {
        return DOMPurify.sanitize(html, { FORBID_TAGS });
    } finally {
        DOMPurify.removeHook('afterSanitizeAttributes', filterStyle);
    }
}
