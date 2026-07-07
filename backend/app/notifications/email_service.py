import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, cc_emails: list[str] = None):
    """Send email notification"""
    try:
        cc_emails = cc_emails or []

        # Email configuration
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        from_email = os.getenv("SMTP_FROM_EMAIL", smtp_username)
        
        if not all([smtp_host, smtp_username, smtp_password]):
            logger.warning("Email configuration incomplete, skipping email notification")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject

        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)
        
        # Add body
        msg.attach(MIMEText(body, 'plain'))

        # Include CC recipients in actual delivery list
        recipients = [to_email] + cc_emails
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(
                from_email,
                recipients,
                msg.as_string()
            )
        
        logger.info(f"Email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
