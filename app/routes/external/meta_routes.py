from flask import jsonify
from . import external_bp
from ...auth import api_key_required
from ...database import get_db
from ...models.queries import MemoQueries

@external_bp.route('/api/external/tags', methods=['GET'])
@api_key_required
def get_external_tags():
    """시스템에 존재하는 모든 고유 태그 목록 조회"""
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute(MemoQueries.SELECT_ALL_TAGS)
        tags = [row['name'] for row in c.fetchall()]
        conn.close()
        return jsonify(tags)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/categories', methods=['GET'])
@api_key_required
def get_external_categories():
    """시스템에 존재하는 모든 고유 카테고리 목록 조회"""
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute(MemoQueries.SELECT_ALL_CATEGORIES)
        categories = [row['category'] for row in c.fetchall()]
        conn.close()
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
