import os
import datetime
from flask import current_app
from ..models.memo_repo import MemoRepository
from ..utils import extract_links, parse_and_clean_metadata, generate_auto_title
from ..security import encrypt_content, decrypt_content
from ..constants import GROUP_DEFAULT

class MemoService:
    @staticmethod
    def get_all_memos(filters, limit=20, offset=0):
        return MemoRepository.get_all(filters, limit, offset)

    @staticmethod
    def get_memo_by_id(memo_id):
        return MemoRepository.get_by_id(memo_id)

    @staticmethod
    def create_memo(data):
        content = data.get('content', '').strip()
        group_name = data.get('group_name', GROUP_DEFAULT).strip()
        user_tags = data.get('tags', [])
        is_encrypted = 1 if data.get('is_encrypted') else 0
        password = data.get('password', '').strip()
        
        # 1. 메타데이터 파싱 및 본문 정리
        new_content, final_group, final_tags = parse_and_clean_metadata(content, ui_group=group_name, ui_tags=user_tags)
        content = new_content
        group_name = final_group
        user_tags = final_tags

        # 2. 제목 자동 생성
        title = data.get('title', '').strip()
        if not title:
            title = generate_auto_title(content)

        # 3. 암호화 처리
        if is_encrypted and password:
            content = encrypt_content(content, password)
        elif is_encrypted and not password:
            raise ValueError('Password required for encryption')
        
        now = datetime.datetime.now().isoformat()
        
        repo_data = {
            'title': title,
            'content': content,
            'color': data.get('color', '#2c3e50'),
            'is_pinned': 1 if data.get('is_pinned') else 0,
            'status': data.get('status', 'active').strip(),
            'group_name': group_name,
            'category': data.get('category'),
            'is_encrypted': is_encrypted,
            'created_at': now,
            'updated_at': now
        }
        
        links = extract_links(content)
        attachment_filenames = data.get('attachment_filenames', [])
        
        return MemoRepository.create(repo_data, tags=user_tags, links=links, attachment_filenames=attachment_filenames)

    @staticmethod
    def update_memo(memo_id, data):
        password = data.get('password', '').strip()
        
        # 1. 기존 메모 정보 조회 (암호화 검증용)
        memo = MemoRepository.get_by_id(memo_id)
        if not memo:
            return None, "Memo not found"
            
        if memo['is_encrypted']:
            if not password:
                return None, "msg_encrypted_locked"
            if decrypt_content(memo['content'], password) is None:
                return None, "msg_auth_failed"

        # 2. 데이터 가공
        content = data.get('content')
        group_name = data.get('group_name')
        user_tags = data.get('tags')
        
        if content is not None:
            new_content, final_group, final_tags = parse_and_clean_metadata(
                content, 
                ui_group=(group_name or memo['group_name']), 
                ui_tags=(user_tags if user_tags is not None else [])
            )
            content = new_content
            group_name = final_group
            user_tags = final_tags

        title = data.get('title')
        if title == "": # 빈 문자열일 때만 자동 생성
            title = generate_auto_title(content or "")

        now = datetime.datetime.now().isoformat()
        updates = {'updated_at': now}
        
        # 암호화 처리
        is_encrypted = data.get('is_encrypted')
        final_content = content.strip() if content is not None else None
        
        # 기존 암호화 상태 유지 혹은 신규 설정 시 암호화 적용
        if (is_encrypted or (is_encrypted is None and memo['is_encrypted'])) and password:
            if final_content is not None:
                final_content = encrypt_content(final_content, password)
        
        if title is not None: updates['title'] = title.strip()
        if final_content is not None: updates['content'] = final_content
        if data.get('color') is not None: updates['color'] = data.get('color')
        if data.get('is_pinned') is not None: updates['is_pinned'] = 1 if data.get('is_pinned') else 0
        if data.get('status') is not None: updates['status'] = data.get('status').strip()
        if group_name is not None: updates['group_name'] = group_name.strip()
        if is_encrypted is not None: updates['is_encrypted'] = 1 if is_encrypted else 0
        if data.get('category') is not None: updates['category'] = data.get('category')

        links = extract_links(content) if content is not None else None
        attachment_filenames = data.get('attachment_filenames')

        MemoRepository.update(memo_id, updates, tags=user_tags, links=links, attachment_filenames=attachment_filenames)
        return True, "Updated"

    @staticmethod
    def delete_memo(memo_id):
        memo = MemoRepository.get_by_id(memo_id)
        if not memo: return False, "Memo not found"
        if memo['is_encrypted']: return False, "msg_encrypted_locked"

        # 물리 파일 삭제
        upload_folder = current_app.config['UPLOAD_FOLDER']
        for f in memo['attachments']:
            filepath = os.path.join(upload_folder, f['filename'])
            if os.path.exists(filepath):
                os.remove(filepath)
        
        MemoRepository.delete(memo_id)
        return True, "Deleted"

    @staticmethod
    def decrypt_memo(memo_id, password):
        memo = MemoRepository.get_by_id(memo_id)
        if not memo: return None, "Memo not found"
        if not memo['is_encrypted']: return memo['content'], None
        
        decrypted = decrypt_content(memo['content'], password)
        if decrypted is None: return None, "Invalid password"
        return decrypted, None

    @staticmethod
    def get_heatmap_stats(days=365):
        return MemoRepository.get_heatmap(days)
