from app.db.session import SessionLocal, engine
from app.models import models
from sqlalchemy import text

db = SessionLocal()

print("Dropping rules table...")
with engine.connect() as connection:
    connection.execute(text("DROP TABLE IF EXISTS rules"))
    connection.commit()

print("Recreating tables...")
models.Base.metadata.create_all(bind=engine)

print("Running seed...")
import seed_rules
