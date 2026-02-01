import sys
import os
from sqlalchemy import text

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.sql_database import engine

def reset_db():
    print("Dropping tables...")
    try:
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS \"Message\" CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS \"Chat\" CASCADE"))
            conn.commit()
        print("Tables dropped successfully!")
    except Exception as e:
        print(f"Error dropping tables: {e}")

if __name__ == "__main__":
    reset_db()
