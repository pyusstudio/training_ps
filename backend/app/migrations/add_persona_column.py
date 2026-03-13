import sqlite3
import os
from ..config import get_settings

def run_migration():
    settings = get_settings()
    db_path = settings.sqlite_path
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}, skipping migration.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(sessions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "persona_id" not in columns:
            print("Adding persona_id column to sessions table...")
            cursor.execute("ALTER TABLE sessions ADD COLUMN persona_id TEXT DEFAULT 'elena'")
            conn.commit()
            print("Success.")
        else:
            print("persona_id column already exists.")
            
    except Exception as e:
        print(f"Migration error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
