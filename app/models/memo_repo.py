import os
import datetime
from ..database import get_db
from .queries import MemoQueries, StatsQueries, FileQueries

class MemoRepository:
    """
    메모 데이터베이스(SQLite)와의 직접적인 상호작용을 담당하는 레포지토리 클래스.
    """

    @staticmethod
    def get_all(filters, limit=20, offset=0):
        """
        필터 조건에 따른 메모 목록과 연관 데이터(태그, 파일, 링크)를 통합 조회합니다.
        """
        conn = get_db()
        c = conn.cursor()
        
        where_clauses = []
        params = []
        
        group = filters.get('group', 'all')
        query = filters.get('query', '')
        date = filters.get('date', '')
        start_date = filters.get('start_date', '')
        end_date = filters.get('end_date', '')
        category = filters.get('category', '')
        
        # 1. 그룹 필터링
        if group == 'archive':
            where_clauses.append("status IN ('done', 'archived')")
        elif group == 'trash':
            where_clauses.append("status = 'deleted'")
        elif group == 'starred':
            where_clauses.append("is_pinned = 1 AND status != 'deleted'")
        elif group.startswith('tag:'):
            tag_name = group.split(':')[-1]
            where_clauses.append("status NOT IN ('done', 'archived', 'deleted')")
            where_clauses.append("id IN (SELECT memo_id FROM tags WHERE name = ?)")
            params.append(tag_name)
        elif group != 'all':
            where_clauses.append("status NOT IN ('done', 'archived', 'deleted')")
            where_clauses.append("group_name = ?")
            params.append(group)
        else:
            where_clauses.append("status NOT IN ('done', 'archived', 'deleted')")
            
        # 2. 검색어 필터링
        if query:
            where_clauses.append("(title LIKE ? OR content LIKE ?)")
            params.extend([f"%{query}%", f"%{query}%"])
            
        # 3. 날짜 필터링
        if date:
            where_clauses.append("(created_at LIKE ? OR due_date = ?)")
            params.extend([f"{date}%", date])
        elif start_date and end_date:
            # created_at은 isoformat('YYYY-MM-DDTHH:MM:SS')이라 'end 23:59:59'와 문자열 비교 시
            # 'T' > ' ' 때문에 종료일 당일 메모가 누락됨 → 날짜 부분만 비교
            where_clauses.append("(substr(created_at, 1, 10) BETWEEN ? AND ? OR due_date BETWEEN ? AND ?)")
            params.extend([start_date, end_date, start_date, end_date])
            
        # 4. 카테고리 필터링
        if category:
            where_clauses.append("category = ?")
            params.append(category)
            
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        query_sql = MemoQueries.build_search_query(where_sql)
        
        c.execute(query_sql, params + [limit, offset])
        memo_rows = c.fetchall()
        
        if not memo_rows:
            conn.close()
            return []
            
        memos = [dict(r) for r in memo_rows]
        memo_ids = [m['id'] for m in memos]
        in_clause = MemoQueries.build_in_clause(len(memo_ids))
        
        # --- Bulk Fetch (Queries 상호 참조) ---
        c.execute(MemoQueries.SELECT_TAGS_BULK.format(in_clause), memo_ids)
        tags_map = {}
        for t in c.fetchall():
            tags_map.setdefault(t['memo_id'], []).append(dict(t))
            
        c.execute(MemoQueries.SELECT_ATTACHMENTS_BULK.format(in_clause), memo_ids)
        attachments_map = {}
        for a in c.fetchall():
            attachments_map.setdefault(a['memo_id'], []).append(dict(a))
            
        c.execute(MemoQueries.SELECT_BACKLINKS_BULK.format(in_clause), memo_ids)
        backlinks_map = {}
        for link in c.fetchall():
            backlinks_map.setdefault(link['target_id'], []).append(dict(link))
            
        c.execute(MemoQueries.SELECT_LINKS_BULK.format(in_clause), memo_ids)
        links_map = {}
        for link in c.fetchall():
            links_map.setdefault(link['source_id'], []).append(dict(link))
            
        for m in memos:
            m['tags'] = tags_map.get(m['id'], [])
            m['attachments'] = attachments_map.get(m['id'], [])
            m['backlinks'] = backlinks_map.get(m['id'], [])
            m['links'] = links_map.get(m['id'], [])
            
        conn.close()
        return memos

    @staticmethod
    def get_by_id(memo_id):
        """
        특정 ID의 메모 상세 정보를 조회합니다.
        """
        conn = get_db()
        c = conn.cursor()
        c.execute(MemoQueries.SELECT_BY_ID, (memo_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            return None
            
        memo = dict(row)
        c.execute(MemoQueries.SELECT_TAGS_BY_MEMO, (memo_id,))
        memo['tags'] = [dict(r) for r in c.fetchall()]
        c.execute(MemoQueries.SELECT_ATTACHMENTS_BY_MEMO, (memo_id,))
        memo['attachments'] = [dict(r) for r in c.fetchall()]
        conn.close()
        return memo

    @staticmethod
    def get_by_uuid(uuid):
        """
        UUID를 기반으로 특정 메모의 상세 정보를 조회합니다.
        """
        conn = get_db()
        c = conn.cursor()
        c.execute(MemoQueries.SELECT_BY_UUID, (uuid,))
        row = c.fetchone()
        if not row:
            conn.close()
            return None
            
        memo = dict(row)
        memo_id = memo['id']
        c.execute(MemoQueries.SELECT_TAGS_BY_MEMO, (memo_id,))
        memo['tags'] = [dict(r) for r in c.fetchall()]
        c.execute(MemoQueries.SELECT_ATTACHMENTS_BY_MEMO, (memo_id,))
        memo['attachments'] = [dict(r) for r in c.fetchall()]
        conn.close()
        return memo

    @staticmethod
    def create(data, tags=[], links=[], attachment_filenames=[]):
        """
        새로운 메모 레코드를 생성합니다.
        """
        import uuid
        if 'uuid' not in data or not data['uuid']:
            data['uuid'] = str(uuid.uuid4())
            
        conn = get_db()
        c = conn.cursor()
        try:
            sql = MemoQueries.build_insert('memos', data.keys())
            c.execute(sql, list(data.values()))
            memo_id = c.lastrowid
            
            # 연관 데이터 저장
            for tag in tags:
                if tag.strip():
                    c.execute(MemoQueries.INSERT_TAG, (memo_id, tag.strip(), 'user'))
            
            for target_id in links:
                c.execute(MemoQueries.INSERT_LINK, (memo_id, target_id))
                
            for fname in set(attachment_filenames):
                c.execute(FileQueries.UPDATE_ATTACHMENT_MEMO, (memo_id, fname))
                
            conn.commit()
            return memo_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def update(memo_id, updates, tags=None, links=None, attachment_filenames=None):
        """
        기존 메모 레코드를 업데이트합니다.
        """
        conn = get_db()
        c = conn.cursor()
        try:
            if updates:
                sql = MemoQueries.build_update('memos', updates.keys())
                c.execute(sql, list(updates.values()) + [memo_id])
            
            # 태그/링크 갱신
            if tags is not None:
                # 사용자 태그만 교체 (AI 태그는 편집 화면에 표시되지 않으므로 보존)
                c.execute(MemoQueries.DELETE_USER_TAGS_BY_MEMO, (memo_id,))
                for tag in tags:
                    if tag.strip():
                        c.execute(MemoQueries.INSERT_TAG, (memo_id, tag.strip(), 'user'))
            
            if links is not None:
                c.execute(MemoQueries.DELETE_LINKS_BY_MEMO, (memo_id,))
                for target_id in links:
                    c.execute(MemoQueries.INSERT_LINK, (memo_id, target_id))
            
            if attachment_filenames is not None:
                c.execute(FileQueries.RESET_ATTACHMENT_MEMO, (memo_id,))
                for fname in set(attachment_filenames):
                    c.execute(FileQueries.UPDATE_ATTACHMENT_MEMO, (memo_id, fname))
                    
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def permanent_delete(memo_id):
        """
        메모를 데이터베이스에서 영구적으로 삭제합니다. (Hard Delete)
        SQLite는 PRAGMA foreign_keys가 꺼져 있으면 CASCADE가 동작하지 않으므로
        태그/링크/첨부파일을 명시적으로 정리합니다.
        """
        conn = get_db()
        c = conn.cursor()
        try:
            c.execute(MemoQueries.SELECT_ATTACHMENTS_BY_MEMO, (memo_id,))
            filenames = [r['filename'] for r in c.fetchall()]

            c.execute(FileQueries.DELETE_ATTACHMENTS_BY_MEMO, (memo_id,))
            c.execute(MemoQueries.DELETE_TAGS_BY_MEMO, (memo_id,))
            c.execute(MemoQueries.DELETE_LINKS_BOTH_BY_MEMO, (memo_id, memo_id))
            c.execute(MemoQueries.DELETE_BY_ID, (memo_id,))
            conn.commit()

            # DB 커밋 후 물리 파일 삭제 (실패해도 DB 정합성에는 영향 없음)
            try:
                from flask import current_app
                upload_dir = current_app.config.get('UPLOAD_FOLDER')
            except RuntimeError:
                upload_dir = None
            if upload_dir:
                for fname in filenames:
                    fpath = os.path.join(upload_dir, os.path.basename(fname))
                    try:
                        if os.path.exists(fpath):
                            os.remove(fpath)
                    except OSError:
                        pass
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def get_heatmap(days=365):
        """
        활동 통계 데이터를 생성합니다.
        """
        conn = get_db()
        c = conn.cursor()
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
        
        c.execute(StatsQueries.GET_HEATMAP, (start_date, start_date))
        stats = [
            {
                'date': s['date'],
                'count': int(s['count'] or 0),
                'deadline_count': int(s['deadline_count'] or 0)
            } 
            for s in c.fetchall()
        ]
        conn.close()
        return stats
