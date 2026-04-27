import os
import sqlite3
from .models.queries import SchemaQueries

# Data directory relative to this file
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'memos.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 테이블 생성 (SchemaQueries 활용)
    c.execute(SchemaQueries.CREATE_MEMOS_TABLE)
    c.execute(SchemaQueries.CREATE_TAGS_TABLE)
    c.execute(SchemaQueries.CREATE_ATTACHMENTS_TABLE)
    c.execute(SchemaQueries.CREATE_LINKS_TABLE)
    
    # 마이그레이션 및 컬럼 추가 처리
    for query, error_type in SchemaQueries.MIGRATIONS:
        try:
            c.execute(query)
        except getattr(sqlite3, error_type):
            pass
    
    

    # UUID 자동 보정 로직 (기존 데이터 대응)
    import uuid
    c.execute("SELECT id FROM memos WHERE uuid IS NULL")
    rows = c.fetchall()
    if rows:
        for row in rows:
            new_uuid = str(uuid.uuid4())
            c.execute("UPDATE memos SET uuid = ? WHERE id = ?", (new_uuid, row[0]))
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
