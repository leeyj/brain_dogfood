import yaml
from flask import Blueprint, jsonify, request
from ..models.memo_repo import MemoRepository
from ..auth import api_key_required

external_bp = Blueprint('external', __name__)

@external_bp.route('/api/external/memos', methods=['GET'])
@api_key_required
def list_memos():
    """외부 앱용 메모 목록 조회 (동기화용 메타데이터 위주)"""
    try:
        # get_all은 필터 딕셔너리를 인자로 받습니다.
        memos = MemoRepository.get_all({'group': 'all'}, limit=1000)
        return jsonify([{
            'id': m['id'],
            'title': m['title'],
            'updated_at': m['updated_at'],
            'is_encrypted': m['is_encrypted'],
            'group': m['group_name']
        } for m in memos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@external_bp.route('/api/external/memos/<int:memo_id>', methods=['GET'])
@api_key_required
def get_memo_markdown(memo_id):
    """특정 메모를 옵시디언 마크다운(Frontmatter 포함) 형식으로 반환"""
    try:
        memo = MemoRepository.get_by_id(memo_id)
        if not memo:
            return jsonify({'error': 'Memo not found'}), 404
        
        # 본문 데이터 (암호화된 메모는 암호문 그대로 전달)
        content = memo['content'] or ""

        # 옵시디언용 Frontmatter 구성
        frontmatter = {
            'id': memo['id'],
            'title': memo['title'] or "Untitled",
            'created_at': memo['created_at'],
            'updated_at': memo['updated_at'],
            'group': memo['group_name'],
            'due_date': memo['due_date'],
            'tags': [t['name'] for t in memo.get('tags', [])],
            'attachments': memo.get('attachments', [])
        }

        # YAML 변환
        yaml_str = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
        
        # 최종 마크다운 구성
        markdown_body = f"---\n{yaml_str}---\n\n{content}"
        
        return jsonify({
            'id': memo['id'],
            'filename': f"{memo['id']}.md",
            'markdown': markdown_body,
            'updated_at': memo['updated_at'],
            'attachments': memo.get('attachments', [])
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
