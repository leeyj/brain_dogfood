/**
 * 첨부파일 영역 및 파일 칩 UI 컴포넌트
 */
import { escapeHTML } from '../utils.js';

/**
 * 파일 확장자에 따른 아이콘 반환
 */
export function getFileIcon(mime) {
    if (!mime) return '📎';
    mime = mime.toLowerCase();
    if (mime.includes('image')) return '🖼️';
    if (mime.includes('pdf')) return '📕';
    if (mime.includes('word') || mime.includes('text')) return '📄';
    if (mime.includes('zip') || mime.includes('compressed')) return '📦';
    return '📎';
}

/**
 * 첨부파일 영역 HTML 생성
 */
export function renderAttachmentBox(attachments) {
    if (!attachments || attachments.length === 0) return '';

    let html = '<div class="memo-attachments">';
    attachments.forEach(a => {
        const icon = getFileIcon(a.file_type || '');
        html += `
            <a href="javascript:void(0)" 
               class="file-chip" 
               title="${escapeHTML(a.original_name)}" 
               onclick="event.stopPropagation(); window.downloadFile('${a.filename}', '${escapeHTML(a.original_name)}')">
                <span class="icon">${icon}</span>
                <span class="name">${escapeHTML(a.original_name)}</span>
            </a>`;
    });
    html += '</div>';
    return html;
}
