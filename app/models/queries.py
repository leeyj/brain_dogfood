"""
app/models/queries.py
프로젝트에서 사용하는 모든 SQL 쿼리를 중앙 집중 관리하는 모듈입니다.
정적 쿼리는 상수로, 동적 쿼리는 정적 메서드를 통해 생성합니다.
"""

class SchemaQueries:
    """데이터베이스 초기화 및 마이그레이션(DDL) 쿼리"""
    CREATE_MEMOS_TABLE = '''
        CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            summary TEXT,
            color TEXT DEFAULT '#2c3e50',
            is_pinned BOOLEAN DEFAULT 0,
            status TEXT DEFAULT 'active',
            group_name TEXT DEFAULT 'default',
            is_encrypted BOOLEAN DEFAULT 0,
            category TEXT,
            due_date TEXT,
            uuid TEXT UNIQUE,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
    '''
    
    CREATE_TAGS_TABLE = '''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memo_id INTEGER,
            name TEXT,
            source TEXT,
            FOREIGN KEY (memo_id) REFERENCES memos (id) ON DELETE CASCADE
        )
    '''
    
    CREATE_ATTACHMENTS_TABLE = '''
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memo_id INTEGER,
            filename TEXT,
            original_name TEXT,
            file_type TEXT,
            size INTEGER,
            created_at TIMESTAMP,
            FOREIGN KEY (memo_id) REFERENCES memos (id) ON DELETE SET NULL
        )
    '''
    
    CREATE_LINKS_TABLE = '''
        CREATE TABLE IF NOT EXISTS memo_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER,
            target_id INTEGER,
            FOREIGN KEY (source_id) REFERENCES memos (id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES memos (id) ON DELETE CASCADE
        )
    '''

    MIGRATIONS = [
        ("ALTER TABLE memos ADD COLUMN status TEXT DEFAULT 'active'", "OperationalError"),
        ("ALTER TABLE memos ADD COLUMN is_encrypted BOOLEAN DEFAULT 0", "OperationalError"),
        ("ALTER TABLE memos ADD COLUMN due_date TEXT", "OperationalError"),
        ("ALTER TABLE memos ADD COLUMN uuid TEXT", "OperationalError"),
        ("CREATE UNIQUE INDEX IF NOT EXISTS idx_memos_uuid ON memos(uuid)", "OperationalError")
    ]


class MemoQueries:
    """메모 CRUD 및 검색 관련 쿼리"""
    
    @staticmethod
    def build_search_query(where_sql):
        return f"SELECT * FROM memos WHERE {where_sql} ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?"

    @staticmethod
    def build_in_clause(count):
        return ','.join(['?'] * count)

    # Bulk Fetch
    SELECT_TAGS_BULK = "SELECT memo_id, name, source FROM tags WHERE memo_id IN ({})"
    SELECT_ATTACHMENTS_BULK = "SELECT id, memo_id, filename, original_name, file_type, size FROM attachments WHERE memo_id IN ({})"
    SELECT_BACKLINKS_BULK = '''
        SELECT ml.target_id, m.id as source_id, m.title 
        FROM memo_links ml
        JOIN memos m ON ml.source_id = m.id
        WHERE ml.target_id IN ({})
    '''
    SELECT_LINKS_BULK = '''
        SELECT ml.source_id, m.id as target_id, m.title 
        FROM memo_links ml
        JOIN memos m ON ml.target_id = m.id
        WHERE ml.source_id IN ({})
    '''

    # Single Item
    SELECT_BY_ID = 'SELECT * FROM memos WHERE id = ?'
    SELECT_BY_UUID = 'SELECT * FROM memos WHERE uuid = ?'
    SELECT_TAGS_BY_MEMO = 'SELECT name, source FROM tags WHERE memo_id = ?'
    SELECT_ATTACHMENTS_BY_MEMO = 'SELECT id, filename, original_name, file_type, size FROM attachments WHERE memo_id = ?'
    
    # Mutation
    @staticmethod
    def build_insert(table, columns):
        cols_str = ', '.join(columns)
        placeholders = ', '.join(['?'] * len(columns))
        return f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})"

    @staticmethod
    def build_update(table, columns, where_col="id"):
        set_clause = ", ".join([f"{col} = ?" for col in columns])
        return f"UPDATE {table} SET {set_clause} WHERE {where_col} = ?"

    DELETE_BY_ID = "DELETE FROM memos WHERE id = ?"
    
    # Tags & Links
    INSERT_TAG = "INSERT INTO tags (memo_id, name, source) VALUES (?, ?, ?)"
    DELETE_TAGS_BY_MEMO = "DELETE FROM tags WHERE memo_id = ?"
    INSERT_LINK = "INSERT INTO memo_links (source_id, target_id) VALUES (?, ?)"
    DELETE_LINKS_BY_MEMO = "DELETE FROM memo_links WHERE source_id = ?"

    # Stats/Meta
    SELECT_ALL_TAGS = "SELECT DISTINCT name FROM tags ORDER BY name ASC"
    SELECT_ALL_CATEGORIES = "SELECT DISTINCT category FROM memos WHERE category IS NOT NULL AND category != '' ORDER BY category ASC"


class FileQueries:
    """파일 업로드 및 자산 관리 관련 쿼리"""
    INSERT_ATTACHMENT = '''
        INSERT INTO attachments (filename, original_name, file_type, size, created_at)
        VALUES (?, ?, ?, ?, ?)
    '''
    SELECT_ATTACHMENT_INFO = '''
        SELECT a.original_name, m.is_encrypted 
        FROM attachments a 
        LEFT JOIN memos m ON a.memo_id = m.id 
        WHERE a.filename = ?
    '''
    SELECT_ALL_ASSETS = '''
        SELECT a.*, m.title as memo_title 
        FROM attachments a 
        LEFT JOIN memos m ON a.memo_id = m.id 
        WHERE m.is_encrypted = 0 OR m.is_encrypted IS NULL
        ORDER BY a.created_at DESC
    '''
    SELECT_ATTACHMENT_BY_FILENAME = 'SELECT id, memo_id FROM attachments WHERE filename = ?'
    DELETE_ATTACHMENT_BY_FILENAME = 'DELETE FROM attachments WHERE filename = ?'
    UPDATE_ATTACHMENT_MEMO = 'UPDATE attachments SET memo_id = ? WHERE filename = ?'
    RESET_ATTACHMENT_MEMO = 'UPDATE attachments SET memo_id = NULL WHERE memo_id = ?'
    DELETE_ATTACHMENTS_BY_MEMO = 'DELETE FROM attachments WHERE memo_id = ?'


class AIQueries:
    """AI 분석 결과 반영 관련 쿼리"""
    UPDATE_SUMMARY = 'UPDATE memos SET summary = ?, updated_at = ? WHERE id = ?'
    DELETE_AI_TAGS = "DELETE FROM tags WHERE memo_id = ? AND source = 'ai'"


class StatsQueries:
    """통계 및 히트맵 관련 쿼리"""
    GET_HEATMAP = '''
        SELECT date, CAST(SUM(create_count) AS INTEGER) as count, CAST(SUM(deadline_count) AS INTEGER) as deadline_count
        FROM (
            SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as create_count, 0 as deadline_count
            FROM memos 
            WHERE status != 'archived' AND created_at >= ? 
            GROUP BY date
            UNION ALL
            SELECT strftime('%Y-%m-%d', due_date) as date, 0 as create_count, COUNT(*) as deadline_count
            FROM memos 
            WHERE status = 'active' AND due_date IS NOT NULL AND due_date >= strftime('%Y-%m-%d', ?)
            GROUP BY date
        )
        WHERE date IS NOT NULL
        GROUP BY date
        ORDER BY date ASC
    '''
