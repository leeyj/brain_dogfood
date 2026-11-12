import os
import uuid
import datetime
import mimetypes
from flask import Blueprint, request, jsonify, current_app, Response, send_from_directory, session # type: ignore
from werkzeug.utils import secure_filename # type: ignore
from urllib.parse import quote # type: ignore
from ..database import get_db
from ..models.queries import FileQueries
from ..auth import login_required, has_valid_api_token
from ..security import encrypt_file, decrypt_file

file_bp = Blueprint('file', __name__)

@file_bp.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'image' not in request.files and 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files.get('image') or request.files.get('file')
    if not file or file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    ext = os.path.splitext(file.filename)[1].lower().replace('.', '')
    sec_conf = current_app.config.get('UPLOAD_SECURITY', {})
    blocked = sec_conf.get('blocked_extensions', [])
    allowed = sec_conf.get('allowed_extensions', [])
    
    if ext in blocked:
        return jsonify({'error': f'Extension .{ext} is blocked for security reasons.'}), 403
    if allowed and ext not in allowed:
        return jsonify({'error': f'Extension .{ext} is not in the allowed list.'}), 403
        
    unique_filename = f"{uuid.uuid4()}.{ext}"
    filename = secure_filename(unique_filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    # Encrypt and save
    file_bytes = file.read()
    encrypted_bytes = encrypt_file(file_bytes)
    with open(filepath, 'wb') as f:
        f.write(encrypted_bytes)
    
    # Record attachment in DB
    conn = get_db()
    c = conn.cursor()
    c.execute(FileQueries.INSERT_ATTACHMENT, (filename, file.filename, ext, os.path.getsize(filepath), datetime.datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    return jsonify({
        'url': f"/api/download/{filename}",
        'name': file.filename,
        'ext': ext
    })

@file_bp.route('/api/download/<filename>')
def download_file_route(filename):
    # 모든 첨부파일은 로그인 세션 또는 외부 API 토큰이 있어야 열람 가능
    # (이전에는 비암호화 메모의 첨부파일·미연결 파일이 URL만 알면 인증 없이 내려받아졌음)
    if not (session.get('logged_in') is True or has_valid_api_token()):
        current_app.logger.warning(f"Access Denied: Unauthenticated download attempt: {filename}")
        return jsonify({'error': 'Unauthorized', 'message': 'Login or API token required'}), 401

    filename = secure_filename(filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    conn = get_db()
    c = conn.cursor()
    c.execute(FileQueries.SELECT_ATTACHMENT_INFO, (filename,))
    row = c.fetchone()
    conn.close()

    with open(filepath, 'rb') as f:
        data = f.read()
        
    decrypted = decrypt_file(data)
    
    orig_name = row['original_name'] if row else filename
    # 원본 파일명 기반으로 정확한 마임타입 추측
    mime_type, _ = mimetypes.guess_type(orig_name)
    if not mime_type: mime_type = 'application/octet-stream'
    
    # 이미지인 경우 'inline'으로 설정하여 브라우저 본문 내 렌더링 허용, 그 외는 'attachment'
    is_image = mime_type.startswith('image/')
    disposition = 'inline' if is_image else 'attachment'
    
    headers = {
        'Content-Disposition': f"{disposition}; filename*=UTF-8''{quote(orig_name)}"
    }
    
    content_data = decrypted if decrypted is not None else data
    return Response(content_data, mimetype=mime_type, headers=headers)

@file_bp.route('/api/assets', methods=['GET'])
@login_required
def get_assets():
    conn = get_db()
    c = conn.cursor()
    # Filter out files belonging to encrypted memos
    c.execute(FileQueries.SELECT_ALL_ASSETS)
    assets = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(assets)
@file_bp.route('/api/attachments/<filename>', methods=['DELETE'])
@login_required
def delete_attachment_route(filename):
    filename = secure_filename(filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    conn = get_db()
    c = conn.cursor()
    # 파일 정보 확인
    c.execute(FileQueries.SELECT_ATTACHMENT_BY_FILENAME, (filename,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'File not found in database'}), 404
        
    # 보안: 메모에 이미 연결된 파일은 삭제하지 않음 (취소 시에는 아직 연결되지 않은 파일만 삭제)
    # 만약 연결된 파일을 삭제하고 싶다면 별도의 로직 필요
    if row['memo_id'] is not None:
        conn.close()
        return jsonify({'error': 'Cannot delete file already linked to a memo'}), 403

    try:
        # 1. DB 삭제
        c.execute(FileQueries.DELETE_ATTACHMENT_BY_FILENAME, (filename,))
        conn.commit()
        
        # 2. 물리 파일 삭제
        if os.path.exists(filepath):
            os.remove(filepath)
            
        current_app.logger.info(f"Attachment Deleted: {filename}")
        return jsonify({'message': 'File deleted successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
