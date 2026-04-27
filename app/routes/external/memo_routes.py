import re
import yaml
from flask import jsonify, request
from . import external_bp
from .utils import extract_attachment_filenames
from ...auth import api_key_required
from ...models.memo_repo import MemoRepository
from ...services.memo_service import MemoService

@external_bp.route('/api/external/memos', methods=['GET'])
@api_key_required
def list_memos():
    """외부 앱용 메모 목록 조회 (동기화용 메타데이터 위주)"""
    try:
        memos = MemoRepository.get_all({'group': 'all'}, limit=1000)
        return jsonify([{
            'id': m['id'],
            'uuid': m['uuid'],
            'title': m['title'],
            'updated_at': m['updated_at'],
            'is_encrypted': m['is_encrypted'],
            'group': m['group_name']
        } for m in memos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/memos/<string:memo_uuid>', methods=['GET'])
@api_key_required
def get_memo_markdown(memo_uuid):
    """특정 메모를 옵시디언 마크다운(Frontmatter 포함) 형식으로 반환"""
    try:
        memo = MemoRepository.get_by_uuid(memo_uuid)
        if not memo:
            return jsonify({'error': 'Memo not found'}), 404
        
        content = memo['content'] or ""
        frontmatter = {
            'id': memo['id'],
            'uuid': memo['uuid'],
            'title': memo['title'] or "Untitled",
            'is_encrypted': memo['is_encrypted'],
            'created_at': memo['created_at'],
            'updated_at': memo['updated_at'],
            'group': memo['group_name'],
            'due_date': memo['due_date'],
            'tags': [t['name'] for t in memo.get('tags', [])],
            'attachments': memo.get('attachments', [])
        }

        yaml_str = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
        markdown_body = f"---\n{yaml_str}---\n\n{content}"
        
        return jsonify({
            'id': memo['id'],
            'uuid': memo['uuid'],
            'title': memo['title'],
            'filename': f"{memo['uuid']}.md",
            'markdown': markdown_body,
            'updated_at': memo['updated_at'],
            'attachments': memo.get('attachments', [])
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/memos/<string:memo_uuid>/json', methods=['GET'])
@api_key_required
def get_memo_json(memo_uuid):
    """특정 메모의 모든 필드를 순수 JSON 형식으로 반환"""
    try:
        memo = MemoRepository.get_by_uuid(memo_uuid)
        if not memo:
            return jsonify({'error': 'Memo not found'}), 404
        return jsonify(memo)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/memos', methods=['POST'])
@api_key_required
def create_new_memo():
    """외부 앱으로부터 마크다운 본문 또는 JSON을 받아 새 메모 생성"""
    try:
        data = request.get_json(silent=True)
        
        if data and isinstance(data, dict):
            # JSON 방식
            title = data.get('title', "New Memo from External")
            content = data.get('content', '')
            user_uuid = data.get('uuid')
            group_name = data.get('group', 'default')
            attachment_filenames = data.get('attachment_filenames', [])
        else:
            # Raw Markdown 방식
            markdown_text = request.data.decode('utf-8')
            if not markdown_text:
                return jsonify({'error': 'No content provided'}), 400

            title = "New Memo from External"
            content = markdown_text
            user_uuid = None
            
            fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', markdown_text, re.DOTALL)
            if fm_match:
                try:
                    fm_data = yaml.safe_load(fm_match.group(1))
                    if fm_data:
                        if 'title' in fm_data: title = fm_data['title']
                        if 'uuid' in fm_data: user_uuid = fm_data['uuid']
                    content = fm_match.group(2).strip()
                except Exception:
                    pass
            attachment_filenames = extract_attachment_filenames(markdown_text)

        memo_id = MemoService.create_memo({
            'title': title,
            'content': content,
            'uuid': user_uuid,
            'group_name': group_name,
            'attachment_filenames': attachment_filenames
        })

        new_memo = MemoRepository.get_by_id(memo_id)
        return jsonify({
            'message': 'Memo created successfully',
            'id': memo_id,
            'uuid': new_memo['uuid'],
            'title': new_memo['title']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/memos/<string:memo_uuid>', methods=['POST'])
@api_key_required
def update_memo_markdown(memo_uuid):
    """외부 앱으로부터 마크다운 본문을 받아 메모 업데이트"""
    try:
        memo = MemoRepository.get_by_uuid(memo_uuid)
        if not memo:
            return jsonify({'error': 'Memo not found'}), 404
        if memo['is_encrypted']:
            return jsonify({'error': 'Cannot update encrypted memo via external API.'}), 403

        data = request.get_json(silent=True)
        if data and isinstance(data, dict):
            markdown_text = data.get('content', '')
            title = data.get('title', memo['title'])
        else:
            markdown_text = request.data.decode('utf-8')
            title = memo['title']

        if not markdown_text:
            return jsonify({'error': 'No content provided'}), 400

        content = markdown_text
        fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', markdown_text, re.DOTALL)
        if fm_match:
            try:
                fm_data = yaml.safe_load(fm_match.group(1))
                if fm_data and 'title' in fm_data: title = fm_data['title']
                content = fm_match.group(2).strip()
            except Exception: pass

        attachment_filenames = extract_attachment_filenames(markdown_text)
        success, message = MemoService.update_memo(memo['id'], {
            'title': title,
            'content': content,
            'attachment_filenames': attachment_filenames
        })

        if success:
            return jsonify({'message': 'Memo updated successfully', 'uuid': memo_uuid})
        else:
            return jsonify({'error': message}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/memos/<string:memo_uuid>', methods=['PATCH'])
@api_key_required
def patch_memo(memo_uuid):
    """특정 메모의 일부 필드만 업데이트"""
    try:
        memo = MemoRepository.get_by_uuid(memo_uuid)
        if not memo:
            return jsonify({'error': 'Memo not found'}), 404
            
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        success, message = MemoService.update_memo(memo['id'], data)
        if success:
            return jsonify({'message': 'Memo patched successfully', 'uuid': memo_uuid})
        else:
            return jsonify({'error': message}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/search', methods=['GET'])
@api_key_required
def search_external_memos():
    """외부 앱용 고도화된 검색 API"""
    try:
        query = request.args.get('q', '')
        group_filter = request.args.get('group', 'all')
        tag_filter = request.args.get('tag', '')
        
        filters = {
            'query': query,
            'group': f"tag:{tag_filter}" if tag_filter else group_filter
        }
            
        memos = MemoRepository.get_all(filters, limit=50)
        return jsonify([{
            'uuid': m['uuid'],
            'title': m['title'],
            'content_preview': (m['content'][:100] + '...') if m['content'] and not m['is_encrypted'] else '',
            'category': m['category'],
            'tags': [t['name'] for t in m.get('tags', [])],
            'updated_at': m['updated_at'],
            'group': m['group_name']
        } for m in memos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
