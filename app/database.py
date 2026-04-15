import os
import sqlite3

# Data directory relative to this file
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'memos.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Memos Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            summary TEXT,
            color TEXT DEFAULT '#2c3e50',
            is_pinned BOOLEAN DEFAULT 0,
            status TEXT DEFAULT 'active', -- 'active', 'done', 'archived'
            group_name TEXT DEFAULT 'default',
            is_encrypted BOOLEAN DEFAULT 0,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
    ''')
    
    try:
        c.execute("ALTER TABLE memos ADD COLUMN status TEXT DEFAULT 'active'")
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute("ALTER TABLE memos ADD COLUMN is_encrypted BOOLEAN DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    
    # 2. Separate Tags Table (Normalized)
    c.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memo_id INTEGER,
            name TEXT,
            source TEXT, -- 'user' or 'ai'
            FOREIGN KEY (memo_id) REFERENCES memos (id) ON DELETE CASCADE
        )
    ''')

    # 3. Attachments Table (Enhanced Asset Tracking)
    c.execute('''
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
    ''')
    
    # 4. Memo Links Table (Backlinks)
    c.execute('''
        CREATE TABLE IF NOT EXISTS memo_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER,
            target_id INTEGER,
            FOREIGN KEY (source_id) REFERENCES memos (id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES memos (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
