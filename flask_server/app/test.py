from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy import inspect
from sqlalchemy.orm import sessionmaker
from .models import (SupportMessage)
from . import db
import os
import importlib.util
import logging

base_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
print(f"INIT Base path: {base_path}")
    
config_path = os.path.join(base_path, "config.py")
print(f"INIT Loading config from: {config_path}")

# Load the config module dynamically
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

test_email = config.SYSTEM_TEST_USER_EMAIL
start_time = db.session.execute(db.func.current_timestamp()).scalar()
print(f"start_time: {start_time}")
print(f"test_email: {test_email}")
get_messages = (SupportMessage.query
                .filter_by(sender=test_email)
                .filter(SupportMessage.subject == "Password Reset Request")
                .filter(SupportMessage.archived_at == None)
                # .filter(SupportMessage.created_at >= start_time)
                .order_by(SupportMessage.created_at.desc())
                .first()
            )

print(f"get_messages: {get_messages}")
print(f"get_messages.sender: {get_messages.sender}")
print(f"get_messages.subject: {get_messages.subject}")
print(f"get_messages.created_at: {get_messages.created_at}")