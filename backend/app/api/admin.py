from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app import models, schemas
from app.core.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")

def get_current_admin(token: str = Depends(oauth2_scheme)):
    # Simple token check: in a real app, use JWT
    # Here we just use the password as the token for simplicity in this static user scenario
    # Or better, we issue a dummy token if password matches.
    # Let's implement a simple "token is the password" or similar check?
    # Actually, let's just check if token == ADMIN_PASSWORD for simplicity, 
    # OR implement proper JWT. 
    # Given the requirement "static user", let's keep it simple but secure enough.
    # We will issue a "fake-jwt" which is just "admin-logged-in" + secret?
    # No, let's use the password as the token for this very simple requirement, 
    # but that's insecure over HTTP.
    # Let's use a hardcoded token "valid-admin-token" returned on successful login.
    if token != "valid-admin-token":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "admin"

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != "admin" or form_data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    return {"access_token": "valid-admin-token", "token_type": "bearer"}

# --- Products ---
@router.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/products/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Public endpoint? Or protected? Usually products are public for the configurator.
    # The requirement says "admin panel should be password protected".
    # The configurator needs to read products. So GET should be public.
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.get("/products/{product_id}", response_model=schemas.Product)
def read_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.delete("/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"ok": True}

@router.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: str, product: schemas.ProductCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update fields
    product_data = product.model_dump(exclude_unset=True)
    for key, value in product_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

# --- Rules ---
@router.post("/rules/", response_model=schemas.Rule)
def create_rule(rule: schemas.RuleCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_rule = models.Rule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/rules/", response_model=List[schemas.Rule])
def read_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rules = db.query(models.Rule).offset(skip).limit(limit).all()
    return rules

@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    rule = db.query(models.Rule).filter(models.Rule.id == rule_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"ok": True}

@router.put("/rules/{rule_id}", response_model=schemas.Rule)
def update_rule(rule_id: int, rule: schemas.RuleCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_rule = db.query(models.Rule).filter(models.Rule.id == rule_id).first()
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Update fields
    rule_data = rule.model_dump(exclude_unset=True)
    for key, value in rule_data.items():
        setattr(db_rule, key, value)
        
    db.commit()
    db.refresh(db_rule)
    return db_rule

# --- System Settings ---
@router.get("/settings/", response_model=List[schemas.SystemSetting])
def read_settings(db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    # Settings might be sensitive? Let's protect GET too if it's only for admin panel.
    # But wait, configurator might need some settings?
    # Currently configurator only uses 'central_email' which is fetched by backend logic, not frontend.
    # So protecting GET settings is fine.
    return db.query(models.SystemSetting).all()

@router.put("/settings/{key}", response_model=schemas.SystemSetting)
def update_setting(key: str, setting: schemas.SystemSettingCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    db_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if not db_setting:
        # Create if not exists
        db_setting = models.SystemSetting(key=key, value=setting.value)
        db.add(db_setting)
    else:
        db_setting.value = setting.value
    
    db.commit()
    db.refresh(db_setting)
    return db_setting
