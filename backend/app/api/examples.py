from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models import example as models
from app.schemas import example as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.ExampleConfig])
def read_examples(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    examples = db.query(models.ExampleConfig).offset(skip).limit(limit).all()
    return examples

@router.post("/", response_model=schemas.ExampleConfig)
def create_example(example: schemas.ExampleConfigCreate, db: Session = Depends(get_db)):
    db_example = models.ExampleConfig(**example.model_dump())
    db.add(db_example)
    db.commit()
    db.refresh(db_example)
    return db_example

@router.put("/{example_id}", response_model=schemas.ExampleConfig)
def update_example(example_id: int, example: schemas.ExampleConfigUpdate, db: Session = Depends(get_db)):
    db_example = db.query(models.ExampleConfig).filter(models.ExampleConfig.id == example_id).first()
    if db_example is None:
        raise HTTPException(status_code=404, detail="Example not found")
    
    for key, value in example.model_dump().items():
        setattr(db_example, key, value)
    
    db.commit()
    db.refresh(db_example)
    return db_example

@router.delete("/{example_id}")
def delete_example(example_id: int, db: Session = Depends(get_db)):
    db_example = db.query(models.ExampleConfig).filter(models.ExampleConfig.id == example_id).first()
    if db_example is None:
        raise HTTPException(status_code=404, detail="Example not found")
    
    db.delete(db_example)
    db.commit()
    return {"ok": True}
