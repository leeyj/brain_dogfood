import os
import uuid
import datetime
from flask import jsonify, request, current_app
from werkzeug.utils import secure_filename
from . import external_bp
from ...auth import api_key_required
from ...security import encrypt_file
from ...database import get_db
from ...models.queries import FileQueries

@external_bp.route('/api/external/upload', methods=['POST'])
@api_key_required
def external_upload_file():
    """외부 앱 전용 파일 업로드 (API Key 인증)"""
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
    upload_folder = current_app.config['UPLOAD_FOLDER']
    filepath = os.path.join(upload_folder, filename)
    
    os.makedirs(upload_folder, exist_ok=True)
    
    file_bytes = file.read()
    encrypted_bytes = encrypt_file(file_bytes)
    with open(filepath, 'wb') as f:
        f.write(encrypted_bytes)
    
    conn = get_db()
    c = conn.cursor()
    c.execute(FileQueries.INSERT_ATTACHMENT, (
        filename, 
        file.filename, 
        ext, 
        os.path.getsize(filepath), 
        datetime.datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()
    
    return jsonify({
        'url': f"/api/download/{filename}",
        'filename': filename,
        'original_name': file.filename,
        'ext': ext
    })
