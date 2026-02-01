import sys
import os

# Add parent directory to path so we can import backend logic
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.sql_database import Base, engine
from backend.core.models import Chat, Message

def init_db():
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
