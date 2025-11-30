import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from app.core.config import settings
import logging
import base64

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, attachments: list[dict] = None):
    """
    attachments: list of dicts with 'filename' and 'content' (base64 string)
    """
    if not settings.SMTP_HOST:
        logger.warning("SMTP settings not configured. Email not sent.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        if attachments:
            for attachment in attachments:
                try:
                    # Decode base64 content
                    # Handle data URI scheme if present (e.g. data:application/pdf;base64,...)
                    content_str = attachment['content']
                    if ',' in content_str:
                        content_str = content_str.split(',')[1]
                    
                    file_data = base64.b64decode(content_str)
                    part = MIMEApplication(file_data, Name=attachment['filename'])
                    part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                    msg.attach(part)
                except Exception as e:
                    logger.error(f"Failed to attach file {attachment.get('filename')}: {e}")

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 587)
        server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

def format_quote_email(quote_data: dict, is_sales_copy: bool = False) -> str:
    user = quote_data.get('user', {})
    config = quote_data.get('config', {})
    items = quote_data.get('items', [])
    total_cost = quote_data.get('totalCost', 0)
    
    lines = []
    if is_sales_copy:
        lines.append(f"New Quote Request from {user.get('firstName')} {user.get('lastName')}")
        lines.append("=" * 40)
        lines.append("")
    else:
        lines.append(f"Dear {user.get('title')} {user.get('lastName')},")
        lines.append("")
        lines.append("Thank you for your interest in our CompactPCI Serial Systems.")
        lines.append("Please find the attached quotation PDF for your configured system.")
        lines.append("")

    lines.append("Project Details")
    lines.append("-" * 20)
    lines.append(f"Company: {user.get('company')}")
    lines.append(f"Contact: {user.get('firstName')} {user.get('lastName')}")
    lines.append(f"Email: {user.get('email')}")
    lines.append(f"Phone: {user.get('phone')}")
    
    # Add Delivery Dates
    if user.get('prototypeQty'):
        lines.append(f"Prototype Qty: {user.get('prototypeQty')} (Target: {user.get('prototypeDate') or 'N/A'})")
    if user.get('seriesQty'):
        lines.append(f"Series Qty: {user.get('seriesQty')} (Target: {user.get('seriesDate') or 'N/A'})")
    
    lines.append("")
    
    # Configuration details - ONLY for sales copy
    if is_sales_copy:
        lines.append("Configuration")
        lines.append("-" * 20)
        for item in items:
            lines.append(f"- {item.get('slotLabel')}: {item.get('product', {}).get('name')} ({item.get('product', {}).get('id')})")
            # Add options if any
            options = item.get('options', {})
            if options:
                 lines.append(f"  Options: {', '.join([f'{k}: {v}' for k, v in options.items()])}")
        
        lines.append("")
        lines.append(f"Estimated Total: EUR {total_cost}")
        lines.append("")
    
    if not is_sales_copy:
        lines.append("Our sales team will contact you shortly with a formal offer.")
        lines.append("")
        lines.append("Best regards,")
        lines.append("duagon Sales Team")

    return "\n".join(lines)
