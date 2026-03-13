import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.db import engine
from sqlalchemy import inspect

def verify_schema():
    inspector = inspect(engine)
    
    # Check sessions table for persona_id
    columns = [c['name'] for c in inspector.get_columns('sessions')]
    if 'persona_id' in columns:
        print("SUCCESS: 'persona_id' column found in 'sessions' table.")
    else:
        print("FAILURE: 'persona_id' column NOT found in 'sessions' table.")
        
    # Check system_questions table
    tables = inspector.get_table_names()
    if 'system_questions' in tables:
        print("SUCCESS: 'system_questions' table found.")
    else:
        print("FAILURE: 'system_questions' table NOT found.")

if __name__ == "__main__":
    verify_schema()
