from app.db.session import SessionLocal
from app.models import models

db = SessionLocal()
settings = db.query(models.SystemSetting).all()
print(f"Found {len(settings)} settings:")
for s in settings:
    print(f"Key: {s.key}, Value: '{s.value}'")
