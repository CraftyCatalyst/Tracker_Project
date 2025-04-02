from flask_mail import Message
from flask import render_template, current_app
from app import mail
from ..logging_util import setup_logger
import logging

logger = setup_logger("send_email")
# logger = logging.getLogger(__name__)

def send_email(to, subject, template_name, context={}, plain_override=None, html_only=False, headers=None):
    try:
        with current_app.app_context():
            # Render templates
            if template_name:
                text_body = render_template(f"emails/{template_name}.txt", **context)
                html_body = render_template(f"emails/{template_name}.html", **context)
            else:
                text_body = plain_override
                html_body = None


            # logger.debug(f"Email_util - Email body: {text_body}")
            # logger.debug(f"Email_util - Email body: {html_body}")
            
            data = {
                "from": "support@mg.satisfactorytracker.com",
                "to": [to],
                "subject": subject,
            }
            if headers:
                for key, value in headers.items():
                    data[f"h:{key}"] = value

            msg = Message(
                subject=subject,
                sender="Satisfactory Tracker Support <support@mg.satisfactorytracker.com>",
                recipients=[to],
                body=text_body if not html_only else None,
                html=html_body
            )
            
            # logger.debug(f"Email_util - Email message: {msg}")
            # Add headers if provided
                        
            # logger.debug(f"Email_util - Email message: {msg}")
            mail.send(msg)
            logger.info(f"✅ Email sent to {to} with subject: {subject}")
            return True
    except Exception as e:
        logger.error(f"❌ Failed to send email to {to}: {e}")
        return False
