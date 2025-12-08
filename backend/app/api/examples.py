from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
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
    # Check if ID exists
    if db.query(models.ExampleConfig).filter(models.ExampleConfig.id == example.id).first():
        raise HTTPException(status_code=400, detail="Example Number already exists")
    
    db_example = models.ExampleConfig(**example.model_dump())
    db.add(db_example)
    db.commit()
    db.refresh(db_example)
    return db_example

@router.put("/{example_id}", response_model=schemas.ExampleConfig)
def update_example(example_id: str, example: schemas.ExampleConfigUpdate, db: Session = Depends(get_db)):
    db_example = db.query(models.ExampleConfig).filter(models.ExampleConfig.id == example_id).first()
    if db_example is None:
        raise HTTPException(status_code=404, detail="Example not found")
    
    for key, value in example.model_dump().items():
        setattr(db_example, key, value)
    
    db.commit()
    db.refresh(db_example)
    return db_example

@router.delete("/{example_id}")
def delete_example(example_id: str, db: Session = Depends(get_db)):
    db_example = db.query(models.ExampleConfig).filter(models.ExampleConfig.id == example_id).first()
    if db_example is None:
        raise HTTPException(status_code=404, detail="Example not found")
    
    db.delete(db_example)
    db.commit()
    return {"ok": True}

@router.get("/export/all")
def export_examples(db: Session = Depends(get_db)):
    examples = db.query(models.ExampleConfig).all()
    results = []
    for ex in examples:
        # Pydantic dump
        obj = schemas.ExampleConfig.model_validate(ex).model_dump()
        # Parse nested JSON
        try:
            if isinstance(obj['config_json'], str):
                obj['config_json'] = json.loads(obj['config_json'])
        except:
            pass # Keep as string if parsing fails
        results.append(obj)
    return results

@router.post("/import")
def import_examples(examples: List[schemas.ExampleConfigImport], db: Session = Depends(get_db)):
    results = {"created": 0, "updated": 0, "failed": 0, "errors": []}
    
    for ex_data in examples:
        try:
            # Ensure config_json is string for DB
            data_dict = ex_data.model_dump()
            if not isinstance(data_dict['config_json'], str):
                data_dict['config_json'] = json.dumps(data_dict['config_json'])
                
            # Check by ID if present
            # For import, ID is optional in schema (ExampleConfigImport), but we need it for uniqueness.
            # If not provided, should we auto-generate?
            # User said "Example number should be unique". 
            # If ID is missing in import, we can't really "update existing based on Example number".
            # Assume ID is present for update.
            # If missing, maybe fail? Or generate "UNKNOWN-X"?
            
            ex_id = ex_data.id
            if ex_id:
                existing = db.query(models.ExampleConfig).filter(models.ExampleConfig.id == ex_id).first()
                if existing:
                    # Update
                    update_data = data_dict.copy()
                    if 'id' in update_data: del update_data['id']
                    
                    for k, v in update_data.items():
                        setattr(existing, k, v)
                    results["updated"] += 1
                else:
                    # Create with ID
                    db_ex = models.ExampleConfig(**data_dict)
                    db.add(db_ex)
                    results["created"] += 1
            else:
                # Missing ID in import?
                # Generate random?
                # Let's skip or error if ID is required for uniqueness but missing.
                # Or just create and let DB error if null (it is PK).
                # But schema has Optional[str].
                # User requirement: "Import JSON enables to update existing based on the Example number"
                
                # If no ID, we can't determine uniqueness easily.
                results["failed"] += 1
                results["errors"].append(f"Missing Example Number (id) for {ex_data.name}")
                
            db.commit()
        except Exception as e:
            db.rollback()
            results["failed"] += 1
            results["errors"].append(f"Error processing {ex_data.name}: {str(e)}")
            
    return results
