import os
import uuid
import datetime
import mimetypes
from flask import Blueprint, request, jsonify, current_app, Response, send_from_directory, session # type: ignore
from werkzeug.utils import secure_filename # type: ignore
from urllib.parse import quote # type: ignore
from ..database import get_db
from ..models.queries import FileQueries
from ..auth import login_required
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
    filename = secure_filename(filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
        
    # Check security status of parent memo
    conn = get_db()
    c = conn.cursor()
    c.execute(FileQueries.SELECT_ATTACHMENT_INFO, (filename,))
    row = c.fetchone()
    conn.close()
    
    # 외부 API 토큰 확인 (Authorization 헤더)
    auth_header = request.headers.get('Authorization')
    is_external_auth = False
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        config_path = os.path.join(os.getcwd(), 'config.json')
        if os.path.exists(config_path):
            import json
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    if config.get('external_api_token') == token:
                        is_external_auth = True
            except: pass

    # 로그인 상태 또는 외부 API 인증 상태 확인
    is_logged_in = (session.get('logged_in') is True) or is_external_auth
    
    # 만약 메모가 암호화되어 있고, 인증도 되어 있지 않다면 차단
    if row and row['is_encrypted'] and not is_logged_in:
        current_app.logger.warning(f"Access Denied: Unauthenticated access to encrypted file {filename}")
        return jsonify({'error': 'Access denied. Please login to view this attachment.'}), 403
        
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
