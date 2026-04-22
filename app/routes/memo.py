from flask import Blueprint, request, jsonify, current_app # type: ignore
from ..auth import login_required
from ..services.memo_service import MemoService
from ..utils.i18n import _t

memo_bp = Blueprint('memo', __name__)

@memo_bp.route('/api/memos', methods=['GET'])
@login_required
def get_memos():
    filters = {
        'group': request.args.get('group', 'all'),
        'query': request.args.get('query', ''),
        'date': request.args.get('date', '').replace('null', '').replace('undefined', ''),
        'start_date': request.args.get('start_date', ''),
        'end_date': request.args.get('end_date', ''),
        'category': request.args.get('category', '').replace('null', '').replace('undefined', '')
    }
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    memos = MemoService.get_all_memos(filters, limit, offset)
    return jsonify(memos)

@memo_bp.route('/api/memos/<int:memo_id>', methods=['GET'])
@login_required
def get_memo(memo_id):
    memo = MemoService.get_memo_by_id(memo_id)
    if not memo:
        return jsonify({'error': 'Memo not found'}), 404
    return jsonify(memo)

@memo_bp.route('/api/memos', methods=['POST'])
@login_required
def create_memo():
    try:
        data = request.json
        memo_id = MemoService.create_memo(data)
        return jsonify({'id': memo_id, 'message': 'Memo created'}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"CREATE_MEMO FAILED: {str(e)}")
        return jsonify({'error': str(e)}), 500

@memo_bp.route('/api/memos/<int:memo_id>', methods=['PUT'])
@login_required
def update_memo(memo_id):
    try:
        data = request.json
        success, message = MemoService.update_memo(memo_id, data)
        if not success:
            if message in ["msg_encrypted_locked", "msg_auth_failed"]:
                return jsonify({'error': _t(message)}), 403
            return jsonify({'error': message}), 404
        
        return jsonify({'message': 'Updated'})
    except Exception as e:
        current_app.logger.error(f"UPDATE_MEMO FAILED: {str(e)}")
        return jsonify({'error': str(e)}), 500

@memo_bp.route('/api/memos/<int:memo_id>', methods=['DELETE'])
@login_required
def delete_memo(memo_id):
    success, message = MemoService.delete_memo(memo_id)
    if not success:
        if message == "msg_encrypted_locked":
            return jsonify({'error': _t(message)}), 403
        return jsonify({'error': message}), 404
    return jsonify({'message': 'Deleted memo and all associated files'})

@memo_bp.route('/api/memos/<int:memo_id>/decrypt', methods=['POST'])
@login_required
def decrypt_memo_route(memo_id):
    data = request.json
    password = data.get('password')
    if not password: 
        return jsonify({'error': 'Password required'}), 400
    
    content, error_msg = MemoService.decrypt_memo(memo_id, password)
    if error_msg:
        code = 404 if error_msg == "Memo not found" else 403
        return jsonify({'error': error_msg}), code
    
    return jsonify({'content': content})
