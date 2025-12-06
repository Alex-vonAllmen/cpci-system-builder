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

@router.get("/export", response_model=List[schemas.ExampleConfigExport])
def export_examples(db: Session = Depends(get_db)):
    return db.query(models.ExampleConfig).all()

from app.schemas import schemas as global_schemas

@router.post("/import", response_model=global_schemas.ImportSummary)
def import_examples(examples: List[schemas.ExampleConfigImport], db: Session = Depends(get_db)):
    summary = {"created": 0, "updated": 0, "failed": 0, "errors": []}

    for ex_data in examples:
        try:
            # Upsert by example_number
            existing = db.query(models.ExampleConfig).filter(models.ExampleConfig.example_number == ex_data.example_number).first()
            
            if existing:
                existing.name = ex_data.name
                existing.description = ex_data.description
                existing.config_json = ex_data.config_json
                existing.image_url = ex_data.image_url
                summary["updated"] += 1
            else:
                new_example = models.ExampleConfig(**ex_data.model_dump())
                db.add(new_example)
                summary["created"] += 1
                
        except Exception as e:
            summary["failed"] += 1
            summary["errors"].append(f"{ex_data.example_number}: {str(e)}")
            continue

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")
    
    return summary
