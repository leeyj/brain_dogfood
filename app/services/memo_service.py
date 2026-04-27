import os
import datetime
from flask import current_app
from ..models.memo_repo import MemoRepository
from ..utils import extract_links, parse_and_clean_metadata, generate_auto_title
from ..security import encrypt_content, decrypt_content
from ..constants import GROUP_DEFAULT

class MemoService:
    """
    메모 관련 비즈니스 로직을 처리하는 서비스 클래스.
    메타데이터 파싱, 암호화 처리, 제목 자동 생성, 링크 추출 등을 수행합니다.
    """

    @staticmethod
    def get_all_memos(filters, limit=20, offset=0):
        """
        필터 조건에 맞는 메모 목록을 조회합니다.
        Args:
            filters (dict): 검색 필터 (group, query, date, category 등)
            limit (int): 조회할 개수
            offset (int): 페이징 시작 오프셋
        Returns:
            list: 메모 데이터 딕셔너리 리스트
        """
        return MemoRepository.get_all(filters, limit, offset)

    @staticmethod
    def get_memo_by_id(memo_id):
        """
        ID를 기반으로 특정 메모의 상세 정보를 조회합니다.
        Args:
            memo_id (int): 조회할 메모 ID
        Returns:
            dict|None: 메모 정보 또는 찾지 못한 경우 None
        """
        return MemoRepository.get_by_id(memo_id)

    @staticmethod
    def get_memo_by_uuid(uuid):
        """
        UUID를 기반으로 특정 메모의 상세 정보를 조회합니다.
        """
        return MemoRepository.get_by_uuid(uuid)

    @staticmethod
    def create_memo(data):
        """
        새로운 메모를 생성합니다. 메타데이터 파싱 및 암호화 로직을 포함합니다.
        Args:
            data (dict): 메모 생성을 위한 원본 데이터
        Returns:
            int: 생성된 메모의 고유 ID
        Raises:
            ValueError: 암호화가 활성화되었으나 비밀번호가 없는 경우
        """
        content = data.get('content', '').strip()
        group_name = data.get('group_name', GROUP_DEFAULT).strip()
        user_tags = data.get('tags', [])
        is_encrypted = 1 if data.get('is_encrypted') else 0
        password = data.get('password', '').strip()
        
        # 1. 메타데이터 파싱 및 본문 정리 (본문 내 #태그, @그룹 추출)
        new_content, final_group, final_tags = parse_and_clean_metadata(content, ui_group=group_name, ui_tags=user_tags)
        content = new_content
        group_name = final_group
        user_tags = final_tags

        # 2. 제목 자동 생성 (제목이 없을 경우 본문 요약)
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
            'due_date': data.get('due_date'),
            'uuid': data.get('uuid'),
            'is_encrypted': is_encrypted,
            'created_at': now,
            'updated_at': now
        }
        
        links = extract_links(content)
        attachment_filenames = data.get('attachment_filenames', [])
        
        return MemoRepository.create(repo_data, tags=user_tags, links=links, attachment_filenames=attachment_filenames)

    @staticmethod
    def update_memo(memo_id, data):
        """
        기존 메모를 수정합니다. 암호화된 메모의 경우 권한 확인 과정을 거칩니다.
        Args:
            memo_id (int): 수정할 메모 ID
            data (dict): 수정할 필드 및 값
        Returns:
            tuple: (성공 여부 bool, 결과 메시지 str)
        """
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
        if title == "":
            title = generate_auto_title(content or "")

        now = datetime.datetime.now().isoformat()
        updates = {'updated_at': now}
        
        # 암호화 처리
        is_encrypted = data.get('is_encrypted')
        final_content = content.strip() if content is not None else None
        
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
        if data.get('due_date') is not None: updates['due_date'] = data.get('due_date')

        links = extract_links(content) if content is not None else None
        attachment_filenames = data.get('attachment_filenames')

        MemoRepository.update(memo_id, updates, tags=user_tags, links=links, attachment_filenames=attachment_filenames)
        return True, "Updated"

    @staticmethod
    def delete_memo(memo_id):
        """
        메모를 휴지통으로 보냅니다 (Soft Delete).
        """
        memo = MemoRepository.get_by_id(memo_id)
        if not memo: return False, "Memo not found"
        if memo['is_encrypted']: return False, "msg_encrypted_locked"

        now = datetime.datetime.now().isoformat()
        updates = {
            'status': 'deleted',
            'updated_at': now
        }
        MemoRepository.update(memo_id, updates)
        return True, "Moved to Trash"

    @staticmethod
    def purge_memo(memo_id):
        """
        메모를 데이터베이스에서 영구 삭제합니다 (Hard Delete).
        """
        memo = MemoRepository.get_by_id(memo_id)
        if not memo: return False, "Memo not found"
        if memo['is_encrypted']: return False, "msg_encrypted_locked"

        MemoRepository.permanent_delete(memo_id)
        return True, "Permanently deleted"

    @staticmethod
    def restore_memo(memo_id):
        """
        삭제된 메모를 다시 활성화합니다.
        """
        memo = MemoRepository.get_by_id(memo_id)
        if not memo: return False, "Memo not found"
        
        now = datetime.datetime.now().isoformat()
        updates = {
            'status': 'active',
            'updated_at': now
        }
        MemoRepository.update(memo_id, updates)
        return True, "Restored"

    @staticmethod
    def decrypt_memo(memo_id, password):
        """
        비밀번호를 사용하여 암호화된 메모의 내용을 해독합니다.
        Args:
            memo_id (int): 해독할 메모 ID
            password (str): 해독용 비밀번호
        Returns:
            tuple: (해독된 내용 str, 에러 메시지 str|None)
        """
        memo = MemoRepository.get_by_id(memo_id)
        if not memo: return None, "Memo not found"
        if not memo['is_encrypted']: return memo['content'], None
        
        decrypted = decrypt_content(memo['content'], password)
        if decrypted is None: return None, "Invalid password"
        return decrypted, None

    @staticmethod
    def get_heatmap_stats(days=365):
        """
        활동 히트맵을 그리기 위한 일별 작성 통계를 조회합니다.
        Args:
            days (int): 조회 기간 (일 단위)
        Returns:
            list: [{date, count}, ...] 형식의 리스트
        """
        return MemoRepository.get_heatmap(days)
