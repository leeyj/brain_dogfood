import datetime
from flask import Blueprint, jsonify, current_app, request # type: ignore
from ..database import get_db
from ..models.queries import MemoQueries, AIQueries
from ..auth import login_required
from ..ai import analyze_memo
from ..utils.i18n import _t

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/api/memos/<int:memo_id>/analyze', methods=['POST'])
@login_required
def analyze_memo_route(memo_id):
    conn = get_db()
    c = conn.cursor()
    c.execute(MemoQueries.SELECT_BY_ID, (memo_id,))
    memo = c.fetchone()
    
    lang = request.args.get('lang', 'ko')
    if not memo:
        return jsonify({'error': _t('label_no_results', lang=lang)}), 404
    
    if memo['is_encrypted']:
        return jsonify({'error': _t('msg_encrypted_locked', lang=lang)}), 403
        
    current_app.logger.info(f"AI Analysis Started: ID {memo_id}, Title: '{memo['title']}'")
    
    # 💡 쿼리 파라미터에서 현재 언어 설정을 가져옵니다. (기본값 ko)
    lang = request.args.get('lang', 'ko')
    summary, ai_tags = analyze_memo(memo['title'], memo['content'], lang=lang)
    
    try:
        c.execute(AIQueries.UPDATE_SUMMARY, 
                  (summary, datetime.datetime.now().isoformat(), memo_id))
        
        c.execute(AIQueries.DELETE_AI_TAGS, (memo_id,))
        for tag in ai_tags:
            if tag.strip():
                c.execute(MemoQueries.INSERT_TAG, 
                          (memo_id, tag.strip(), 'ai'))
        
        conn.commit()
        current_app.logger.info(f"AI Analysis SUCCESS: ID {memo_id}, Tags extracted: {len(ai_tags)}")
        return jsonify({'summary': summary, 'tags': ai_tags})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
