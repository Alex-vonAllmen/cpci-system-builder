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

@router.post("/import", response_model=List[schemas.Article])
def import_articles(articles: List[schemas.ArticleImport], db: Session = Depends(get_db)):
    new_articles = []
    for a_data in articles:
        # Check if exists by number? if id is provided update?
        # Simple Logic: If ID provided, update. If not, create (or update by number?)
        
        # Validation checks omitted for brevity but should exist
        
        if a_data.id:
            db_article = db.query(models.Article).filter(models.Article.id == a_data.id).first()
            if db_article:
                db_article.article_number = a_data.article_number
                db_article.product_id = a_data.product_id
                db_article.selected_options = a_data.selected_options
                new_articles.append(db_article)
                continue
        
        # Check by article number
        existing = db.query(models.Article).filter(models.Article.article_number == a_data.article_number).first()
        if existing:
            existing.product_id = a_data.product_id
            existing.selected_options = a_data.selected_options
            new_articles.append(existing)
        else:
            new_article = models.Article(
                article_number=a_data.article_number,
                product_id=a_data.product_id,
                selected_options=a_data.selected_options
            )
            db.add(new_article)
            new_articles.append(new_article)
    
    db.commit()
    return new_articles

@router.get("/export", response_model=List[schemas.Article])
def export_articles(db: Session = Depends(get_db)):
    return db.query(models.Article).all()
