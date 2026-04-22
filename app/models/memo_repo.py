import datetime
from ..database import get_db

class MemoRepository:
    @staticmethod
    def get_all(filters, limit=20, offset=0):
        """필터 조건에 따른 메모 목록 조회 및 연관 데이터(태그, 링크 등) 통합 조회"""
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
        
        if group == 'done':
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
            
        if query:
            where_clauses.append("(title LIKE ? OR content LIKE ?)")
            params.extend([f"%{query}%", f"%{query}%"])
            
        if date:
            where_clauses.append("created_at LIKE ?")
            params.append(f"{date}%")
        elif start_date and end_date:
            # 💡 주간 뷰 등을 위한 날짜 범위 검색 지원
            where_clauses.append("created_at BETWEEN ? AND ?")
            params.extend([f"{start_date} 00:00:00", f"{end_date} 23:59:59"])
            
        if category:
            where_clauses.append("category = ?")
            params.append(category)
            
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        query_sql = f"SELECT * FROM memos WHERE {where_sql} ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?"
        
        c.execute(query_sql, params + [limit, offset])
        memo_rows = c.fetchall()
        
        if not memo_rows:
            conn.close()
            return []
            
        memos = [dict(r) for r in memo_rows]
        memo_ids = [m['id'] for m in memos]
        placeholders = ','.join(['?'] * len(memo_ids))
        
        # Bulk Fetch Tags
        c.execute(f'SELECT memo_id, name, source FROM tags WHERE memo_id IN ({placeholders})', memo_ids)
        tags_map = {}
        for t in c.fetchall():
            tags_map.setdefault(t['memo_id'], []).append(dict(t))
            
        # Bulk Fetch Attachments
        c.execute(f'SELECT id, memo_id, filename, original_name, file_type, size FROM attachments WHERE memo_id IN ({placeholders})', memo_ids)
        attachments_map = {}
        for a in c.fetchall():
            attachments_map.setdefault(a['memo_id'], []).append(dict(a))
            
        # Bulk Fetch Backlinks
        c.execute(f'''
            SELECT ml.target_id, m.id as source_id, m.title 
            FROM memo_links ml
            JOIN memos m ON ml.source_id = m.id
            WHERE ml.target_id IN ({placeholders})
        ''', memo_ids)
        backlinks_map = {}
        for l in c.fetchall():
            backlinks_map.setdefault(l['target_id'], []).append(dict(l))
            
        # Bulk Fetch Forward Links
        c.execute(f'''
            SELECT ml.source_id, m.id as target_id, m.title 
            FROM memo_links ml
            JOIN memos m ON ml.target_id = m.id
            WHERE ml.source_id IN ({placeholders})
        ''', memo_ids)
        links_map = {}
        for l in c.fetchall():
            links_map.setdefault(l['source_id'], []).append(dict(l))
            
        for m in memos:
            m['tags'] = tags_map.get(m['id'], [])
            m['attachments'] = attachments_map.get(m['id'], [])
            m['backlinks'] = backlinks_map.get(m['id'], [])
            m['links'] = links_map.get(m['id'], [])
            
        conn.close()
        return memos

    @staticmethod
    def get_by_id(memo_id):
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM memos WHERE id = ?', (memo_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            return None
            
        memo = dict(row)
        c.execute('SELECT name, source FROM tags WHERE memo_id = ?', (memo_id,))
        memo['tags'] = [dict(r) for r in c.fetchall()]
        c.execute('SELECT id, filename, original_name, file_type, size FROM attachments WHERE memo_id = ?', (memo_id,))
        memo['attachments'] = [dict(r) for r in c.fetchall()]
        conn.close()
        return memo

    @staticmethod
    def create(data, tags=[], links=[], attachment_filenames=[]):
        conn = get_db()
        c = conn.cursor()
        try:
            placeholders = ', '.join(['?'] * len(data))
            columns = ', '.join(data.keys())
            c.execute(f'INSERT INTO memos ({columns}) VALUES ({placeholders})', list(data.values()))
            memo_id = c.lastrowid
            
            for tag in tags:
                if tag.strip():
                    c.execute('INSERT INTO tags (memo_id, name, source) VALUES (?, ?, ?)', (memo_id, tag.strip(), 'user'))
            
            for target_id in links:
                c.execute('INSERT INTO memo_links (source_id, target_id) VALUES (?, ?)', (memo_id, target_id))
                
            for fname in set(attachment_filenames):
                c.execute('UPDATE attachments SET memo_id = ? WHERE filename = ?', (memo_id, fname))
                
            conn.commit()
            return memo_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def update(memo_id, updates, tags=None, links=None, attachment_filenames=None):
        conn = get_db()
        c = conn.cursor()
        try:
            if updates:
                sql = "UPDATE memos SET " + ", ".join([f"{k} = ?" for k in updates.keys()]) + " WHERE id = ?"
                c.execute(sql, list(updates.values()) + [memo_id])
            
            if tags is not None:
                c.execute("DELETE FROM tags WHERE memo_id = ?", (memo_id,))
                for tag in tags:
                    if tag.strip():
                        c.execute('INSERT INTO tags (memo_id, name, source) VALUES (?, ?, ?)', (memo_id, tag.strip(), 'user'))
            
            if links is not None:
                c.execute("DELETE FROM memo_links WHERE source_id = ?", (memo_id,))
                for target_id in links:
                    c.execute('INSERT INTO memo_links (source_id, target_id) VALUES (?, ?)', (memo_id, target_id))
            
            if attachment_filenames is not None:
                c.execute('UPDATE attachments SET memo_id = NULL WHERE memo_id = ?', (memo_id,))
                for fname in set(attachment_filenames):
                    c.execute('UPDATE attachments SET memo_id = ? WHERE filename = ?', (memo_id, fname))
                    
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def delete(memo_id):
        conn = get_db()
        c = conn.cursor()
        try:
            # Physical file lookup is done in service layer
            c.execute('DELETE FROM attachments WHERE memo_id = ?', (memo_id,))
            c.execute('DELETE FROM memos WHERE id = ?', (memo_id,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def get_heatmap(days=365):
        conn = get_db()
        c = conn.cursor()
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
        c.execute('''
            SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count 
            FROM memos 
            WHERE created_at >= ? 
            GROUP BY date
        ''', (start_date,))
        stats = [dict(s) for s in c.fetchall()]
        conn.close()
        return stats
