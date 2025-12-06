from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Article])
def read_articles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    articles = db.query(models.Article).offset(skip).limit(limit).all()
    return articles

@router.post("/", response_model=schemas.Article)
def create_article(article: schemas.ArticleCreate, db: Session = Depends(get_db)):
    # Validation: Check if product exists
    product = db.query(models.Product).filter(models.Product.id == article.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validation: Check selected options
    if product.options:
        for opt_id, opt_val in article.selected_options.items():
            # Find option definition
            opt_def = next((o for o in product.options if o['id'] == opt_id), None)
            if not opt_def:
                # Option not found in product - Strict Mode: Error? Or Warn?
                # Let's be strict for data integrity
                raise HTTPException(status_code=400, detail=f"Invalid option ID: {opt_id}")
            
            # Validate value
            if opt_def['type'] == 'select':
                valid_values = [c['value'] for c in opt_def['choices']]
                if opt_val not in valid_values:
                    raise HTTPException(status_code=400, detail=f"Invalid value '{opt_val}' for option '{opt_id}'. Valid values: {valid_values}")
            # Boolean/Text validation can be added here

    db_article = models.Article(**article.model_dump())
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article

@router.put("/{article_id}", response_model=schemas.Article)
def update_article(article_id: int, article: schemas.ArticleCreate, db: Session = Depends(get_db)):
    db_article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Validation (Repeat validation logic or extract to function)
    product = db.query(models.Product).filter(models.Product.id == article.product_id).first()
    if not product:
         raise HTTPException(status_code=404, detail="Product not found")

    if product.options:
        for opt_id, opt_val in article.selected_options.items():
            opt_def = next((o for o in product.options if o['id'] == opt_id), None)
            if not opt_def:
                raise HTTPException(status_code=400, detail=f"Invalid option ID: {opt_id}")
            if opt_def['type'] == 'select':
                valid_values = [c['value'] for c in opt_def['choices']]
                if opt_val not in valid_values:
                    raise HTTPException(status_code=400, detail=f"Invalid value '{opt_val}' for option '{opt_id}'")

    db_article.article_number = article.article_number
    db_article.product_id = article.product_id
    db_article.selected_options = article.selected_options

    db.commit()
    db.refresh(db_article)
    return db_article

@router.delete("/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    db_article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(db_article)
    db.commit()
    return {"ok": True}

@router.post("/import", response_model=schemas.ImportSummary)
def import_articles(articles: List[schemas.ArticleImport], db: Session = Depends(get_db)):
    summary = {"created": 0, "updated": 0, "failed": 0, "errors": []}
    
    # Validation Helper (Modifying to raise standard Exception we can catch specifically, or just use general)
    def validate_article_data(article_data: schemas.ArticleBase):
        product = db.query(models.Product).filter(models.Product.id == article_data.product_id).first()
        if not product:
            raise ValueError(f"Product {article_data.product_id} not found")
        
        if product.options:
            for opt_id, opt_val in article_data.selected_options.items():
                opt_def = next((o for o in product.options if o['id'] == opt_id), None)
                if not opt_def:
                     raise ValueError(f"Invalid option ID {opt_id}")
                
                if opt_def['type'] == 'select':
                     # Relaxed Validation: Allow False (boolean) as "Not Selected" / "None"
                     if opt_val is False:
                         continue

                     valid_values = [c['value'] for c in opt_def['choices']]
                     if opt_val not in valid_values:
                          raise ValueError(f"Invalid value '{opt_val}' for option '{opt_id}'")

    # Process
    for a_data in articles:
        try:
            # 1. Validate
            validate_article_data(a_data)
            
            # 2. Upsert
            existing = db.query(models.Article).filter(models.Article.article_number == a_data.article_number).first()
            if existing:
                # Update
                existing.product_id = a_data.product_id
                existing.selected_options = a_data.selected_options
                summary["updated"] += 1
            else:
                # Create
                new_article = models.Article(
                    article_number=a_data.article_number,
                    product_id=a_data.product_id,
                    selected_options=a_data.selected_options
                )
                db.add(new_article)
                summary["created"] += 1
                
        except Exception as e:
            summary["failed"] += 1
            summary["errors"].append(f"{a_data.article_number}: {str(e)}")
            continue
    
    try:
        db.commit()
    except Exception as e:
        # If commit fails (rare integrity error?), rollback
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")
        
    return summary

@router.get("/export", response_model=List[schemas.ArticleExport])
def export_articles(db: Session = Depends(get_db)):
    return db.query(models.Article).all()
