/**
 * 첨부파일 영역 및 파일 칩 UI 컴포넌트 (DOM 노드 기반)
 */
import { escapeHTML, downloadFile } from '../utils.js';

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
 * 첨부파일 영역 DOM 노드 생성 및 이벤트 바인딩
 */
export function renderAttachmentBox(attachments) {
    if (!attachments || attachments.length === 0) return null;

    const container = document.createElement('div');
    container.className = 'memo-attachments';
    
    attachments.forEach(a => {
        const icon = getFileIcon(a.file_type || '');
        const chip = document.createElement('a');
        chip.href = 'javascript:void(0)';
        chip.className = 'file-chip';
        chip.title = a.original_name || 'file';
        
        // 💡 내부 구조 생성
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.innerText = icon;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.innerText = a.original_name || 'file';
        
        chip.appendChild(iconSpan);
        chip.appendChild(nameSpan);
        
        // 💡 클릭 이벤트 바인딩 (전역 window.downloadFile 의존성 제거)
        chip.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadFile(a.filename || a.file_name, a.original_name || a.name || 'file');
        };
        
        container.appendChild(chip);
    });
    
    return container;
}
