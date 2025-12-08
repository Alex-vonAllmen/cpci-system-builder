import sys
import os

# Ensure we can import app
sys.path.append(os.path.dirname(__file__))

from app.db.session import engine, Base
from sqlalchemy import text
from app.models.example import ExampleConfig 

def reset_examples():
    print("Dropping example_configs table...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS example_configs"))
        conn.commit()
    
    print("Re-creating example_configs table...")
    Base.metadata.create_all(bind=engine)
    print("Table re-created.")

    # Now run seed
    # We need to import seed from backend.seed because seed.py is in backend/ not backend/app/
    # If we are running from backend/, we can just import seed
    try:
        from seed import seed
        seed()
    except ImportError:
        # Fallback if python path weirdness
        from backend.seed import seed
        seed()

if __name__ == "__main__":
    reset_examples()
