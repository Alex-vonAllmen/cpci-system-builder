from app.db.session import SessionLocal
from app.models import models

db = SessionLocal()
products = db.query(models.Product).all()
print(f"Total Products: {len(products)}")
for p in products:
    print(f"- {p.id}: {p.name}")
