import datetime
from flask import Blueprint, jsonify, current_app # type: ignore
from ..database import get_db
from ..auth import login_required
from ..ai import analyze_memo
from ..utils.i18n import _t

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/api/memos/<int:memo_id>/analyze', methods=['POST'])
@login_required
def analyze_memo_route(memo_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT title, content, is_encrypted FROM memos WHERE id = ?', (memo_id,))
    memo = c.fetchone()
    
    if not memo:
        return jsonify({'error': _t('label_no_results')}), 404
    
    if memo['is_encrypted']:
        return jsonify({'error': _t('msg_encrypted_locked')}), 403
        
    current_app.logger.info(f"AI Analysis Started: ID {memo_id}, Title: '{memo['title']}'")
    
    lang = current_app.config.get('lang', 'en')
    summary, ai_tags = analyze_memo(memo['title'], memo['content'], lang=lang)
    
    try:
        c.execute('UPDATE memos SET summary = ?, updated_at = ? WHERE id = ?', 
                  (summary, datetime.datetime.now().isoformat(), memo_id))
        
        c.execute("DELETE FROM tags WHERE memo_id = ? AND source = 'ai'", (memo_id,))
        for tag in ai_tags:
            if tag.strip():
                c.execute('INSERT INTO tags (memo_id, name, source) VALUES (?, ?, ?)', 
                          (memo_id, tag.strip(), 'ai'))
        
        conn.commit()
        current_app.logger.info(f"AI Analysis SUCCESS: ID {memo_id}, Tags extracted: {len(ai_tags)}")
        return jsonify({'summary': summary, 'tags': ai_tags})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
