from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models import models
from app.schemas import schemas
from app.services import email_service
from app.core.config import settings

router = APIRouter()

@router.post("/quote")
def request_quote(quote: schemas.QuoteRequest, db: Session = Depends(get_db)):
    # Prepare attachments
    attachments = []
    if quote.pdf_base64:
        attachments.append({'filename': 'quotation.pdf', 'content': quote.pdf_base64})
    
    json_attachment = None
    if quote.json_base64:
        json_attachment = {'filename': 'configuration.json', 'content': quote.json_base64}

    # 1. Send email to user (PDF only)
    user_email = quote.user.get('email')
    if user_email:
        subject = "Your CompactPCI Serial System Configuration"
        body = email_service.format_quote_email(quote.model_dump(), is_sales_copy=False)
        email_service.send_email(user_email, subject, body, attachments=attachments)

    # 2. Send email to sales (PDF + JSON)
    # Fetch sales email from system settings
    sales_email_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "central_email").first()
    sales_email = sales_email_setting.value if sales_email_setting else settings.SALES_EMAIL

    if sales_email:
        subject = f"New Quote Request: {quote.user.get('company')}"
        body = email_service.format_quote_email(quote.model_dump(), is_sales_copy=True)
        
        sales_attachments = list(attachments)
        if json_attachment:
            sales_attachments.append(json_attachment)
            
        email_service.send_email(sales_email, subject, body, attachments=sales_attachments)

    return {"status": "success", "message": "Quote requested successfully"}

@router.post("/configurations/", response_model=schemas.Configuration)
def create_configuration(config: schemas.ConfigurationCreate, db: Session = Depends(get_db)):
    # 1. Create Configuration
    db_config = models.Configuration(user_details=config.user_details)
    db.add(db_config)
    db.commit()
    db.refresh(db_config)

    # 2. Create ConfigItems
    for item in config.items:
        db_item = models.ConfigItem(
            configuration_id=db_config.id,
            product_id=item.product_id,
            slot_position=item.slot_position,
            sub_options=item.sub_options
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_config)

    # 3. "Send" Emails
    # Fetch central email
    central_email_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "central_email").first()
    central_email = central_email_setting.value if central_email_setting else "admin@example.com"
    
    requester_email = config.user_details.get("email", "unknown@example.com")
    
    print(f"--- SIMULATING EMAIL SEND ---")
    print(f"To Requester: {requester_email}")
    print(f"Subject: Your Quote Request #{db_config.id}")
    print(f"Body: Thank you for your request...")
    print(f"-----------------------------")
    print(f"To Central: {central_email}")
    print(f"Subject: New Quote Request #{db_config.id}")
    print(f"Body: A new quote request has been submitted by {requester_email}...")
    print(f"-----------------------------")

    return db_config

@router.post("/validate/")
def validate_configuration(items: List[schemas.ConfigItemBase], db: Session = Depends(get_db)):
    # Simple validation logic (placeholder for more complex rules engine)
    # Check for incompatible products based on Rules
    
    warnings = []
    errors = []
    
    product_ids = [item.product_id for item in items]
    
    # Fetch all active rules
    rules = db.query(models.Rule).all()
    
    for rule in rules:
        if rule.trigger_product_id in product_ids:
            # Check incompatibilities
            for incompatible_id in rule.incompatible_product_ids:
                if incompatible_id in product_ids:
                    errors.append(f"Product {rule.trigger_product_id} is incompatible with {incompatible_id}")
            
            # Check requirements
            for required_id in rule.required_product_ids:
                if required_id not in product_ids:
                    warnings.append(f"Product {rule.trigger_product_id} requires {required_id}")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}
