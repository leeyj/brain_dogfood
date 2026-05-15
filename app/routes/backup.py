import os
import time
import zipfile
import pyzipper
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file, current_app # type: ignore
from ..auth import login_required
from ..database import get_db

backup_bp = Blueprint('backup', __name__)

TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'temp'))
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_old_temps():
    """1시간이 지난 임시 파일들 청소 (서버 용량 확보)"""
    now = time.time()
    for fname in os.listdir(TEMP_DIR):
        fpath = os.path.join(TEMP_DIR, fname)
        if os.path.isfile(fpath):
            if now - os.path.getmtime(fpath) > 3600:
                try:
                    os.remove(fpath)
                except:
                    pass

@backup_bp.route('/api/backup/full', methods=['POST'])
@login_required
def backup_full():
    cleanup_old_temps()
    
    data = request.json or {}
    password = data.get('password')
    if not password:
        return jsonify({'error': 'Password is required for full backup'}), 400
        
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_filename = f"braindogfood_backup_{timestamp}.zip"
    zip_path = os.path.join(TEMP_DIR, zip_filename)
    
    # 루트 폴더 및 데이터 폴더
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    data_dir = os.path.abspath(os.path.join(root_dir, 'data'))
    uploads_dir = current_app.config.get('UPLOAD_FOLDER', os.path.join(root_dir, 'static', 'uploads'))
    
    try:
        # pyzipper를 이용해 AES-256 암호화된 ZIP 생성
        with pyzipper.AESZipFile(zip_path, 'w', compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as zf:
            zf.setpassword(password.encode('utf-8'))
            
            # 1. .env 백업
            env_file = os.path.join(root_dir, '.env')
            if os.path.exists(env_file):
                zf.write(env_file, '.env')
                
            # 2. DB 백업
            db_file = os.path.join(data_dir, 'memos.db')
            if os.path.exists(db_file):
                zf.write(db_file, 'data/memos.db')
                
            # 3. 첨부파일(Uploads) 백업
            if os.path.exists(uploads_dir):
                for root, dirs, files in os.walk(uploads_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # 폴더 구조 유지 (static/uploads/...)
                        arcname = os.path.join('static', 'uploads', os.path.relpath(file_path, uploads_dir))
                        zf.write(file_path, arcname)
                        
        # 생성된 파일을 클라이언트로 스트리밍 (대용량 대응)
        return send_file(zip_path, as_attachment=True, download_name=zip_filename)
        
    except Exception as e:
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return jsonify({'error': 'Backup creation failed', 'message': str(e)}), 500


@backup_bp.route('/api/backup/export', methods=['GET'])
@login_required
def export_memos():
    cleanup_old_temps()
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_filename = f"braindogfood_export_{timestamp}.zip"
    zip_path = os.path.join(TEMP_DIR, zip_filename)
    
    conn = get_db()
    c = conn.cursor()
    
    try:
        # 암호화되지 않은 일반 메모만 쿼리
        c.execute("SELECT * FROM memos WHERE is_encrypted = 0 OR is_encrypted IS NULL")
        memos = c.fetchall()
        
        # 일반 마크다운 모음은 비밀번호가 필요 없으므로 내장 zipfile 사용
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for memo in memos:
                mid = memo['id']
                uuid_str = memo['uuid']
                title = memo['title'] or 'Untitled'
                content = memo['content'] or ''
                category = memo['category'] or ''
                group = memo['group_name'] or ''
                created_at = memo['created_at'] or ''
                
                # 태그 가져오기
                c.execute("SELECT name FROM tags WHERE memo_id = ?", (mid,))
                tags = [row['name'] for row in c.fetchall()]
                
                # Frontmatter (YAML) 생성
                frontmatter = f"---\nuuid: {uuid_str}\ntitle: {title}\n"
                if category:
                    frontmatter += f"category: {category}\n"
                if group:
                    frontmatter += f"group: {group}\n"
                if created_at:
                    frontmatter += f"date: {created_at}\n"
                if tags:
                    tags_str = ", ".join(tags)
                    frontmatter += f"tags: [{tags_str}]\n"
                frontmatter += "---\n\n"
                
                full_content = frontmatter + content
                
                # 파일명 치환 (특수문자 제거, 윈도우 호환성)
                safe_title = "".join([char for char in title if char.isalnum() or char in " _-"]).rstrip()
                if not safe_title:
                    safe_title = "Untitled"
                md_filename = f"{safe_title}_{uuid_str[:8]}.md"
                
                # ZIP 파일 내에 즉시 기록
                zf.writestr(md_filename, full_content.encode('utf-8'))
                
        conn.close()
        return send_file(zip_path, as_attachment=True, download_name=zip_filename)
        
    except Exception as e:
        conn.close()
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return jsonify({'error': 'Export failed', 'message': str(e)}), 500
