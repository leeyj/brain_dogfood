import datetime
from flask import Blueprint, request, jsonify, current_app # type: ignore
from ..database import get_db
from ..auth import login_required
from ..constants import GROUP_DONE, GROUP_DEFAULT
from ..utils.i18n import _t
from ..utils import extract_links
from ..security import encrypt_content, decrypt_content

memo_bp = Blueprint('memo', __name__)

@memo_bp.route('/api/memos', methods=['GET'])
@login_required
def get_memos():
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    group = request.args.get('group', 'all')
    query = request.args.get('query', '')
    date = request.args.get('date', '')
    
    conn = get_db()
    c = conn.cursor()
    
    where_clauses = []
    params = []
    
    # 1. 그룹/태그 필터링
    if group == GROUP_DONE:
        where_clauses.append("status = 'done'")
    elif group.startswith('tag:'):
        tag_name = group.split(':')[-1]
        where_clauses.append("status != 'done'")
        where_clauses.append("id IN (SELECT memo_id FROM tags WHERE name = ?)")
        params.append(tag_name)
    elif group != 'all':
        where_clauses.append("status != 'done'")
        where_clauses.append("group_name = ?")
        params.append(group)
    else:
        where_clauses.append("status != 'done'")
        
    # 2. 검색어 필터링
    if query:
        where_clauses.append("(title LIKE ? OR content LIKE ?)")
        params.append(f"%{query}%")
        params.append(f"%{query}%")
        
    # 3. 날짜 필터링 (캘린더 선택)
    if date:
        where_clauses.append("created_at LIKE ?")
        params.append(f"{date}%")

    # 4. 초기 로드 시 최근 5일 강조 (필터가 없는 경우에만 적용)
    if offset == 0 and group == 'all' and not query and not date:
        start_date = (datetime.datetime.now() - datetime.timedelta(days=5)).isoformat()
        where_clauses.append("(updated_at >= ? OR is_pinned = 1)")
        params.append(start_date)

    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
    
    query_sql = f"SELECT * FROM memos WHERE {where_sql} ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?"
    c.execute(query_sql, params + [limit, offset])
    memo_rows = c.fetchall()
    
    if not memo_rows:
        conn.close()
        return jsonify([])
        
    memos = [dict(r) for r in memo_rows]
    memo_ids = [m['id'] for m in memos]
    placeholders = ','.join(['?'] * len(memo_ids))
    
    # --- 🚀 Bulk Fetch: N+1 문제 해결 ---
    
    # 태그 한꺼번에 가져오기
    c.execute(f'SELECT memo_id, name, source FROM tags WHERE memo_id IN ({placeholders})', memo_ids)
    tags_rows = c.fetchall()
    tags_map = {}
    for t in tags_rows:
        tags_map.setdefault(t['memo_id'], []).append(dict(t))
        
    # 첨부파일 한꺼번에 가져오기
    c.execute(f'SELECT id, memo_id, filename, original_name, file_type, size FROM attachments WHERE memo_id IN ({placeholders})', memo_ids)
    attachments_rows = c.fetchall()
    attachments_map = {}
    for a in attachments_rows:
        attachments_map.setdefault(a['memo_id'], []).append(dict(a))
        
    # 백링크 한꺼번에 가져오기
    c.execute(f'''
        SELECT ml.target_id, m.id as source_id, m.title 
        FROM memo_links ml
        JOIN memos m ON ml.source_id = m.id
        WHERE ml.target_id IN ({placeholders})
    ''', memo_ids)
    backlinks_rows = c.fetchall()
    backlinks_map = {}
    for l in backlinks_rows:
        backlinks_map.setdefault(l['target_id'], []).append(dict(l))
        
    # 전방 링크(Forward Links) 한꺼번에 가져오기
    c.execute(f'''
        SELECT ml.source_id, m.id as target_id, m.title 
        FROM memo_links ml
        JOIN memos m ON ml.target_id = m.id
        WHERE ml.source_id IN ({placeholders})
    ''', memo_ids)
    links_rows = c.fetchall()
    links_map = {}
    for l in links_rows:
        links_map.setdefault(l['source_id'], []).append(dict(l))
        
    # 데이터 가공 및 병합
    for m in memos:
        m['tags'] = tags_map.get(m['id'], [])
        m['attachments'] = attachments_map.get(m['id'], [])
        m['backlinks'] = backlinks_map.get(m['id'], [])
        m['links'] = links_map.get(m['id'], [])
        
    conn.close()
    return jsonify(memos)

@memo_bp.route('/api/stats/heatmap', methods=['GET'])
@login_required
def get_heatmap_stats():
    days = request.args.get('days', 365, type=int)
    conn = get_db()
    c = conn.cursor()
    # 파라미터로 받은 일수만큼 데이터 조회
    start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
    
    c.execute('''
        SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count 
        FROM memos 
        WHERE created_at >= ? 
        GROUP BY date
    ''', (start_date,))
    
    stats = c.fetchall()
    conn.close()
    return jsonify([dict(s) for s in stats])

@memo_bp.route('/api/memos', methods=['POST'])
@login_required
def create_memo():
    data = request.json
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    color = data.get('color', '#2c3e50')
    is_pinned = 1 if data.get('is_pinned') else 0
    status = data.get('status', 'active').strip()
    group_name = data.get('group_name', GROUP_DEFAULT).strip()
    user_tags = data.get('tags', [])
    is_encrypted = 1 if data.get('is_encrypted') else 0
    password = data.get('password', '').strip()
    
    if is_encrypted and password:
        content = encrypt_content(content, password)
    elif is_encrypted and not password:
        return jsonify({'error': 'Password required for encryption'}), 400
    
    now = datetime.datetime.now().isoformat()
    if not title and not content:
        return jsonify({'error': 'Title or content required'}), 400
        
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute('''
            INSERT INTO memos (title, content, color, is_pinned, status, group_name, is_encrypted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (title, content, color, is_pinned, status, group_name, is_encrypted, now, now))
        memo_id = c.lastrowid
        
        for tag in user_tags:
            if tag.strip():
                c.execute('INSERT INTO tags (memo_id, name, source) VALUES (?, ?, ?)', (memo_id, tag.strip(), 'user'))
                
        links = extract_links(content)
        for target_id in links:
            c.execute('INSERT INTO memo_links (source_id, target_id) VALUES (?, ?)', (memo_id, target_id))
            
        attachment_filenames = data.get('attachment_filenames', [])
        for fname in set(attachment_filenames):
            c.execute('UPDATE attachments SET memo_id = ? WHERE filename = ?', (memo_id, fname))
            
        conn.commit()
        current_app.logger.info(f"Memo Created: ID {memo_id}, Title: '{title}', Encrypted: {is_encrypted}")
        return jsonify({'id': memo_id, 'message': 'Memo created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@memo_bp.route('/api/memos/<int:memo_id>', methods=['PUT'])
@login_required
def update_memo(memo_id):
    data = request.json
    title = data.get('title')
    content = data.get('content')
    color = data.get('color')
    is_pinned = data.get('is_pinned')
    status = data.get('status')
    group_name = data.get('group_name')
    user_tags = data.get('tags')
    is_encrypted = data.get('is_encrypted')
    password = data.get('password', '').strip()
    
    now = datetime.datetime.now().isoformat()
    conn = get_db()
    c = conn.cursor()
    
    # 보안: 암호화된 메모 수정 시 비밀번호 검증
    c.execute('SELECT content, is_encrypted FROM memos WHERE id = ?', (memo_id,))
    memo = c.fetchone()
    if memo and memo['is_encrypted']:
        # 암호화된 메모지만 '암호화 해제(is_encrypted=0)' 요청이 온 경우는 
        # 비밀번호 없이도 수정을 시도할 수 있어야 할까? (아니오, 인증이 필요함)
        if not password:
            conn.close()
            return jsonify({'error': _t('msg_encrypted_locked')}), 403
        
        # 비밀번호가 맞는지 검증 (복호화 시도)
        if decrypt_content(memo['content'], password) is None:
            conn.close()
            return jsonify({'error': _t('msg_auth_failed')}), 403

    try:
        updates = ['updated_at = ?']
        params = [now]
        
        # 암호화 처리 로직: 암호화가 활성화된 경우(또는 새로 설정하는 경우) 본문 암호화
        final_content = content.strip() if content is not None else None
        if (is_encrypted or (is_encrypted is None and memo['is_encrypted'])) and password:
            if final_content is not None:
                final_content = encrypt_content(final_content, password)
        
        if title is not None:
            updates.append('title = ?'); params.append(title.strip())
        if final_content is not None:
            updates.append('content = ?'); params.append(final_content)
        if color is not None:
            updates.append('color = ?'); params.append(color)
        if is_pinned is not None:
            updates.append('is_pinned = ?'); params.append(1 if is_pinned else 0)
        if status is not None:
            updates.append('status = ?'); params.append(status.strip())
        if group_name is not None:
            updates.append('group_name = ?'); params.append(group_name.strip() or GROUP_DEFAULT)
        if is_encrypted is not None:
            updates.append('is_encrypted = ?'); params.append(1 if is_encrypted else 0)
            
        params.append(memo_id)
        c.execute(f"UPDATE memos SET {', '.join(updates)} WHERE id = ?", params)
        
        if user_tags is not None:
            c.execute("DELETE FROM tags WHERE memo_id = ? AND source = 'user'", (memo_id,))
            for tag in user_tags:
                if tag.strip():
                    c.execute('INSERT INTO tags (memo_id, name, source) VALUES (?, ?, ?)', (memo_id, tag.strip(), 'user'))
                    
        if content is not None:
            c.execute("DELETE FROM memo_links WHERE source_id = ?", (memo_id,))
            links = extract_links(content)
            for target_id in links:
                c.execute('INSERT INTO memo_links (source_id, target_id) VALUES (?, ?)', (memo_id, target_id))
            
        # [Bug Fix] 첨부파일 링크는 본문 수정 여부와 상관없이 항상 갱신
        attachment_filenames = data.get('attachment_filenames')
        if attachment_filenames is not None:
            c.execute('UPDATE attachments SET memo_id = NULL WHERE memo_id = ?', (memo_id,))
            for fname in set(attachment_filenames):
                c.execute('UPDATE attachments SET memo_id = ? WHERE filename = ?', (memo_id, fname))
        
        if is_encrypted is not None:
            if is_encrypted and password and content:
                enc_content = encrypt_content(content, password)
                c.execute("UPDATE memos SET is_encrypted = 1, content = ? WHERE id = ?", (enc_content, memo_id))
            elif is_encrypted == 0:
                c.execute("UPDATE memos SET is_encrypted = 0 WHERE id = ?", (memo_id,))
                
        conn.commit()
        current_app.logger.info(f"Memo Updated: ID {memo_id}, Fields: {list(data.keys())}")
        return jsonify({'message': 'Updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@memo_bp.route('/api/memos/<int:memo_id>', methods=['DELETE'])
@login_required
def delete_memo(memo_id):
    import os
    from flask import current_app
    
    conn = get_db()
    c = conn.cursor()
    
    # 1. 암호화 여부 확인 및 파일 목록 가져오기
    c.execute('SELECT is_encrypted FROM memos WHERE id = ?', (memo_id,))
    memo = c.fetchone()
    if not memo:
        conn.close()
        return jsonify({'error': 'Memo not found'}), 404
        
    if memo['is_encrypted']:
        conn.close()
        return jsonify({'error': _t('msg_encrypted_locked')}), 403

    # 2. 물리적 파일 삭제 준비
    c.execute('SELECT filename FROM attachments WHERE memo_id = ?', (memo_id,))
    files = c.fetchall()
    upload_folder = current_app.config['UPLOAD_FOLDER']
    
    try:
        # 3. 물리 파일 삭제 루프
        for f in files:
            filepath = os.path.join(upload_folder, f['filename'])
            if os.path.exists(filepath):
                os.remove(filepath)
                current_app.logger.info(f"Physical file deleted on memo removal: {f['filename']}")
        
        # 4. 메모 삭제 (외래 키 제약 조건에 의해 tags 등은 자동 삭제되거나 처리됨)
        # Note: attachments 테이블의 memo_id는 SET NULL 설정이므로 수동으로 레코드도 삭제해줍니다.
        c.execute('DELETE FROM attachments WHERE memo_id = ?', (memo_id,))
        c.execute('DELETE FROM memos WHERE id = ?', (memo_id,))
        
        conn.commit()
        current_app.logger.info(f"Memo and its {len(files)} files deleted: ID {memo_id}")
        return jsonify({'message': 'Deleted memo and all associated files'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@memo_bp.route('/api/memos/<int:memo_id>/decrypt', methods=['POST'])
@login_required
def decrypt_memo_route(memo_id):
    data = request.json
    password = data.get('password')
    if not password: return jsonify({'error': 'Password required'}), 400
    conn = get_db(); c = conn.cursor()
    c.execute('SELECT content, is_encrypted FROM memos WHERE id = ?', (memo_id,))
    memo = c.fetchone(); conn.close()
    if not memo: return jsonify({'error': 'Memo not found'}), 404
    if not memo['is_encrypted']: return jsonify({'content': memo['content']})
    decrypted = decrypt_content(memo['content'], password)
    if decrypted is None: 
        current_app.logger.warning(f"Decryption FAILED: ID {memo_id}")
        return jsonify({'error': 'Invalid password'}), 403
    
    current_app.logger.info(f"Decryption SUCCESS: ID {memo_id}")
    return jsonify({'content': decrypted})
