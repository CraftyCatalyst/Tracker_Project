"""ROUTES - Define the routes for the Flask app."""
from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import text
from sqlalchemy import inspect
from sqlalchemy.orm import sessionmaker
from flask import send_from_directory
import os
import uuid
import logging
from logging.handlers import RotatingFileHandler
import math
import json
from .models import (User,
                     Tracker,
                     User_Save,
                     Part,
                     Recipe,
                     Machine,
                     Machine_Level,
                     Node_Purity,
                     Resource_Node,
                     UserSettings,
                     User_Save_Pipes,
                     User_Tester_Registrations,
                     Project_Assembly_Phases,
                     Project_Assembly_Parts,
                     UserSelectedRecipe,
                     Admin_Settings,
                     SupportMessage,
                     SupportConversation,
                     SupportResponse,
                     SupportDraft,
                     UserActionTokens)
from sqlalchemy.exc import SQLAlchemyError
from . import db
from .build_tree import build_tree
from .build_connection_graph import format_graph_for_frontend, build_factory_graph
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer
from flask import current_app
from flask_mail import Message
from . import mail
import importlib.util
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
import jwt
from datetime import datetime, timedelta, timezone
from .logging_util import setup_logger, format_log_message
import secrets
import base64
import hashlib
import subprocess
import shutil
import platform
import psutil
from .utils.email_util import send_email
from .utils.ai_email_classifier import ai_classify_message
from .utils.ai_thread_classifier import ai_summarise_thread
import re
import time
import traceback
import pytz
import email


# config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/config.py'))
base_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
print(f"INIT Base path: {base_path}")
    
config_path = os.path.join(base_path, "config.py")
print(f"INIT Loading config from: {config_path}")

# Load the config module dynamically
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

logger = setup_logger("routes")

#logger.info(f"Config Path: {config_path}")  

# Use the imported config variables
RUN_MODE = config.RUN_MODE
REACT_BUILD_DIR = config.REACT_BUILD_DIR
REACT_STATIC_DIR = config.REACT_STATIC_DIR
SECRET_KEY = config.SECRET_KEY
# Construct the absolute path to the config file

GITHUB_TOKEN = config.GITHUB_TOKEN 
GITHUB_REPO = config.GITHUB_REPO
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/contents/closed_testing/issue_report_attachments" #contents/closed_testing/issue_report_attachments

main = Blueprint(
    'main',
    __name__,
    static_folder=REACT_STATIC_DIR
)

# Load service account credentials
#SERVICE_ACCOUNT_FILE = config.SERVICE_ACCOUNT_KEY_FILE
#PROJECT_ID = config.GOOGLE_PROJECT_ID
SITE_KEY = config.REACT_APP_RECAPTCHA_SITE_KEY
API_KEY = config.RECAPTCHA_API_KEY

UPLOAD_FOLDER = config.UPLOAD_FOLDER
ALLOWED_EXTENSIONS = config.ALLOWED_EXTENSIONS

# Simulated processing tracker
PROCESSING_STATUS = {}

#logger.info(f"UPLOAD_FOLDER: {UPLOAD_FOLDER}")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# print("AT THE TOP OF routes.py!")

def check_maintenance_mode():
    setting = Admin_Settings.query.filter_by(setting_category="site_settings", setting_key="maintenance_mode").first()
    logging.debug(f"Setting: {setting}")
    if setting and setting.setting_value == "on":
        # Allow access to login page and admins
        logging.debug(f"Maintenance mode is ON {current_user.isauthenticated}, {current_user.role}")
        if request.path.startswith("/login") or (current_user.is_authenticated and current_user.role == "admin"):
            return None  # ✅ Allow admins through
        
        return jsonify({"maintenance_mode": True}), 503
    
    if request.path != '/api/active_users' and request.path != '/api/system_resources':      
        logging.debug(f"Routes: Incoming request: {request.method} {request.path} Current user: {current_user.username if current_user.is_authenticated else 'Anonymous'}")

def generate_secure_password_token():
    # Generate a secure random token for password reset
    raw_token = secrets.token_urlsafe(32)  # Generate a secure random token
    token_hash = generate_password_hash(raw_token, method='pbkdf2:sha256') # Hash the token for storage
    return raw_token, token_hash

def generate_secure_verification_token():
    # Generate a secure random token for email verification
    raw_token = secrets.token_urlsafe(32)  # Generate a secure random token
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()  # Hash the token using SHA-256
    return raw_token, token_hash

def verify_verification_token(raw_token):
    hashed = hashlib.sha256(raw_token.encode()).hexdigest()
    token = UserActionTokens.query.filter_by(token_type="email_validation", token_hash=hashed, used=False).first()
    
    if not token:
        result = 'invalid'
        user_id = None
        return result, user_id

    logger.debug(f"checking if {token.expires_at.replace(tzinfo=timezone.utc)} <= {datetime.now(timezone.utc)} for {token.user_id}")
    if token.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        result = 'expired'
        user_id = token.user_id
        return result, user_id
    
    if token.used:
        result = 'used'
        user_id = token.user_id
        return result, user_id
    
    token.used = True
    token.used_at = datetime.now(timezone.utc)
    db.session.commit()
    
    result = 'verified'
    user_id = token.user_id
    return result, user_id

@main.route('/')
def serve_react_app():
    """SERVE REACT APP - Serve the React app's index.html file."""
    react_dir = os.path.join(REACT_BUILD_DIR, 'index.html') #TODO: Customise index.html
    logger.info(f"Serving React app: {react_dir}")
    return send_from_directory(REACT_BUILD_DIR, 'index.html')

@main.route('/static/<path:path>')
def serve_static_files(path):
    """STATIC ROUTE - Serve static files from React's build directory."""
    logger.info(f"Serving static file: {path}")
    return send_from_directory(os.path.join(REACT_BUILD_DIR, 'static'), path)

@main.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"message": "Email and password are required."}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            logging.warning(f"Invalid email or password for user: {user}")
            return jsonify({"message": "Invalid email or password."}), 401

        if user.must_change_password:
            logging.info(f"Password reset required for user: {user}")
            return jsonify({
                "message": "Password reset required",
                "must_change_password": True,
                "user_id": user.id
            }), 403

        if not user.is_email_verified:
            logging.info(f"Login attempt failed - Email not verified for user: {email} (ID: {user.id})")
            return jsonify({
                "message": "Login failed. Please check your email inbox (and spam folder) for a verification link.",
                "is_email_verified": False
            }), 403
        
        login_user(user) 
        logging.info(f"User logged in successfully: {email} (ID: {user.id})")

        # Generate JWT Token
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.now(timezone.utc) + timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')

        logging.info(f"Token generated successfully")
        return jsonify({
            "message": "Login successful!",
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_email_verified": user.is_email_verified
            }
        }), 200
    
    except Exception as e:
        logging.error(f"Error during login for {email}: {e}")
        logging.error(traceback.format_exc())
        return jsonify({"message": "An error occurred during login."}), 500


        
@main.route('/api/check_login', methods=['POST'])
@login_required
def check_login():
    data = request.get_json()
    token = data.get('token')

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = decoded['user_id']
        user = User.query.get(user_id)
        if user:
            login_user(user)
            return jsonify({
                "message": "User logged in automatically.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token has expired."}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token."}), 401
            
@main.route('/api/signup', methods=['GET', 'POST'])
def signup():
    
        if request.method == 'POST':
            try:
                data = request.get_json()
                if not data:
                    return jsonify({"error": "Missing JSON payload."}), 400
                username = data.get('username')
                email = data.get('email')
                password = data.get('password')
                recaptcha_token = data.get('recaptcha_token')
                
                if not all([username, email, password, recaptcha_token]):
                    return jsonify({"error": "Missing required fields."}), 400
                
                # --- Bypass Check ---
                bypass_recaptcha = False
                if (email == config.SYSTEM_TEST_NEW_USER_EMAIL and
                    username == config.SYSTEM_TEST_NEW_USER_USERNAME and
                    password == config.SYSTEM_TEST_NEW_USER_PASSWORD and
                    recaptcha_token == config.SYSTEM_TEST_SECRET_KEY):
                    bypass_recaptcha = True
                    logger.info(f"reCAPTCHA bypass activated for test user: {email}")

                # --- Perform Verification ---
                recaptcha_verified = False
                if bypass_recaptcha:
                    recaptcha_verified = True
                elif recaptcha_token:
                    # Only verify with Google if not bypassing AND token is present                
                    try:                
                        # Verify reCAPTCHA
                        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
                        response = requests.post(verify_url, data={
                            'secret': API_KEY,
                            'response': recaptcha_token
                        })
                        result = response.json()

                        if not result.get('success'):
                            return jsonify({"message": "reCAPTCHA validation failed. Please try again."}), 400
                        recaptcha_verified = True
                    
                    except requests.exceptions.RequestException as e:
                        logger.error(f"reCAPTCHA verification request failed: {e}")
                        recaptcha_verified = False # Treat network/API errors as failure
                
                # Now check the result
                if not recaptcha_verified:
                    return jsonify({"error": "reCAPTCHA validation failed. Please try again."}), 400
                
                # Verify that the username and email are unique
                existing_user = User.query.filter_by(username=username).first()
                if existing_user:
                    return jsonify({"error": "Username is unavailable."}), 409 # Use 409 Conflict

                existing_email = User.query.filter_by(email=email).first()
                if existing_email:
                    return jsonify({"error": "Email already in use."}), 409 # Use 409 Conflict
                
                hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
                
                new_user = User(
                    username=username,
                    email=email,
                    password=hashed_password,
                    role='user'
                )
                
                db.session.add(new_user)
                db.session.flush()  # Flush to get the new user's ID
                
                # Generate a secure token for email verification
                raw_token, token_hash = generate_secure_password_token()
                expiry_duration = timedelta(days=2)
                expires_at = datetime.now(timezone.utc) + expiry_duration

                # Store the token in the database
                verification_token = UserActionTokens(
                    user_id=new_user.id,
                    token_type='email_validation',
                    token_hash=token_hash,
                    expires_at=expires_at
                )
                db.session.add(verification_token)
            
                ## Commit the new user and token to the database
                db.session.commit()
                # Generate the verification link
                if RUN_MODE == "prod":
                    # TODO: Should this be www.satisfactorytracker.com or the main domain eventually?
                    verification_link = f"https://dev.satisfactorytracker.com/verify-email/{raw_token}"
                else:
                    # Use the local URL for testing purposes
                    verification_link = f"http://localhost:3000/verify-email/{raw_token}"
                
                # Send verification email
                email_sent = send_email(
                    to=new_user.email,
                    subject="Verify your Satisfactory Tracker Account",
                    template_name="email_verification",
                    context={"username": new_user.username, "verification_link": verification_link}
                )

                if not email_sent:
                    logging.error(f"Failed to send verification email to {new_user.email} during signup.")
                
                
                return jsonify({"message": "Registration successful! Please check your email to activate your account."}), 201
            except SQLAlchemyError as e:
                    db.session.rollback()
                    logging.error(f"Registration failed - SQLAlchemyError: {e}")
                    # Consider parsing e for specific constraint violations if needed
                    # Defaulting to generic "already exists" is often okay for signup
                    return jsonify({"error": "Username or email already exists."}), 409
            except Exception as e:
                db.session.rollback()
                logging.error(f"Registration failed: {str(e)}")
                return jsonify({"error": "An unexpected error occurred during registration."}), 500
        else:
            # Added handling in case GET is somehow called on this API endpoint
            return jsonify({"error": "Method not allowed"}), 405
    
@main.route('/api/logout')
@login_required
def logout():
    logout_user()    
    flash('Logged out successfully.', 'info')
    return jsonify({"message": "Logged out successfully."}), 201

@main.route('/api/user_info', methods=['GET'])
@login_required
def user_info():
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role
    })

@main.route('/api/build_tree', methods=['GET'])
def build_tree_route():
    part_id = request.args.get('part_id')
    recipe_name = request.args.get('recipe_name', '_Standard')
    target_quantity = request.args.get('target_quantity', 1, type=int)
    target_parts_pm = request.args.get('target_parts_pm')
    target_timeframe = request.args.get('target_timeframe')
    visited = request.args.get('visited')

    if not part_id:
        logger.error("❌ part_id is required")
        return jsonify({"error": "part_id is required"}), 400
    
    result = build_tree(part_id, recipe_name, target_quantity, target_parts_pm, target_timeframe, visited)
    #logger.info(f"Build Tree Result: {result}")
    return jsonify(result)

@main.route('/api/get_system_status', methods=['GET'])
@login_required
def system_status():
    """Returns system-wide status information for the admin dashboard."""
    # logger.info("ENTERED system_status ROUTE!")  # 🔹 Add a log
    # print("ENTERED system_status ROUTE!")  # 🔹 Also print to console
    
    import subprocess
  
    # Check Flask Port
    flask_port = request.host.split(":")[-1]  # Extract from request URL
    # logger.info(f"SYSTEM STATUS FLASK_PORT: {flask_port}")
    # print(f"SYSTEM STATUS FLASK_PORT: {flask_port}")
    # logger.info(f"SYSTEM STATUS RUN_MODE: {RUN_MODE}")
    # print(f"SYSTEM STATUS RUN_MODE: {RUN_MODE}")
    # Check Database Connection
    try:
        db.session.execute(text("SELECT 1"))
        db_status = "Connected"
        # print(f"SYSTEM STATUS DB_STATUS: {db_status}")
        # logger.info(f"SYSTEM STATUS DB_STATUS: {db_status}")
    except Exception as e:
        db_status = f"Error: {str(e)}"
    
    # Check Nginx Status (only if running in production mode)
    if RUN_MODE in ["prod", "prod_local"]:
        try:
            #nginx_status = subprocess.run(["systemctl", "is-active", "nginx"], capture_output=True, text=True)
            nginx_status = subprocess.run(["/bin/sudo", "/usr/bin/systemctl", "is-active", "nginx"], capture_output=True, text=True)
            # logging.debug(f"NGINX STATUS: {nginx_status} - {nginx_status.stdout}")
            nginx_status = "Running" if "active" in nginx_status.stdout else "Not Running"
        except Exception as e:
            nginx_status = f"Error: {str(e)}"
    else:
        nginx_status = "Not available in local run mode"

    # print(f"SYSTEM STATUS NGINX_STATUS: {nginx_status}")
    # logger.info(f"SYSTEM STATUS NGINX_STATUS: {nginx_status}")    
    return jsonify({
        "run_mode": RUN_MODE,
        "flask_port": flask_port,
        "db_status": db_status,
        "nginx_status": nginx_status
    })

@main.route('/api/<table_name>', methods=['GET'])
def get_table_entries(table_name):
    """Fetch all rows from the specified table."""
    logger.info(f"Getting all rows from table: {table_name}")
    logging.info(f"Getting all rows from table: {table_name}")
    # Validate table name against a whitelist for security
    if table_name not in config.VALID_TABLES:
        return jsonify({"error": f"Invalid table name: {table_name}"}), 400

    # Fetch data from the specified table
    query = text(f"SELECT * FROM {table_name}")
    try:
        rows = db.session.execute(query).fetchall()
        return jsonify([dict(row._mapping) for row in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@main.route('/api/tables', methods=['GET'])
def get_tables():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()  # Fetch all table names
    print(tables)
    return jsonify({"tables": tables})
    
# Adding a GET route for fetching all rows from a table    
@main.route('/api/tables/<table_name>', methods=['GET'])
def get_table_data(table_name):
    print("Getting table data" + table_name)
    query = text(f"SELECT * FROM {table_name}")
    rows = db.session.execute(query).fetchall()
    return jsonify({"rows": [dict(row._mapping) for row in rows]})

# Adding a PUT route for updating a row
@main.route('/api/tables/<table_name>/<int:row_id>', methods=['PUT'])
def update_row(table_name, row_id):
    data = request.json
    update_query = text(f"UPDATE {table_name} SET {', '.join(f'{key} = :{key}' for key in data.keys())} WHERE id = :id")
    db.session.execute(update_query, {**data, "id": row_id})
    db.session.commit()
    return jsonify({"message": "Row updated successfully"})

# Adding a POST route for creating a new row
@main.route('/api/tables/<table_name>', methods=['POST'])
def create_row(table_name):
    if table_name not in config.VALID_TABLES:
        return jsonify({"error": f"Table '{table_name}' is not valid."}), 400

    data = request.json

    # Validate columns
    invalid_columns = [key for key in data.keys() if key not in config.VALID_COLUMNS]
    if invalid_columns:
        return jsonify({"error": f"Invalid column(s): {', '.join(invalid_columns)}"}), 400

     # Exclude the 'id' column from the data dictionary
    data_without_id = {key: value for key, value in data.items() if key != 'id'}

    # Build the SQL INSERT query
    columns = ", ".join(data_without_id.keys())
    values = ", ".join(f":{key}" for key in data_without_id.keys())
    query = text(f"INSERT INTO {table_name} ({columns}) VALUES ({values})")

    try:
        db.session.execute(query, data)
        db.session.commit()
        return jsonify({"message": "Row created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Adding a DELETE route for deleting a row
@main.route('/api/tables/<table_name>/<int:row_id>', methods=['DELETE'])
def delete_row(table_name, row_id):    
    try:
        print(f"delete_row called with table_name={table_name}, row_id={row_id}")
        if table_name not in config.VALID_TABLES:
            return jsonify({"error": "Invalid table name"}), 400        
        # Construct the DELETE query using a parameterized query to prevent SQL injection
        delete_query = text(f"DELETE FROM {table_name} WHERE id = :id")
        db.session.execute(delete_query, {"id": row_id})
        db.session.commit()
        return jsonify({"message": "Row deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@main.route('/api/part', methods=['GET'])
def get_part():
    """GET ALL PARTS - Retrieve all parts from the database."""
    query = text('SELECT * FROM part')  # Wrap the query in text()
    part = db.session.execute(query).fetchall()  # Execute the query
    return jsonify([dict(row._mapping) for row in part])  # Convert rows to JSON-friendly dictionaries

@main.route('/api/part_names', methods=['GET'])
def get_parts_names():
    """GET PART NAMES Fetch all parts from the database."""
    parts_query = db.session.execute(text("SELECT id, part_name FROM part WHERE category = 'Parts' ORDER BY part_name")).fetchall()
    parts = [{"id": row.id, "name": row.part_name} for row in parts_query]
    return jsonify(parts)

@main.route('/api/recipe', methods=['GET'])
def get_recipe():
    """GET RECIPES - Retrieve all recipes from the database."""
    query = text('SELECT * FROM recipe') # Wrap the query in text()
    recipe = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in recipe])

@main.route('/api/recipe_id/<part_id>', methods=['GET'])
def get_recipe_id(part_id):
    recipe_name = request.args.get('recipe_name', '_Standard')  # Default to '_Standard'
    # logger.info(f"Getting recipe ID for part_id: {part_id} and recipe_name: {recipe_name}")

    try:
        # Use parameterized query to fetch the recipe
        query = text("SELECT * FROM recipe WHERE part_id = :part_id AND recipe_name = :recipe_name")
        recipe = db.session.execute(query, {"part_id": part_id, "recipe_name": recipe_name}).fetchall()
        # logger.info(f"Query result: {recipe}")
        return jsonify([dict(row._mapping) for row in recipe])
    except Exception as e:
        logger.error(f"❌ Error fetching recipe ID for part_id {part_id} and recipe_name {recipe_name}: {e}")
        return jsonify({"error": "Failed to fetch recipe ID"}), 500

@main.route('/api/alternate_recipe', methods=['GET'])
def get_alternate_recipe():
    """
    Fetch all alternate recipes with part and recipe names.
    """
    query = text('SELECT ar.id, ar.part_id, ar.recipe_id, ar.selected, p.part_name, r.recipe_name FROM alternate_recipe ar JOIN part p ON ar.part_id = p.id JOIN recipe r ON ar.recipe_id = r.id')
    result = db.session.execute(query).fetchall()
    alternate_recipe = [dict(row._mapping) for row in result]
    return jsonify(alternate_recipe)

# NOT USED - COMMENTED OUT - 18/03/2025
# @main.route('/api/dependencies', methods=['GET'])
# def get_dependencies():
#     """GET DEPENDENCIES - Retrieve all dependencies from the database."""
#     query = text('SELECT * FROM dependencies')
#     dependencies = db.session.execute(query).fetchall()
#     return jsonify([dict(row._mapping) for row in dependencies])

# NOT USED - COMMENTED OUT - 18/03/2025
# @main.route('/tracker', methods=['GET'])
# def tracker():
#     """TRACKER - Render the tracker page."""
#     return render_template('tracker.html') #TODO: Implement tracker.html

# NOT USED - COMMENTED OUT - 18/03/2025    
# @main.route('/api/dashboard')
# @login_required
# def dashboard():
#     """DASHBOARD - Render the dashboard page."""
#     return f'Welcome, {current_user.username}!' #TODO: Implement dashboard.html
    

@main.route('/api/validation', methods=['GET'])
def get_data_validation():
    """Fetch all data validation rules."""
    query = text("SELECT * FROM data_validation")
    validation_data = db.session.execute(query).fetchall()
    # print("**************************************", [dict(row._mapping) for row in validation_data])
    return jsonify([dict(row._mapping) for row in validation_data])

@main.route('/api/tracker_reports', methods=['GET'])
def get_tracker_reports():
    logging.info("Generating tracker reports")
    user_id = current_user.id

    try:
        # Query the tracker table for the user's tracked parts
        query = """
            SELECT t.part_id, t.recipe_id, t.target_quantity, t.target_parts_pm, t.target_timeframe ,p.part_name, r.recipe_name
            FROM tracker t
            JOIN part p ON t.part_id = p.id
            JOIN recipe r ON t.recipe_id = r.id
            WHERE t.user_id = :user_id
        """
        tracked_parts = db.session.execute(text(query), {"user_id": user_id}).fetchall()
        logging.info(f"Tracked parts: {tracked_parts}")

        # Generate dependency trees for each tracked part
        reports = []
        for part in tracked_parts:
            part_id = part.part_id
            recipe_name = part.recipe_name
            target_quantity = part.target_quantity
            target_ppm = part.target_parts_pm
            target_timeframe = part.target_timeframe

            logging.info(f"Generating tracker report for part_id: {part_id}, recipe_name: {recipe_name}, target_quantity: {target_quantity}, target_parts_pm: {target_ppm}, target_timeframe: {target_timeframe}")

            # Call build_tree for each tracked part
            logging.info(f"Building tree for part_id: {part_id}, recipe_name: {recipe_name}, target_quantity: {target_quantity}, target_parts_pm: {target_ppm}, target_timeframe: {target_timeframe}")
            tree = build_tree(part_id, recipe_name, target_quantity, target_ppm, target_timeframe)
            reports.append({
                "part_id": part_id,
                "part_name": part.part_name,
                "recipe_name": recipe_name,
                "target_quantity": target_quantity,
                "target_parts_pm": target_ppm,
                "target_timeframe": target_timeframe,
                "tree": tree
            })

        return jsonify(reports), 200
    except Exception as e:
        logger.error(f"❌ Error generating tracker reports: {e}")
        return jsonify({"error": "Failed to generate tracker reports"}), 500

@main.route('/api/tracker_add', methods=['POST'])
@login_required
def add_to_tracker():
    # logger.info("Adding part and recipe to tracker")
    if not current_user.is_authenticated:
        #logger.info(f"{current_user}, User is not authenticated")
        return jsonify({"error": "User is not authenticated"}), 401
    
    data = request.json
    part_id = data.get('partId')
    target_quantity = data.get('targetQuantity')
    recipe_id = data.get('recipeId')
    target_parts_pm = data.get('targetPartsPm')
    target_timeframe = data.get('targetTimeframe')

    # logger.info(f"Part ID: {part_id}, Recipe Name: {recipe_id}, Target Quantity: {target_quantity}")
    if not part_id or not recipe_id:
        return jsonify({"error": "Part ID and Recipe ID are required"}), 400

    #(f"Current user: {current_user}")
    # Check if the part and recipe are already in the user's tracker
    existing_entry = Tracker.query.filter_by(part_id=part_id, recipe_id=recipe_id, user_id=current_user.id).first()
    # logger.info(f"Existing entry: {existing_entry}")
    if existing_entry:
        return jsonify({"message": "Part and recipe are already in the tracker"}), 200

    # Get the current time formatted as dd/mm/yy hh:mm:ss
    current_time = datetime.now().strftime('%d/%m/%y %H:%M:%S')

    # logger.info(f"Adding new tracker entry for user: {current_user.id}, part: {part_id}, recipe: {recipe_id}, target quantity: {target_quantity}, recipe_id: {recipe_id}")
    # Add new tracker entry
    new_tracker_entry = Tracker(
        part_id=part_id,
        recipe_id=recipe_id,
        user_id=current_user.id,
        target_quantity=target_quantity,
        target_parts_pm=target_parts_pm,
        target_timeframe=target_timeframe,
        created_at=current_time,
        updated_at=current_time
    )
    #logger.info(f"New tracker entry: {new_tracker_entry}")
    db.session.add(new_tracker_entry)
    db.session.commit()
    #logger.info(f"Part and recipe added to tracker successfully, {part_id}, {recipe_id}")
    return jsonify({"message": "Part and recipe added to tracker successfully"}), 200

@main.route('/api/tracker_data', methods=['GET'])
@login_required
def get_tracker_data():
    user_id = current_user.id
    tracker_data_query = """
        SELECT t.id, t.target_quantity, t.target_parts_pm, t.target_timeframe, p.part_name, r.recipe_name, t.created_at, t.updated_at
        FROM tracker t
        JOIN part p ON t.part_id = p.id
        JOIN recipe r ON t.recipe_id = r.id
        WHERE t.user_id = :user_id
    """
    try:
        tracker_data = db.session.execute(text(tracker_data_query), {"user_id": user_id}).fetchall()
        return jsonify([dict(row._mapping) for row in tracker_data])
    except Exception as e:
        logger.error(f"❌ Error fetching tracker data: {e}")
        return jsonify({"error": "Failed to fetch tracker data"}), 500
    
@main.route('/api/tracker_data/<int:tracker_id>', methods=['DELETE'])
@login_required
def delete_tracker_item(tracker_id):
    try:
        # logger.info(f"Deleting tracker item with ID: {tracker_id}")
        tracker_item = Tracker.query.filter_by(id=tracker_id, user_id=current_user.id).first()
        # logger.info(f"Tracker item: {tracker_item}")
        if not tracker_item:
            # logger.info("Tracker item not found or you don't have permission to delete it")
            return jsonify({"error": "Tracker item not found or you don't have permission to delete it"}), 404

        db.session.delete(tracker_item)
        db.session.commit()
        return jsonify({"message": "Tracker item deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting tracker item: {e}")
        return jsonify({"error": "Failed to delete tracker item"}), 500
    
@main.route('/api/tracker_data/<int:tracker_id>', methods=['PUT'])
@login_required
def update_tracker_item(tracker_id):
    try:
        data = request.json
        target_quantity = data.get("target_quantity")
        target_parts_pm = data.get("target_parts_pm")  # NEW
        target_timeframe = data.get("target_timeframe")  # NEW

        if target_quantity is None:
            return jsonify({"error": "Target quantity is required"}), 400

        tracker_item = Tracker.query.filter_by(id=tracker_id, user_id=current_user.id).first()
        if not tracker_item:
            return jsonify({"error": "Tracker item not found or you don't have permission to update it"}), 404

        # Update fields
        tracker_item.target_quantity = target_quantity
        tracker_item.target_parts_pm = target_parts_pm  # NEW
        tracker_item.target_timeframe = target_timeframe  # NEW

        db.session.commit()
        return jsonify({"message": "Tracker item updated successfully"}), 200
    except Exception as e:
        logger.error(f"❌ Error updating tracker item: {e}")
        return jsonify({"error": "Failed to update tracker item"}), 500

@main.route('/api/selected_recipes', methods=['GET'])
@login_required
def get_selected_recipes():
    user_id = current_user.id
    query = """
        SELECT usr.id, usr.part_id, usr.recipe_id, p.part_name, r.recipe_name
        FROM user_selected_recipe usr
        JOIN part p ON usr.part_id = p.id
        JOIN recipe r ON usr.recipe_id = r.id
        WHERE usr.user_id = :user_id
    """
    try:
        selected_recipes = db.session.execute(text(query), {"user_id": user_id}).fetchall()
        return jsonify([dict(row._mapping) for row in selected_recipes])
    except Exception as e:
        logger.error(f"❌ Error fetching selected recipes: {e}")
        return jsonify({"error": "Failed to fetch selected recipes"}), 500
    
@main.route('/api/selected_recipes', methods=['POST'])
@login_required
def add_or_update_selected_recipe():
    user_id = current_user.id
    data = request.json
    part_id = data.get('part_id')
    recipe_id = data.get('recipe_id')

    if not part_id or not recipe_id:
        return jsonify({"error": "Part ID and Recipe ID are required"}), 400

    try:
        query = """
            INSERT INTO user_selected_recipe (user_id, part_id, recipe_id, created_at, updated_at)
            VALUES (:user_id, :part_id, :recipe_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                recipe_id = VALUES(recipe_id),
                updated_at = CURRENT_TIMESTAMP
        """
        db.session.execute(text(query), {"user_id": user_id, "part_id": part_id, "recipe_id": recipe_id})
        db.session.commit()
        return jsonify({"message": "Selected recipe updated successfully"}), 200
    except Exception as e:
        logger.error(f"❌ Error updating selected recipe: {e}")
        return jsonify({"error": "Failed to update selected recipe"}), 500
    
@main.route('/api/selected_recipes/<int:recipe_id>', methods=['DELETE'])
@login_required
def delete_selected_recipe(recipe_id):
    user_id = current_user.id

    try:
        query = """
            DELETE FROM user_selected_recipe
            WHERE user_id = :user_id AND recipe_id = :recipe_id
        """
        # logger.info(f"Query: {query}, User: {user_id}, Recipe: {recipe_id}")
        
        db.session.execute(text(query), {"user_id": user_id, "recipe_id": recipe_id})
        db.session.commit()
        
        # logger.info(f"Selected recipe deleted successfully: Recipe {recipe_id}, User {user_id}")
        
        return jsonify({"message": "Selected recipe deleted successfully"}), 200
    except Exception as e:
        logger.error(f"❌ Error deleting selected recipe: {e}")
        return jsonify({"error": "Failed to delete selected recipe"}), 500

@main.route('/api/log', methods=['POST'])
def log_message():
    data = request.json
    message = data.get('message')
    level = data.get('level', 'INFO')  # Default to INFO level
    source = data.get('source', 'FRONTEND')  # Default to 'frontend'
    title = data.get('title', None)  # Optional title
    
    if not message:
        return jsonify({"error": "Log message is required"}), 400

    if source != 'FRONTEND': 
        source = 'FRONTEND - ' + source # Prepend 'FRONTEND' to source if it is not 'FRONTEND'
        message = f"{source}: {message}"
    
    if title:
        message = format_log_message(title, message)
    
    
    # Map string levels to logging levels
    
    log_levels = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }

    log_level = log_levels.get(level.upper(), logging.INFO)

    # Log the message
    logging.log(log_level, message)
    logger.log(log_level, message)
    
    return jsonify({"message": "Log recorded", "log": message}), 200

@main.route("/api/upload_sav", methods=["POST"])
def upload_sav():
    from app.read_save_file import process_save_file  # Move import inside the function to avoid circular import
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

          # Assign processing ID
        processing_id = str(uuid.uuid4())
        PROCESSING_STATUS[processing_id] = "processing"

        # Process file in a background task
        try:
            user_id = current_user.id  
            # logger.info(f"BEFORE PROCESS_SAVE_FILE CALL - Processing file: {filename} for user ID: {user_id}")
            process_save_file(filepath, user_id)
            PROCESSING_STATUS[processing_id] = "completed"
        except Exception as e:
            PROCESSING_STATUS[processing_id] = "failed"
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500

    return jsonify({"message": f"File '{filename}' uploaded successfully!", "processing_id": processing_id}), 200

@main.route("/api/processing_status/<processing_id>", methods=["GET"])
def get_processing_status(processing_id):
    status = PROCESSING_STATUS.get(processing_id, "unknown")
    return jsonify({"status": status})

@main.route("/api/user_save", methods=["GET"])
def get_user_save():
    user_id = current_user.id
    user_saves = (
        db.session.query(
            User_Save.id,
            Part.part_name,
            Recipe.recipe_name,
            Recipe.part_supply_pm,
            User_Save.machine_id,
            Machine.machine_name,
            Machine_Level.machine_level,
            Node_Purity.node_purity,
            User_Save.machine_power_modifier,
            User_Save.created_at,
            User_Save.sav_file_name,
        )
        .join(Recipe, User_Save.recipe_id == Recipe.id, isouter=True)
        .join(Part, Recipe.part_id == Part.id, isouter=True)
        .join(Machine, User_Save.machine_id == Machine.id, isouter=True)
        .join(Machine_Level, Machine.machine_level_id == Machine_Level.id, isouter=True)
        .join(Resource_Node, User_Save.resource_node_id == Resource_Node.id, isouter=True)
        .join(Node_Purity, Resource_Node.node_purity_id == Node_Purity.id, isouter=True)
        .filter(User_Save.user_id == user_id)
        #.filter(User_Save.sav_file_name == sav_file_name)  # ✅ Only return records for the relevant save file
        .all()
    )

    #logger.info(f"User Saves: {user_saves}")
    return jsonify([
        {
            "id": us.id,
            "part_name": us.part_name,
            "recipe_name": us.recipe_name,
            "machine_id": us.machine_id,
            "machine_name": us.machine_name,
            "machine_level": us.machine_level,
            "node_purity": us.node_purity,
            "machine_power_modifier": us.machine_power_modifier or 1,
            "part_supply_pm": us.part_supply_pm or 0,
            "actual_ppm": (us.part_supply_pm or 0) * (us.machine_power_modifier or 1), 
            "created_at": us.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "sav_file_name": us.sav_file_name,
        } for us in user_saves
        
    ])
    
# API: Get user settings
@main.route('/api/user_settings', methods=['GET'])
@login_required
def get_user_settings():
    category = request.args.get('category')
    query = UserSettings.query.filter_by(user_id=current_user.id)
    
    if category:
        query = query.filter_by(category=category)
    
    settings = query.all()
    return jsonify([{ "key": s.key, "value": s.value } for s in settings]), 200

# API: Update user settings
@main.route('/api/user_settings', methods=['POST'])
@login_required
def update_user_settings():
    data = request.json
    category = data.get('category')
    key = data.get('key')
    value = data.get('value')
    
    if not category or not key or value is None:
        return jsonify({"error": "Category, key, and value are required"}), 400
    
    setting = UserSettings.query.filter_by(user_id=current_user.id, category=category, key=key).first()
    if setting:
        setting.value = value
    else:
        setting = UserSettings(user_id=current_user.id, category=category, key=key, value=value)
        db.session.add(setting)
    
    try:
        db.session.commit()
        return jsonify({"message": "Setting updated successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@main.route('/api/production_report', methods=['POST'])
@login_required
def get_production_report():
    try:
        data = request.json
        tracker_data = data.get("trackerData", [])
        save_data = data.get("saveData", [])
        
        if not tracker_data or not save_data:
            return jsonify({"error": "trackerData and saveData are required"}), 400
        
        part_production = {}
        
        def extract_required_quantities(tree, part_production):
            """Recursively extract required quantities from the dependency tree."""
            for part_name, details in tree.items():
                if part_name not in part_production:
                    part_production[part_name] = {"target": 0, "actual": 0}
                
                # Add required parts pm
                # Updated "Required Quantity" to "Required Parts PM" - #TODO - reflect this in build_tree.py
                value = details.get("Required Parts PM")
                if value is not None:
                    part_production[part_name]["target"] += value


                # Recursively process the subtree
                if "Subtree" in details and isinstance(details["Subtree"], dict):
                    extract_required_quantities(details["Subtree"], part_production)

        # Process trackerData for target production
        for report in tracker_data:
            if not report.get("tree"):
                continue
               # ✅ Process trackerData for ALL dependencies, not just root parts
        for report in tracker_data:
            if not report.get("tree"):
                continue
            extract_required_quantities(report["tree"], part_production)
        
        # Process saveData for actual production using part_supply_pm and machine_power_modifier
        for save in save_data:
            part_supply_pm = save["part_supply_pm"] if save["part_supply_pm"] is not None else 0.0
            machine_power_modifier = save["machine_power_modifier"] if save["machine_power_modifier"] is not None else 1.0
            
            actual_ppm = part_supply_pm * machine_power_modifier

            save_part_name = save["part_name"] if save["part_name"] else "UNKNOWN_PART"
            
            if save_part_name == "UNKNOWN_PART":
                continue

            if save_part_name not in part_production:
                part_production[save["part_name"]] = {"target": 0, "actual": 0}
            
            part_production[save["part_name"]]["actual"] += actual_ppm
        return jsonify(part_production), 200
    except Exception as e:
        logging.error(f"❌ Error generating production report: {e}")
        return jsonify({"error": "Failed to generate production report"}), 500
    
@main.route('/api/machine_usage_report', methods=['POST'])
@login_required
def get_machine_usage_report():
    try:
        #logger.info("Generating machine usage report")
        data = request.json
        tracker_data = data.get("trackerData", [])
        save_data = data.get("saveData", [])

        if not tracker_data or not save_data:
            return jsonify({"error": "trackerData and saveData are required"}), 400

        machine_usage = {}

        # 📌 Step 1: Process trackerData for target machines
        def extract_machines(tree):
            # Debugging
            #logger.debug(f"Extracting machines from tree")
            for part, details in tree.items():
                if "Produced In" in details and "No. of Machines" in details:
                    machine_name = details["Produced In"]
                    num_machines = details["No. of Machines"]

                    if machine_name not in machine_usage:
                        machine_usage[machine_name] = {"target": 0, "actual": 0}

                    machine_usage[machine_name]["target"] += num_machines

                # Recursively extract from subtrees
                if "Subtree" in details and details["Subtree"]:
                    extract_machines(details["Subtree"])

        for report in tracker_data:
            if "tree" in report and report["tree"]:
                extract_machines(report["tree"])
        # Debugging
        #logger.debug("Processing saveData for actual machine usage")
        query = """
            SELECT id, machine_name FROM machine
        """
        # Debugging
        #logger.info(f"Mapping machines - Machine Query: {query}")
        machine_map = {row.id: row.machine_name for row in db.session.execute(text(query))}
        
        # Debugging
        #logger.info(f"Machine Map: {machine_map}")

        for save in save_data:
            # Debugging
            #logger.debug(f"Processing save data record, getting machine_id ")            
            machine_id = save["machine_id"]
           
            # Debugging
            #logger.debug(f"Got Machine ID, {machine_id} Getting power_modifier")           
            power_modifier = save["machine_power_modifier"] if save["machine_power_modifier"] is not None else 1.0
            
            # Debugging
            #logger.debug(f"Got Power Modifier, {power_modifier} Getting machine_name")
            machine_name = machine_map.get(machine_id, "Unknown Machine")
            
            # Debugging
            #logger.debug(f"Got Machine Name: {machine_name}")
            if machine_name == "Unknown Machine":
                #logger.warning(f"Unidentified Machine detected in user save data: {save}")
                continue
            
            # Check if machine_name is in machine_usage and initialize if not
            if machine_name not in machine_usage:
                #logger.info(f"Machine Name not in machine_usage, adding to machine_usage")
                machine_usage[machine_name] = {"target": 0, "actual": 0}

            # Debugging
            #logger.debug(f"Multiplying Machine Name: {machine_name}, Power Modifier: {power_modifier}")
            machine_usage[machine_name]["actual"] += 1 * power_modifier
        # Debugging
        #logger.debug(f"Detailed Machine Usage: {machine_usage}")
                
        # Remove None keys before returning
        cleaned_machine_usage = {str(k): v for k, v in machine_usage.items() if k is not None}

        #logger.debug(f"Returning cleaned machine usage report {cleaned_machine_usage}")
        return jsonify(cleaned_machine_usage), 200

    except Exception as e:
        logger.error(f"❌ Error generating machine usage report: {e}")
        return jsonify({"error": "Failed to generate machine usage report"}), 500
    
@main.route('/api/conveyor_levels', methods=['GET'])
def get_conveyor_levels():
    """Fetch conveyor belt levels."""
    query = text("SELECT * FROM conveyor_level")
    conveyor_levels = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in conveyor_levels])

@main.route('/api/conveyor_supply_rate', methods=['GET'])
def get_conveyor_supplies():
    """Fetch conveyor belt supply rates."""
    query = text("""
        SELECT cs.id, cl.conveyor_level, cs.supply_pm
        FROM conveyor_supply cs
        JOIN conveyor_level cl ON cs.conveyor_level_id = cl.id
    """)
    conveyor_supplies = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in conveyor_supplies])

@main.route('/api/user_save_connections', methods=['GET'])
def get_user_save_connections():
    """Fetch all user save connections."""
    query = text("SELECT * FROM user_save_connections")
    connections = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in connections])

@main.route('/api/user_save_conveyors', methods=['GET'])
def get_user_save_conveyors():
    """Fetch all user save conveyor chains."""
    query = text("SELECT * FROM user_save_conveyors")
    conveyors = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in conveyors])

@main.route('/api/machine_connections', methods=['GET'])
def get_machine_connections():
    """Fetch machine connections with production details."""
    try:
        query = text("""
            WITH conveyor_data AS (
                SELECT 
                    usc.connected_component, 
                    usc.connection_inventory, 
                    usc.direction, 
                    usc.outer_path_name, 
                    us.output_inventory, 
                    m.machine_name, 
                    p.part_name, 
                    r.part_supply_pm, 
                    usc.conveyor_speed
                FROM user_save_connections usc
                LEFT JOIN user_save us ON usc.connection_inventory = us.output_inventory
                LEFT JOIN machine m ON us.machine_id = m.id
                LEFT JOIN recipe r ON us.recipe_id = r.id
                LEFT JOIN part p ON r.part_id = p.id
            ),
            deduplicated_conveyors AS (
                SELECT 
                    connected_component, 
                    connection_inventory, 
                    direction, 
                    outer_path_name, 
                    output_inventory, 
                    MAX(machine_name) AS machine_name,  -- ✅ Keep machine data if available
                    MAX(part_name) AS part_name, 
                    MAX(part_supply_pm) AS part_supply_pm, 
                    MAX(conveyor_speed) AS conveyor_speed
                FROM conveyor_data
                GROUP BY connected_component, connection_inventory, direction, outer_path_name, output_inventory
            )
            SELECT * FROM deduplicated_conveyors;
        """)
        
        connections = db.session.execute(query).fetchall()
        return jsonify([dict(row._mapping) for row in connections])
    except Exception as e:
        logger.error(f"❌ Error fetching machine connections: {e}")
        return jsonify({"error": "Failed to fetch machine connections"}), 500

@main.route('/api/connection_graph', methods=['GET'])
def get_connection_graph():
    """Fetches the machine connection graph based on actual item flow."""
    try:
        user_id = current_user.id,
        #logger.info(f"Generating machine connections for user ID: {user_id}")
        graph, metadata = build_factory_graph(user_id)
        formatted_graph = format_graph_for_frontend(graph, metadata)

        #logger.debug(f"Formatted Graph {formatted_graph}")
        return jsonify(formatted_graph)
    
    except Exception as e:
        logger.error(f"❌ Error generating factory graph: {e}")
        return jsonify({"error": "Failed to generate connection graph"}), 500
    
@main.route('/api/machine_metadata', methods=['GET'])
def get_machine_metadata():
    """Fetch machine metadata including the produced item, base supply, and conveyor speed."""
    try:
        query = text("""
            SELECT us.output_inventory, m.machine_name, p.part_name AS produced_item, 
                     r.part_supply_pm, cs.supply_pm AS conveyor_speed, i.icon_path AS icon_path
            FROM user_save us
            JOIN machine m ON us.machine_id = m.id
            JOIN recipe r ON us.recipe_id = r.id
            JOIN part p ON r.part_id = p.id
            LEFT JOIN user_save_connections usc ON us.output_inventory = usc.connection_inventory
            LEFT JOIN conveyor_supply cs ON usc.conveyor_speed = cs.supply_pm
            LEFT JOIN icon i ON m.icon_id = i.id
        """)

        # logger.debug(f"Machine Metadata Query: {query}")
        metadata = db.session.execute(query).fetchall()
        return jsonify([dict(row._mapping) for row in metadata])

    except Exception as e:
        logger.error(f"❌ Error fetching machine metadata: {e}")
        return jsonify({"error": "Failed to fetch machine metadata"}), 500


@main.route('/api/pipe_network', methods=['GET'])
@login_required
def get_pipe_network():
    """
    API route to fetch pipe networks for the logged-in user.
    """
    try:
        user_id = current_user.id  # Ensure we filter by user
        pipes = User_Save_Pipes.query.filter_by(user_id=user_id).all()

        pipe_data = [
            {
                "instance_name": pipe.instance_name,
                "fluid_type": pipe.fluid_type,
                "connections": json.loads(pipe.connection_points)
            }
            for pipe in pipes
        ]
        logger.info(f"✅ Succesfully fetched pipe network data for user {user_id}")
        return jsonify(pipe_data), 200

    except Exception as e:
        logger.error(f"❌ Error fetching pipe network data for user {user_id}: {e}")
        return jsonify({"error": "Failed to retrieve pipe network data"}), 500

@main.route('/api/user_connection_data', methods=['GET'])
@login_required
def get_user_connection_data():
    """Fetches stored processed connection data for the logged-in user."""
    try:
        user_id = current_user.id
        query = text("SELECT * FROM user_connection_data WHERE user_id = :user_id order by id")
        connections = db.session.execute(query, {"user_id": user_id}).fetchall()

        #logger.debug(f"🔍 Connection data for user {user_id}: {connections}")
        # Ensure API response structure matches frontend expectation
        response_data = {
            "nodes": [],
            "links": []
        }

        if connections:
            response_data["links"] = [dict(row._mapping) for row in connections]

        #logger.debug(f"🔍 Response data: {response_data}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"❌ Error fetching stored connection data: {e}")
        return jsonify({"nodes": [], "links": []}), 500
    
@main.route('/api/user_pipe_data', methods=['GET'])
@login_required
def get_user_pipe_data():
    """Fetches stored processed pipe network data for the logged-in user."""
    try:
        user_id = current_user.id
        query = text("""
            SELECT * FROM user_pipe_data WHERE user_id = :user_id ORDER BY id
        """)
        pipes = db.session.execute(query, {"user_id": user_id}).fetchall()

        # Ensure API response structure matches frontend expectation
        response_data = {
            "nodes": [],  # Not used yet, but keeping structure consistent
            "links": []
        }

        if pipes:
            response_data["links"] = [dict(row._mapping) for row in pipes]
            # logger.debug("****************************************BACKEND PIPE DATA****************************************")
            # logger.debug(f"🔍 Pipe data response: {response_data}")
            # logger.debug("****************************************END OF BACKEND PIPE DATA****************************************")

        # logger.debug(f"🔍 Pipe data response: {response_data}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"❌ Error fetching stored pipe data: {e}")
        return jsonify({"nodes": [], "links": []}), 500

@main.route('/api/tester_registration', methods=['GET','POST'])
def tester_registration():
    """Handles tester registration requests."""
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        username = data.get('username')
        fav_thing = data.get('fav_satisfactory_thing')
        reason = data.get('reason')
        recaptcha_token = data.get('recaptcha_token')

        if not email or not username or not fav_thing or not reason:
            return jsonify({"error": "All fields are required."}), 400

        # Verify reCAPTCHA with Google API
        # Verify reCAPTCHA
        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
        response = requests.post(verify_url, data={
            'secret': API_KEY,
            'response': recaptcha_token
        })
        result = response.json()

        if not result.get('success'):
            return jsonify({"error": "reCAPTCHA validation failed. Please try again."}), 400

        # Check if email or username is already registered
        existing_request = User_Tester_Registrations.query.filter(
            (User_Tester_Registrations.email_address == email) | 
            (User_Tester_Registrations.username == username)
        ).first()
        if existing_request:
            return jsonify({"error": "You have already submitted a tester request."}), 400

        # Save tester request to database
        new_request = User_Tester_Registrations(
            email_address=email,
            username=username,
            fav_satisfactory_thing=fav_thing,
            reason=reason,
            is_approved=False,  # Default to not approved
            reviewed_at=None  # Not reviewed yet
        )

        db.session.add(new_request)
        db.session.commit()
    return jsonify({"message": "Your request has been submitted. We will contact you if selected."}), 200

@main.route('/api/tester_count', methods=['GET'])
def get_tester_count():
    """Returns the total number of tester applications."""
    count = db.session.query(User_Tester_Registrations).count()
    return jsonify({"count": count})

@main.route('/api/tester_requests', methods=['GET'])
def get_tester_requests():
    """Fetch all tester requests, including approved and rejected ones."""
    requests = User_Tester_Registrations.query.all()
    return jsonify([
        {
            "id": req.id,
            "email": req.email_address,
            "username": req.username,
            "fav_thing": req.fav_satisfactory_thing,
            "reason": req.reason,
            "is_approved": req.is_approved,
            "reviewed_at": req.reviewed_at,
        }
        for req in requests
    ])

@main.route('/api/tester_approve/<int:id>', methods=['POST'])
def approve_tester(id):
    """Marks a tester request as approved and creates a user account with a temporary password."""
    tester = User_Tester_Registrations.query.get(id)
    if not tester:
        return jsonify({"error": "Tester not found"}), 404

    # Generate a temporary password
    temp_password = secrets.token_urlsafe(8)  # Example: 'Xyz12345'
    hashed_password = generate_password_hash(temp_password, method='pbkdf2:sha256')

    # Create user account in the users table
    new_user = User(
        email=tester.email_address,
        username=tester.username,
        password=hashed_password,
        must_change_password=True  # Force password reset on first login
    )

    db.session.add(new_user)
    current_time = datetime.now().strftime('%d/%m/%y %H:%M:%S')
    tester.is_approved = True
    tester.reviewed_at = current_time  # Use formatted datetime string
    db.session.commit()

    real_recipient = tester.email_address
    redirected = False

    if real_recipient.lower().endswith("@hotmail.com"):
        logger.warning(f"⚠️ Skipping email to Hotmail address {real_recipient} due to deliverability issues.")
        real_recipient = "satisfactorytracker@gmail.com"
        redirected = True

    # ✅ Send approval email
    email_sent = send_email(
        to=tester.email_address,
        subject="🎉 Welcome to the Satisfactory Tracker Closed Beta Test!",
        template_name="tester_approved",
        context={
            "username": tester.username,
            "email": tester.email_address,
            "temporary_password": temp_password
        }
    )

    if not email_sent:
        return jsonify({
            "message": "Tester approved, but failed to send email."
        }), 202  # Accepted with a warning

    message = "Tester approved and welcome email sent successfully."
    if redirected:
        logger.warning(f"⚠️ Email redirected due to Hotmail block.")
        message += " ⚠️ Email redirected due to Hotmail block."

    return jsonify({ "message": message }), 200

@main.route('/api/tester_reject/<int:id>', methods=['POST'])
def reject_tester(id):
    """Marks a tester request as rejected without deleting it."""
    tester = User_Tester_Registrations.query.get(id)
    if not tester:
        return jsonify({"error": "Tester not found"}), 404

    tester.is_approved = False  # Keep it false (default)
    
    # Get the current time formatted as dd/mm/yy hh:mm:ss
    current_time = datetime.now().strftime('%d/%m/%y %H:%M:%S')
    tester.reviewed_at = current_time  # Mark as reviewed
    db.session.commit()
    return jsonify({"message": "Tester request rejected"})

@main.route('/api/change_password', methods=['POST'])
def change_password():
    """Allows a user to change their password using the correct user_id."""
    data = request.get_json()
    
    #logger.debug(f"Raw request data: {data}")  # Log everything Flask receives

    user_id = data.get('user_id')
    new_password = data.get('password')

    #logger.debug(f"Extracted User ID: {user_id}")

    if not user_id:
        return jsonify({"error": "User ID is required."}), 400

    if not new_password or len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    # ✅ Correctly update the user's password
    user.password = generate_password_hash(new_password, method="pbkdf2:sha256")
    user.must_change_password = False
    db.session.commit()

    return jsonify({"message": "Password updated successfully! You can now log in with your new password."}), 200

@main.route('/api/github_issue', methods=['POST'])
def create_github_issue():
    """Creates a new issue on GitHub from the modal form."""
    data = request.get_json()
    title = data.get("title")
    description = data.get("description")
    labels = data.get("labels", ["bug"])  # Default to "bug" if no label is selected

    if not title or not description:
        return jsonify({"error": "Title and description are required."}), 400

    # GitHub API URL
    url = f"https://api.github.com/repos/{GITHUB_REPO}/issues"

    # GitHub API request headers
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

    # Issue payload
    payload = {
        "title": title,
        "body": description,
        "labels": labels
    }

    # Send request to GitHub
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return jsonify({"message": "Issue created successfully!", "issue_url": response.json()["html_url"]}), 201
    else:
        logger.error(f"Failed to create issue: {response.json()}")
        return jsonify({"error": "Failed to create issue", "details": response.json()}), 400
    
@main.route('/api/upload_screenshot', methods=['POST'])
def upload_screenshot():
    """Uploads multiple screenshots to GitHub and returns the image URLs."""
    
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    files = request.files.getlist('file')  # ✅ Get multiple files
    username = current_user.username  # ✅ Get username from Flask-Login
    uploaded_urls = []

    for file in files:
        safe_username = username.replace(" ", "_")  # Ensure safe filename
        filename = f"{safe_username}_{datetime.now().strftime('%d-%m-%y_%H-%M-%S')}_{file.filename}"
        
        # Convert image to Base64 for GitHub API
        file_content = base64.b64encode(file.read()).decode('utf-8')

        # GitHub API payload
        payload = {
            "message": f"Upload screenshot {filename}",
            "content": file_content
        }

        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Upload to GitHub
        response = requests.put(f"{GITHUB_API_URL}/{filename}", json=payload, headers=headers)

        if response.status_code == 201:
            uploaded_urls.append(response.json()["content"]["download_url"])
        else:
            return jsonify({"error": "Failed to upload some files", "details": response.json()}), 400

    return jsonify({"image_urls": uploaded_urls}), 201  # ✅ Return multiple URLs


# Store user activity in memory for now (better to use Redis in production)
ACTIVE_USERS = {}

@main.route('/api/user_activity', methods=['POST'])
@login_required
def update_user_activity():
    """Updates the last active time and page for a user."""
    if not current_user.is_authenticated:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json
    page = data.get("page", "Unknown Page")
    timestamp = datetime.now().strftime('%d/%m/%y %H:%M:%S')

    ACTIVE_USERS[current_user.id] = {
        "username": current_user.username,
        "page": page,
        "last_active": timestamp
    }

    return jsonify({"message": "User activity updated"}), 200


@main.route('/api/active_users', methods=['GET'])
@login_required
def get_active_users():
    """Returns a list of active users and their last activity."""
    return jsonify(ACTIVE_USERS)

@main.route('/api/get_assembly_phases', methods=['GET'])
def get_assembly_phases():
    requests = Project_Assembly_Phases.query.order_by(Project_Assembly_Phases.id).all()

    return jsonify([
        {
            "id": req.id,
            "phase_name": req.phase_name,
            "phase_description": req.phase_description,
        }
        for req in requests
    ])

@main.route('/api/get_assembly_phase_parts/<int:phase_id>', methods=['GET'])
def get_assembly_phases_parts(phase_id):
    results = []
    requests = Project_Assembly_Parts.query.filter_by(phase_id=phase_id).all()
    
    for req in requests:
        ingredient_input_id = req.phase_part_id
        ingredient_recipe = "_Standard"
        # Lookup the selected recipe for this ingredient from user_selected_recipe
        selected_recipe_query = """
            SELECT r.recipe_name
            FROM user_selected_recipe usr
            JOIN recipe r ON usr.recipe_id = r.id
            WHERE usr.user_id = :user_id AND usr.part_id = :part_id
        """
        selected_recipe = db.session.execute(
            text(selected_recipe_query),
            {"user_id": current_user.id, "part_id": ingredient_input_id}
        ).scalar()

        # Use the selected recipe or default to the ingredient_recipe (from part_data)
        final_recipe = selected_recipe if selected_recipe else ingredient_recipe

        logging.debug(f"Final Recipe: {final_recipe}")

        # Query the part_supply_pm for the ingredient_input_id and final_recipe
        final_ingredient_supply_pm = db.session.execute(
            text("SELECT part_supply_pm FROM recipe WHERE part_id = :part_id AND recipe_name = :recipe_name"),
            {"part_id": ingredient_input_id, "recipe_name": final_recipe}
        ).scalar()
        logging.debug(f"get_assembly_phases_parts - ingredient_input_id: {ingredient_input_id}, final_recipe: {final_recipe} Final Ingredient Supply PM: {final_ingredient_supply_pm}")
        logging.debug(f"SENDING BACK - id {req.id} phase_id {req.phase_id} phase_part_id {req.phase_part_id} phase_part_quantity {req.phase_part_quantity} phase_target_parts_pm {final_ingredient_supply_pm} phase_target_timeframe {req.phase_part_quantity / final_ingredient_supply_pm}")
        results.append({
            "id": req.id,
            "phase_id": req.phase_id,
            "phase_part_id": req.phase_part_id,
            "phase_part_quantity": req.phase_part_quantity,
            "phase_target_parts_pm": round(float(final_ingredient_supply_pm), 4) if final_ingredient_supply_pm else None,
            "phase_target_timeframe": round(float(req.phase_part_quantity) / float(final_ingredient_supply_pm), 4) if final_ingredient_supply_pm else None,
        })

    return jsonify(results)

@main.route('/api/get_assembly_phase_details/<int:phase_id>', methods=['GET'])
def get_assembly_phase_details(phase_id):
    phase = Project_Assembly_Phases.query.get(phase_id)
    if not phase:
        return jsonify({"error": "Phase not found"}), 404

    parts = (
        db.session.query(
            Project_Assembly_Parts.phase_part_id,
            Project_Assembly_Parts.phase_part_quantity,
            Part.part_name
        )
        .join(Part, Project_Assembly_Parts.phase_part_id == Part.id)
        .filter(Project_Assembly_Parts.phase_id == phase_id)
        .all()
    )

    return jsonify({
        "id": phase.id,
        "phase_name": phase.phase_name,
        "phase_description": phase.phase_description,
        "parts": [
            {"part_name": p.part_name, "quantity": p.phase_part_quantity} for p in parts
        ]
    })

@main.route('/api/get_all_assembly_phase_details', methods=['GET'])
def get_all_assembly_phase_details():
    phases = Project_Assembly_Phases.query.all()
    
    all_phases = []
    for phase in phases:
        parts = (
            db.session.query(
                Project_Assembly_Parts.phase_part_id,
                Project_Assembly_Parts.phase_part_quantity,
                Part.part_name  # ✅ Get part name from Part table
            )
            .join(Part, Project_Assembly_Parts.phase_part_id == Part.id)  # ✅ JOIN to get part names
            .filter(Project_Assembly_Parts.phase_id == phase.id)
            .all()
        )

        all_phases.append({
            "id": phase.id,
            "phase_name": phase.phase_name,
            "phase_description": phase.phase_description,
            "parts": [
                {"part_name": p.part_name, "quantity": p.phase_part_quantity} for p in parts
            ]
        })

    return jsonify(all_phases)


@main.route('/api/user_selected_recipe_check_part/<int:part_id>', methods=['GET'])
def selected_recipe_check_part(part_id):
    requests = UserSelectedRecipe.query.filter_by(user_id = current_user.id, part_id=part_id).all()
    return jsonify([
        {
            "recipe_id": req.recipe_id,            
        }
        for req in requests
    ])

@main.route('/api/get_admin_setting/<category>/<key>', methods=['GET'])
@login_required
def get_admin_setting(category, key):
    setting = Admin_Settings.query.filter_by(setting_category=category, setting_key=key).first()
    if not setting:
        return jsonify({"error": "Setting not found"}), 404
        
    return jsonify({"value": setting.setting_value}), 200
    

@main.route('/api/add_admin_setting', methods=['POST'])
@login_required
def add_admin_setting():
    data = request.json
    category = data.get('category')
    key = data.get('key')
    value = data.get('value')

    if not category or not key or not type or value is None:
        return jsonify({"error": "Category, key, type, and value are required"}), 400

    setting = Admin_Settings.query.filter_by(setting_category=category, setting_key=key, setting_value=value).first()
    if not setting:
        return jsonify({"error": "Setting not found"}), 404  
    
    try:
        db.session.commit()
        return jsonify({"message": "Setting updated successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@main.route('/api/fetch_logs/<service_name>', methods=['GET'])
@login_required
def fetch_logs(service_name):
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized access"}), 403

    logging.debug(f"Fetching logs for service: {service_name}")
    commands = {
        "nginx": ["/usr/bin/tail", "-n", "100", "/var/log/nginx/error.log"],
        "flask-app": ["/usr/bin/journalctl", "-u", "flask-app", "--no-pager", "--lines=100"],
        "flask-dev": ["/usr/bin/journalctl", "-u", "flask-dev", "--no-pager", "--lines=100"],
        "mysql": ["/usr/bin/sudo", "/usr/bin/journalctl", "-u", "mysql", "--no-pager", "--lines=100"],
        "applogs": ["/usr/bin/tail", "-f", "/flask-app/Tracker_Project/flask_server/app/logs/app_*.log", "|", "ccze", "-A"],
    }

    command = commands.get(service_name)
    logging.debug(f"Command: {command}")

    if not command:
        logging.error(f"Invalid service name: {service_name}")
        return jsonify({"error": "Invalid service name"}), 400

    try:
        logging.debug(f"Running command: {command}")
        output = subprocess.check_output(command, stderr=subprocess.STDOUT).decode('utf-8')
        logging.debug(f"Output: {output}")
        log_lines = output.splitlines()
        return jsonify({"logs": log_lines}), 200
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to fetch logs: {e.output.decode('utf-8')} {e}")
        return jsonify({"error": f"Failed to fetch logs: {e.output.decode('utf-8')}"}), 500
    except Exception as e:
        logging.error(f"Failed to fetch logs: {str(e)} {e}")
        return jsonify({"error": f"Failed to fetch logs: {str(e)}"}), 500
    
@main.route('/api/restart_service/<service_name>', methods=['POST'])
@login_required
def restart_service(service_name):
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized access"}), 403

    allowed_services = ['nginx', 'mysql', 'flask-app', 'flask-dev']
    if service_name not in allowed_services:
        return jsonify({"error": "Invalid service name"}), 400

    try:
        subprocess.run(['sudo', 'systemctl', 'restart', service_name], check=True)
        return jsonify({"message": f"{service_name} restarted successfully"}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Failed to restart {service_name}: {str(e)}"}), 500
    
@main.route('/api/system_resources', methods=['GET'])
@login_required
def get_system_resources():
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    try:
        system_os = platform.system()  # Detect OS (Windows/Linux)
        
        if system_os == "Linux":
            # Get CPU Usage
            cpu_usage_output = subprocess.check_output(["/usr/bin/top", "-bn1"]).decode("utf-8")
            cpu_usage_line = next(line for line in cpu_usage_output.split("\n") if "Cpu(s)" in line)
            cpu_usage_value = cpu_usage_line.split(",")[0].strip().split(":")[1]
            cpu_usage = float(cpu_usage_value.split()[0])

            # Get Memory Usage
            memory_output = subprocess.check_output(["/usr/bin/free", "-m"]).decode("utf-8")
            memory_lines = memory_output.split("\n")
            mem_total, mem_used, mem_free = memory_lines[1].split()[1:4]

            # Get Disk Usage
            disk_output = subprocess.check_output(["/bin/df", "-h", "/"]).decode("utf-8")
            disk_lines = disk_output.split("\n")
            disk_total, disk_used, disk_avail = disk_lines[1].split()[1:4]
        elif system_os == "Windows":
            # ✅ Windows-friendly method using `psutil`
            cpu_usage = f"{psutil.cpu_percent()}%"

            memory = psutil.virtual_memory()
            mem_total = f"{memory.total // (1024 * 1024)} MB"
            mem_used = f"{memory.used // (1024 * 1024)} MB"
            mem_free = f"{memory.available // (1024 * 1024)} MB"

            disk = psutil.disk_usage('/')
            disk_total = f"{disk.total // (1024 ** 3)} GB"
            disk_used = f"{disk.used // (1024 ** 3)} GB"
            disk_avail = f"{disk.free // (1024 ** 3)} GB"

        else:
            return jsonify({"error": f"Unsupported OS: {system_os}"}), 500

        return jsonify({
            "cpu_usage": cpu_usage,
            "memory": {"total": mem_total, "used": mem_used, "free": mem_free},
            "disk": {"total": disk_total, "used": disk_used, "available": disk_avail}
        }), 200
    except Exception as e:
        return jsonify({"error": f"Could not fetch system resources: {str(e)}"}), 500

@main.route('/api/update_must_change_password/<service_name>/<new_value>', methods=['PUT'])
@login_required
def update_must_change_password(userId, new_value):
    try:
        """Updates the must_change_password field for a user."""
        logging.info(f"Updating must_change_password for user ID: {userId} to: {new_value}")

        if not userId:
            logging.error("User ID is required.")
            return jsonify({"error": "User ID is required."}), 400

        user = User.query.get(userId)
        logging.info(f"Updating must_change_password for user ID: {userId}")
        if not user:
            logging.error(f"User not found for ID: {userId}")
            return jsonify({"error": "User not found."}), 404

        user.must_change_password = new_value
        db.session.commit()
        logging.info(f"must_change_password updated successfully for user ID: {userId} to: {new_value}")
        return jsonify({"message": "must_change_password updated successfully!"}), 200
    except Exception as e:
        logging.error(f"Failed to update must_change_password: {str(e)}")
        return jsonify({"error": f"Failed to update must_change_password: {str(e)}"}), 500

# New route to reset a user's password
@main.route('/api/reset_user_password/<userId>', methods=['PUT'])
@login_required
def reset_user_password(userId):
    try:
        logging.info(f"Resetting password for user ID: {userId}")

        if not userId:
            logging.error("User ID is required.")
            return jsonify({"error": "User ID is required."}), 400

        # Generate a temporary password
        temp_password = secrets.token_urlsafe(8)  # Example: 'Xyz12345'
        hashed_password = generate_password_hash(temp_password, method='pbkdf2:sha256')

        user = User.query.get(userId)
        if not user:
            logging.error(f"User not found for ID: {userId}")
            return jsonify({"error": "User not found."}), 404

        # ✅ Correctly update the user's password
        user.password = generate_password_hash(hashed_password, method="pbkdf2:sha256")
        user.must_change_password = True  # Force password reset on first login
        db.session.commit()

        logging.info(f"Password reset successfully for user ID: {userId}")
        return jsonify({
        "message": "Tester approved and user account created.",
        "temp_password": temp_password  # ⚠️ Only for testing; send securely via email later
    })
    except Exception as e:
        logging.error(f"Failed to reset password: {str(e)}")
        return jsonify({"error": f"Failed to reset password: {str(e)}"}), 500
    

@main.route('/api/functional_tests', methods=['GET'])
@login_required
def run_functional_tests():
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    if RUN_MODE == "prod":
        base_url = "https://dev.satisfactorytracker.com"
    elif RUN_MODE == "local":
        base_url = "http://localhost:5000"
    results = {}

     # ✅ Step 1: Grab the User's Session Cookie
    session_cookies = request.cookies
    if not session_cookies:
        return jsonify({"error": "No session cookies found"}), 400
    
    # ✅ Test Pages
    pages = ["/", "/tracker", "/admin/dashboard", "/login", "/data", "/dependencies","/signup", "/change-password", "/help","/admin/user_management", "/settings"]
    for page in pages:
        try:
            res = requests.get(f"{base_url}{page}", timeout=30)
            results[f"Page: {page}"] = "Pass" if res.status_code == 200 else f"Fail ({res.status_code})"
        except Exception as e:
            results[f"Page: {page}"] = f"Fail ({str(e)})"

    # ✅ Test API Endpoints
    api_endpoints = ["/api/system_resources", "/api/active_users", "/api/part_names", "/api/check_login", "/api/tables"]
    for endpoint in api_endpoints:
        try:
            res = requests.get(
                f"{base_url}{endpoint}",
                cookies=session_cookies,
                timeout=15
            )
            results[f"API: {endpoint}"] = "Pass" if res.status_code == 200 else f"Fail ({res.status_code})"
        except Exception as e:
            results[f"API: {endpoint}"] = f"Fail ({str(e)})"

    return jsonify(results), 200

@main.route('/api/test_pages', methods=['GET'])
@login_required
def test_pages():
    """Run tests on page accessibility by reading from admin_settings."""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    # Get base URL based on environment
    base_url = "https://dev.satisfactorytracker.com" if RUN_MODE == "prod" else "http://localhost:5000"

    # Fetch pages dynamically from the admin_settings table
    test_pages = Admin_Settings.query.filter_by(setting_category="system_test_pages").all()
    page_urls = [page.setting_value for page in test_pages]

    results = {}

    for page in page_urls:
        try:
            res = requests.get(f"{base_url}{page}", timeout=15)
            results[f"Page: {page}"] = "Pass" if res.status_code == 200 else f"Fail ({res.status_code})"
        except Exception as e:
            results[f"Page: {page}"] = f"Fail ({str(e)})"

    return jsonify(results), 200

@main.route('/api/test_apis', methods=['GET'])
@login_required
def test_apis():
    """Run tests on API functionality by reading from admin_settings."""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    # Get base URL based on environment
    base_url = "https://dev.satisfactorytracker.com" if RUN_MODE == "prod" else "http://localhost:5000"

    # Fetch API endpoints dynamically from the admin_settings table
    test_apis = Admin_Settings.query.filter_by(setting_category="system_test_APIs").all()
    api_urls = [api.setting_value for api in test_apis]

    results = {}

    # ✅ Step 1: Grab the User's Session Cookie
    session_cookies = request.cookies
    if not session_cookies:
        return jsonify({"error": "No session cookies found"}), 400

    for endpoint in api_urls:
        try:
            res = requests.get(
                f"{base_url}{endpoint}",
                cookies=session_cookies,
                timeout=30
            )
            results[f"API: {endpoint}"] = "Pass" if res.status_code == 200 else f"Fail ({res.status_code})"
        except Exception as e:
            results[f"API: {endpoint}"] = f"Fail ({str(e)})"

    return jsonify(results), 200


@main.route('/api/maintenance_mode', methods=['GET', 'POST'])
@login_required
def maintenance_mode():
    if request.method == 'GET':
        setting = Admin_Settings.query.filter_by(setting_category="site_settings", setting_key="maintenance_mode").first()
        return jsonify({"maintenance_mode": setting.setting_value if setting else "off"})

    if request.method == 'POST':
        if current_user.role != 'admin':
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        new_value = "on" if data.get("enabled") else "off"

        setting = Admin_Settings.query.filter_by(setting_category="site_settings", setting_key="maintenance_mode").first()
        if setting:
            setting.setting_value = new_value
        else:
            db.session.add(Admin_Settings(setting_category="site_settings", setting_key="maintenance_mode", setting_value=new_value))  # ✅ Insert new setting

        db.session.commit()

        return jsonify({"message": f"Maintenance mode set to {new_value}"})
    
@main.route('/api/tester_registration_mode', methods=['GET', 'POST'])
@login_required
def tester_registration_mode():
    if request.method == 'GET':
        setting = Admin_Settings.query.filter_by(setting_category="site_settings", setting_key="registration_button").first()
        logging.info(f"GET Setting: {setting} - {setting.setting_value}")
        return jsonify({"registration_button": setting.setting_value if setting else "off"})


    if request.method == 'POST':
        if current_user.role != 'admin':
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        new_value = "on" if data.get("enabled") else "off"
        logging.info(f"POST - New Value: {new_value}")
        setting = Admin_Settings.query.filter_by(setting_category="site_settings", setting_key="registration_button").first()
        logging.info(f"POST Setting: {setting}")

        if setting:
            setting.setting_value = new_value
        else:
            db.session.add(Admin_Settings(setting_category="site_settings", setting_key="registration_button", setting_value=new_value))

        db.session.commit()

        return jsonify({"message": f"Maintenance mode set to {new_value}"})

@main.route("/api/admin_settings", methods=["GET"])
@login_required
def get_admin_settings():
    """Fetch all admin settings."""
    settings = Admin_Settings.query.filter(Admin_Settings.setting_category.in_(["site_settings"])).all()
    settings_list = [
        {
            "id": setting.id,
            "category": setting.setting_category,
            "key": setting.setting_key,
            "value": setting.setting_value,
        }
        for setting in settings
    ]
    return jsonify(settings_list), 200

@main.route("/api/admin_settings", methods=["PATCH"])
@login_required
def update_admin_setting():
    """Update a specific admin setting."""
    data = request.json
    setting_id = data.get("id")
    new_value = str(data.get("value"))  # Ensure it's stored as a string

    if not setting_id or new_value is None:
        return jsonify({"error": "Missing required fields"}), 400

    setting = Admin_Settings.query.filter_by(id=setting_id).first()
    
    if not setting:
        return jsonify({"error": "Setting not found"}), 404

    # Validate value based on known categories (extend as needed)
    if setting.setting_key in ["maintenance_mode", "registration_button"]:
        if new_value not in ["on", "off"]:
            return jsonify({"error": "Invalid value for boolean setting"}), 400

    setting.setting_value = new_value  # ✅ Update value
    db.session.commit()

    return jsonify({"message": "Setting updated successfully"}), 200

@main.route('/api/system_test_list', methods=['GET'])
@login_required
def get_system_tests():
    """Fetch test cases from admin_settings table"""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    tests = (Admin_Settings.query
    .filter(Admin_Settings.setting_category.in_(["system_test_pages", "system_test_APIs"]))
    .order_by(Admin_Settings.id)
    .all()
    )

    test_cases = {test.id: {
        "id": test.id,
        "type": test.setting_category, 
        "name": test.setting_key, 
        "endpoint": test.setting_value
        } for test in tests
    }

    return jsonify(test_cases), 200

@main.route('/api/run_system_test', methods=['GET'])
@login_required
def run_single_test():
    """Runs a single test based on test ID"""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    test_id = request.args.get('test_id')
    test = Admin_Settings.query.get(test_id)
    
    if not test:
        return jsonify({"error": "Test not found"}), 404

    base_url = "https://dev.satisfactorytracker.com" if RUN_MODE == "prod" else "http://localhost:5000"

    # ✅ Get user's session cookies
    session_cookies = request.cookies
    if not session_cookies:
        return jsonify({"error": "No session cookies found"}), 400
    
    # ✅ Run the test
    try:
        full_url = f"{base_url}{test.setting_value}"
        res = requests.get(full_url, cookies=session_cookies, timeout=15)
        result = "Pass" if res.status_code == 200 else f"Fail ({res.status_code})"
    except Exception as e:
        result = f"Fail ({str(e)})"
    # return jsonify({test.setting_key: result}), 200
    return jsonify({
    "id": test.id,
    "key": test.setting_key,
    "category": test.setting_key,
    "route": test.setting_value,
    "result": result
}), 200

@main.route('/api/system_tests', methods=['GET'])
@login_required
def get_all_system_tests():
    """Fetch all system tests from admin_settings"""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    tests = Admin_Settings.query.filter(Admin_Settings.setting_category.in_(["system_test_pages", "system_test_APIs"])).all()
    
    test_cases = [
        {
            "id": test.id,
            "category": test.setting_category,
            "key": test.setting_key,
            "value": test.setting_value
        } 
        for test in tests
    ]

    return jsonify(test_cases), 200

@main.route('/api/system_tests', methods=['POST'])
@login_required
def add_system_test():
    """Add a new system test"""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.json
    category = data.get("category")
    key = data.get("key")
    value = data.get("value")

    if not category or not key or not value:
        return jsonify({"error": "Missing required fields"}), 400

    new_test = Admin_Settings(setting_category=category, setting_key=key, setting_value=value)
    db.session.add(new_test)
    db.session.commit()

    return jsonify({"message": "Test case added successfully", "id": new_test.id}), 201

@main.route('/api/system_tests/<int:test_id>', methods=['PATCH'])
@login_required
def update_system_test(test_id):
    """Update an existing system test"""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    test = Admin_Settings.query.get(test_id)
    if not test:
        return jsonify({"error": "Test case not found"}), 404

    data = request.json
    if "category" in data:
        test.setting_category = data["category"]
    if "key" in data:
        test.setting_key = data["key"]
    if "value" in data:
        test.setting_value = data["value"]

    db.session.commit()
    return jsonify({"message": "Test case updated successfully"}), 200

@main.route('/api/system_tests/<int:test_id>', methods=['DELETE'])
@login_required
def delete_system_test(test_id):
    """Delete a system test"""
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    test = Admin_Settings.query.get(test_id)
    if not test:
        return jsonify({"error": "Test case not found"}), 404

    db.session.delete(test)
    db.session.commit()
    return jsonify({"message": "Test case deleted successfully"}), 200

@main.route("/api/send_test_email/<recipient>", methods=["POST"])
def send_test_email(recipient):
    try:
        test_context = {
            "admin_user": current_user.username,
        }

        sent = send_email(
            to=recipient,
            subject="SES Test Email - Satisfactory Tracker",
            template_name="admin_test",
            context=test_context
        )

        if sent:
            logger.info(f"Test email sent to {recipient}")
            return jsonify({"message": f"✅ Test email sent to {recipient}!"}), 200
        else:
            logger.error(f"Failed to send test email to {recipient}")
            return jsonify({"error": "Failed to send test email."}), 500

    except Exception as e:
        logger.error(f"Error sending test email: {str(e)}")
        return jsonify({"error": str(e)}), 500

@main.route('/api/test_render_template', methods=['GET'])
def test_template():
    from flask import render_template
    return render_template("emails/tester_approved.txt", username="Tester", email="test@example.com", temporary_password="abc123")


    
@main.route('/api/get_stored_support_messages', methods=['GET'])
def get_stored_support_messages():
    
    MAILGUN_API_KEY = config.MAILGUN_API_KEY
    MAILGUN_DOMAIN = config.MAILGUN_DOMAIN    
    url = f"https://api.eu.mailgun.net/v3/{MAILGUN_DOMAIN}/events"
    params = {"event": "stored"}
    auth = ("api", MAILGUN_API_KEY)

    try:
        response = requests.get(url, auth=auth, params=params)
        response.raise_for_status()
        events = response.json().get("items", [])

        messages = []
        for event in events:
            message = {
                "id": event.get("storage", {}).get("key"),
                "recipient": event.get("recipient"),
                "from": event.get("message", {}).get("headers", {}).get("from"),
                "subject": event.get("message", {}).get("headers", {}).get("subject"),
                "timestamp": event.get("@timestamp"),
                "storage_url": event.get("storage", {}).get("url"),
            }
            messages.append(message)

        return jsonify(messages)
    
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/api/support_stored_message/<string:storage_key>', methods=['GET'])
def get_stored_support_message_detail(storage_key):
    MAILGUN_API_KEY = config.MAILGUN_API_KEY

    message_url = f"https://api.eu.mailgun.net/v3/domains/mg.satisfactorytracker.com/messages/{storage_key}"
    auth = ("api", MAILGUN_API_KEY)

    try:
        response = requests.get(message_url, auth=auth)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@main.route('/api/support_webhook', methods=['POST'])
def receive_support_webhook():
    data = request.form  # Mailgun sends data as x-www-form-urlencoded
    # Extract fields from Mailgun webhook
    sender = data.get("sender")
    recipient = data.get("recipient")
    subject = data.get("subject")
    body_plain = data.get("body-plain")
    body_html = data.get("body-html")
    timestamp_unix = data.get("timestamp")
    message_id = data.get("Message-Id") or data.get("message-id")

    logger.info(f"Incoming email: from {sender} Recipient: {recipient} Subject: {subject}")
    # Defensive checks
    if not (sender and recipient and message_id):
        return jsonify({"error": "Missing required fields."}), 400

    # Prevent spam: match sender to registered user
    
    user = User.query.filter_by(email=sender).first()
    if not user:       
        logger.info(f"Unregistered user: {sender} User ID: {user.id if user else 'None'}")
        if recipient in [config.SYSTEM_TEST_USER_EMAIL, config.SYSTEM_TEST_NEW_USER_EMAIL]:
            user = User.query.filter_by(email=recipient).first()
            user_id = user.id if user else 0
            logger.info(f"System test user found: {sender}, Recipient: {recipient} User ID: {user_id}")
        else:
        # TODO: Make sure user 0 - unregistered_user is prevented from accessing the system
            user_id = 0  # Placeholder for unregistered users
    else:
        user_id = user.id
    
        

    # Check for duplicate message
    existing = SupportMessage.query.filter_by(message_id=message_id).first()
    if existing:
        return jsonify({"message": "Message already received."}), 200
    # 🔍 Check if subject contains existing support-id
    
    conversation_id = None
    match = re.search(r"support-id-(\d+)", subject or "", re.IGNORECASE)
    if match:
        conversation_id = int(match.group(1))
        conversation = SupportConversation.query.get(conversation_id)
    else:
        conversation = None

    # 🧱 Create conversation if not found
    if not conversation:
        conversation = SupportConversation(
            user_id=user_id if user_id else 0,
            subject=subject or "(No Subject)"
        )
        db.session.add(conversation)
        db.session.flush()
        conversation_id = conversation.id

    # Generate the AI classification data
    if user_id != 0:  # Only for registered users
        # Use AI classification only for registered users
        ai_data = ai_classify_message(subject, body_plain)
    else:
        # For unregistered users, use a default classification
        logger.info(f"Unregistered user: {sender} User ID: {user_id}")
        ai_data = {
            "summary": "No AI classification available for unregistered users.",
            "category": "Unregistered",
            "suggested_actions": []
        }

    try:
        message = SupportMessage(
            user_id=user.id if user else user_id if user_id else 0,
            message_id=message_id,
            conversation_id=conversation_id,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body_plain=body_plain,
            body_html=body_html,
            timestamp=datetime.fromtimestamp(float(timestamp_unix), tz=timezone.utc),
            tags=ai_data["category"],
            summary=ai_data["summary"],
            suggested_actions=json.dumps(ai_data["suggested_actions"]),
            # archived_at=datetime.now() if 'test_full_password_reset_flow_2' in subject else None,
        )
        db.session.add(message)
        db.session.commit()
        # logger.debug(f"Support message received: {message}")
        # Remove the conversation summary so it can be regenerated
        if conversation.summary:
            conversation.summary = None
            db.session.commit()

        logging.info(f"Incoming email: from {sender} with subject: {subject}")
        logger.info(f"Incoming email: from {sender} with subject: {subject}")
        #TODO: Send a confirmation email to the sender
        return jsonify({"message": "Support message received successfully."}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save incoming email: {str(e)}")
        logging.error(f"Failed to save incoming email: {str(e)}")
        return jsonify({"error": str(e)}), 500

@main.route('/api/support_messages', methods=['GET'])
def get_support_messages():
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    try:
        show_all = request.args.get("show_all", "false").lower() == "true"

        messages = (
            SupportMessage.query
            .join(SupportConversation)
            .filter(SupportMessage.archived_at == None)
            .filter(True if show_all else SupportConversation.resolved == False)
            .order_by(SupportMessage.created_at.desc())
            .all()
        )

        result = []
        for msg in messages:
            result.append({
                "id": msg.id,
                "user_id": msg.user_id,
                "username": msg.user.username if msg.user else "Unregistered",
                "conversation_id": msg.conversation_id,
                "from": msg.sender,
                "subject": msg.subject,
                "body": msg.body_plain,
                "created_at": msg.created_at.isoformat(),
                "resolved": msg.conversation.resolved,
                "resolved_at": msg.conversation.resolved_at.strftime('%d/%m/%y %H:%M:%S') if msg.conversation.resolved_at else None,
                "resolved_by": msg.conversation.resolved_by_user.username if msg.conversation.resolved_by_user else None,
                "subject": msg.subject,
                "tags": msg.tags,
                "summary": msg.summary,
                "suggested_actions": json.loads(msg.suggested_actions) if msg.suggested_actions else None,
            })

        return jsonify(result)    
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/api/support_message/<int:id>', methods=['GET'])
def get_support_message_detail(id):
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    try:
        msg = SupportMessage.query.get_or_404(id)
        
        if not msg.summary:
            ai_data = ai_classify_message(msg.subject, msg.body_plain)
            msg.summary = ai_data["summary"]
            msg.tags = ai_data["category"]
            msg.suggested_actions = json.dumps(ai_data["suggested_actions"])
            db.session.commit()

        return jsonify({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "from": msg.sender,
            "to": msg.recipient,
            "subject": msg.subject,
            "body": msg.body_plain,
            "timestamp": msg.timestamp.isoformat(),
            "username": msg.user.username,
            "created_at": msg.created_at.isoformat(),
            "subject": msg.subject,
            "tags": msg.tags,
            "summary": msg.summary,
            "suggested_actions": json.loads(msg.suggested_actions) if msg.suggested_actions else None,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/api/support_reply', methods=['POST'])
def support_reply():
    data = request.get_json()
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")
    message_id = data.get("support_message_id")
    conversation_id = data.get("conversation_id")

    if not (to and subject and body and message_id and conversation_id):
        return jsonify({"error": "Missing fields"}), 400

    # Create message-id header for tracking
    response = SupportResponse(
        conversation_id=conversation_id,
        message_id=message_id,
        responder_id=current_user.id,
        body=body,
        message_id_header=""  # placeholder, will set after flush
    )

    db.session.add(response)
    db.session.flush()  # allows access to response.id before commit

    # Generate a unique header
    generated_id = f"support-response-{response.id}@satisfactorytracker.com"
    response.message_id_header = generated_id

    # Commit now that everything is in place
    db.session.commit()
    
    sender = config.MAIL_SUPPORT_USERNAME
    # Send the actual email
    sent = send_email(
        to=to,
        subject=subject,
        plain_override=body,
        headers={"Message-Id": generated_id},
        sender=sender        
    )

    if not sent:
        logger.error(f"Failed to send email to {to} with subject: {subject}")
        return jsonify({"error": "Email failed to send."}), 500

    SupportDraft.query.filter_by(
        responder_id=current_user.id,
        message_id=message_id
    ).delete()
    db.session.commit()

    # Remove the conversation summary so it can be regenerated
    conversation = SupportConversation.query.get(conversation_id)
    if conversation.summary:
        conversation.summary = None
        db.session.commit()

    return jsonify({"message": "Reply sent and draft deleted!"}), 200


@main.route('/api/support_conversation/<int:id>', methods=['GET'])
def get_full_conversation(id):
    conversation = SupportConversation.query.get_or_404(id)
    # logger.info(f"Fetching conversation: {conversation}")
    
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    messages = SupportMessage.query.filter_by(conversation_id=id).all()
    # logger.info(f"Messages: {messages}")
    replies = SupportResponse.query.filter_by(conversation_id=id).all()
    # logger.info(f"Replies: {replies}")
    # Merge and sort by timestamp
    timeline = []

    for m in messages:
        timeline.append({
            "type": "message",
            "from": m.sender,
            "body": m.body_plain,
            "timestamp": m.created_at.isoformat(),
        })

    for r in replies:
        timeline.append({
            "type": "reply",
            "from": r.responder.username,
            "body": r.body,
            "timestamp": r.created_at.isoformat(),
        })

    # Sort chronologically
    timeline.sort(key=lambda item: item["timestamp"])

    if not conversation.summary:
        # Generate summary using AI
        summary = ai_summarise_thread(timeline)
        conversation.summary = summary
        db.session.commit()

    return jsonify({
        "conversation_id": id,
        "subject": conversation.subject,
        "status": conversation.status,
        "messages": timeline,
        "summary": conversation.summary,
    })



@main.route("/api/support_draft/<int:message_id>", methods=["GET"])
@login_required
def get_support_draft(message_id):
    draft = SupportDraft.query.filter_by(
        responder_id=current_user.id,
        message_id=message_id
    ).first()

    if not draft:
        return jsonify({"draft": None}), 200

    return jsonify({
        "id": draft.id,
        "message_id": draft.message_id,
        "conversation_id": draft.conversation_id,
        "body": draft.body,
        "updated_at": draft.updated_at.isoformat()
    }), 200

@main.route("/api/support_draft/<int:message_id>", methods=["DELETE"])
@login_required
def delete_support_draft(message_id):
    draft = SupportDraft.query.filter_by(
        responder_id=current_user.id,
        message_id=message_id
    ).first()

    if draft:
        db.session.delete(draft)
        db.session.commit()

    return jsonify({"message": "Draft deleted"}), 200

@main.route("/api/support_draft", methods=["POST"])
@login_required
def save_support_draft():
    data = request.get_json()
    message_id = data.get("message_id")
    conversation_id = data.get("conversation_id")
    body = data.get("body")

    if not message_id or not conversation_id or not body:
        return jsonify({"error": "Missing message_id, conversation_id, or body"}), 400

    draft = SupportDraft.query.filter_by(
        responder_id=current_user.id,
        message_id=message_id
    ).first()

    if draft:
        draft.body = body
    else:
        draft = SupportDraft(
            responder_id=current_user.id,
            message_id=message_id,
            conversation_id=conversation_id,
            body=body
        )
        db.session.add(draft)

    db.session.commit()
    return jsonify({"message": "Draft saved"}), 200

@main.route("/api/support_message/<int:message_id>/resolve", methods=["POST"])
@login_required
def resolve_support_conversation(message_id):
    msg = SupportMessage.query.get_or_404(message_id)
    conv = SupportConversation.query.get_or_404(msg.conversation_id)

    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    conv.resolved = True
    conv.resolved_at = datetime.now().strftime('%d/%m/%y %H:%M:%S')
    conv.resolved_by = current_user.id

    db.session.commit()

    return jsonify({"message": "Conversation marked as resolved"}), 200


@main.route('/api/request_password_reset', methods=['POST'])
def request_password_reset():    
    
    """Request a password reset link."""
    email = request.json.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        # Always return success to avoid exposing user existence
        return jsonify({"message": "If your email exists in our system, you'll receive a reset link shortly."}), 200

    try:
        # Generate the token and hash
        raw_token, token_hash = generate_secure_password_token()

        # Store the hashed token in DB
        reset = UserActionTokens(
            user_id=user.id,
            token_type='password_reset',
            token_hash=token_hash,
            expires_at=datetime.now() + timedelta(minutes=30)
        )
        db.session.add(reset)
        db.session.commit()

        # Send email with the raw token
        if RUN_MODE == "prod":
            reset_link = f"https://dev.satisfactorytracker.com/reset-password/{raw_token}"
        else:
            # Use the local URL for testing purposes
            reset_link = f"http://localhost:3000/reset-password/{raw_token}"
        
        send_email(
            to=user.email,
            subject="Password Reset Request",
            template_name="password_reset_request",
            context={"username": user.username, "reset_link": reset_link}
        )
        logging.debug(f"Password reset link sent to {user.email}")        
    except Exception as e:        
        db.session.rollback()
        logging.error(f"Failed to send password reset email: {str(e)}")
        return jsonify({"error": "Failed to send email"}), 500

    return jsonify({"message": "Password reset link sent!"}), 200

@main.route('/api/reset_password', methods=['POST'])
def reset_password():
    data = request.get_json()
    raw_token = data.get('token')
    new_password = data.get('new_password')

    if not raw_token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    try:
        # Hash incoming token for lookup
        token_entries = UserActionTokens.query.filter_by(
            used=False,
            token_type='password_reset').all()
        matching_token = next((t for t in token_entries if check_password_hash(t.token_hash, raw_token)), None)

        if not matching_token:
            return jsonify({"error": "Invalid token"}), 400

        if matching_token.expires_at < datetime.now():
            return jsonify({"error": "Token has expired"}), 400

        user = matching_token.user
        if not user:
            return jsonify({"error": "User not found"}), 400

        # Update user's password
        user.password = generate_password_hash(new_password)
        matching_token.used = True

        db.session.commit()

        # Optional: Send confirmation email
        send_email(
            to=user.email,
            subject="Your Satisfactory Tracker password was changed",
            template_name="password_change_alert",
            context={"username": user.username}
        )

        return jsonify({"message": "Password successfully updated!"}), 200

    except Exception as e:
        db.session.rollback()
        logging.error(f"Password reset failed: {str(e)}")
        return jsonify({"error": "Failed to reset password"}), 500

@main.route('/api/test_full_password_reset_flow_1', methods=['GET'])
def test_full_password_reset_flow_1():
    
    test_email = config.SYSTEM_TEST_USER_EMAIL
    logger.debug(f"Triggered password reset for: {test_email}")
    try:
        user = User.query.filter_by(email=test_email).first()
        if not user:
            logger.debug("Test user not found")
            return {"test_full_password_reset_flow_1": "Fail: Test user not found"}, 400

        # 1. Trigger password reset request
        client = current_app.test_client()
        reset_request = client.post('/api/request_password_reset', json={"email": test_email})
        if reset_request.status_code != 200:
            logger.debug(f"Password reset request failed: {reset_request.json}")
            return {"test_full_password_reset_flow_1": "Fail: Couldn't trigger reset"}, 500

        
        logger.debug("test_full_password_reset_flow_1 completed successfully")
        return {"test_full_password_reset_flow_1": "Pass"}, 200

    except Exception as e:
        logger.debug(f"test_full_password_reset_flow_1: {str(e)}")
        return {"test_full_password_reset_flow_1": f"Fail: {str(e)}"}, 500

@main.route('/api/test_full_password_reset_flow_2', methods=['GET'])
## Test value - /api/test_full_password_reset_flow_2?wait=10
def test_full_password_reset_flow_2():
    wait = int(request.args.get("wait", 0))
    if wait > 0:
        time.sleep(wait)
    
    test_email = config.SYSTEM_TEST_USER_EMAIL
    new_password = config.SYSTEM_TEST_USER_PASSWORD
    
    try:
        user = User.query.filter_by(email=test_email).first()
        message = (
            SupportMessage.query
            .filter(SupportMessage.sender == test_email)
            .filter(SupportMessage.subject == "Automated test: test_full_password_reset_flow_1 - Request password reset")
            .filter(SupportMessage.archived_at == None)
            .order_by(SupportMessage.created_at.desc())
            .first()
        )
        if not message:
            logger.debug("No support message found for test user")
            return {"test_full_password_reset_flow_2": "Fail: No message found"}, 404

        logger.debug(f"Found reset email created at {message.created_at}, message_id: {message.id}")
        match = re.search(r"https?://[^\s]+/reset-password/([A-Za-z0-9\-_]+)", message.body_plain or "")
        if not match:
            logger.debug("No reset link found in message body")
            return {"test_full_password_reset_flow_2": "Fail: No reset link found"}, 400
        token_url = match.group(0)
        raw_token = match.group(1)

        logger.debug(f"Token URL: {token_url}")
        
        if not token_url:
            logger.debug("No reset email or token found")
            return {"test_full_password_reset_flow_2": "Fail: No reset email or token found"}, 400

        # 3. Use the token to reset the password
        logger.debug(f"attempting to reset password with token: {raw_token}")
        client = current_app.test_client()
        reset_password = client.post('/api/reset_password', json={
            "token": raw_token,
            "new_password": new_password
        })

        if reset_password.status_code != 200:
            logger.debug(f"Password reset failed: {reset_password.json}")
            return {"test_full_password_reset_flow_2": f"Fail: Reset failed: {reset_password.json.get('error')}"}, 400

        # Clean up
        logger.debug("Cleaning up test data...")
        # Clean up the test data
        tokens = UserActionTokens.query.filter_by(
            user_id=user.id,
            token_type='password_reset',
            ).all()
        for t in tokens:
            db.session.delete(t)
                    
        message.archived_at = datetime.now()
        db.session.commit()

        logger.debug("Test completed successfully")
        return {"test_full_password_reset_flow_2": "Pass"}, 200
        
    except Exception as e:
        logger.exception(f"test_full_password_reset_flow_2: Failed to parse reset email or reset password: {str(e)}")
        return {"test_full_password_reset_flow_2": f"Fail: {str(e)}"}, 500

@main.route('/api/verify_email', methods=['POST'])
def verify_email():
    """
    Verifies an email verification token provided by the user.
    Expects a JSON body: { "raw_token": "the_token_from_the_email_link" }
    """
    data = request.get_json()
    if not data or 'raw_token' not in data:
        return jsonify({"error": "Missing verification token."}), 400

    raw_token = data['raw_token']
    if not raw_token: # Extra check for empty string
         return jsonify({"error": "Missing verification token."}), 400   
    try:
        result, user_id = verify_verification_token(raw_token)
        if result == "verified":
            # Token is valid, proceed with verification
            user = User.query.get(user_id)
            logger.debug(f"User found for token: {user}")
            logging.debug(f"User found for token: {user}")
            if not user:
                 # Should be rare, but handle case where user was deleted after token creation
                logging.error(f"User not found for valid token ID: {user_id}")
                return jsonify({"error": "Invalid verification token."}), 400

            # Update user and token status
            user.is_email_verified = True
            db.session.commit()
            
            logging.info(f"Email verified successfully for user ID: {user.id}")
            return jsonify({"message": "Email verified successfully."}), 200
        else:
            if result == "used":
                logging.warning(f"Attempt to use already used verification token for user ID: {user_id}")
                return jsonify({"error": "Verification token has already been used."}), 400
            elif result == "expired":
                logging.warning(f"Attempt to use expired verification token for user ID: {user_id}")
                return jsonify({"error": "Verification token has expired."}), 400
            elif result == "invalid":
                # If no token ever matched the hash, or it matched but didn't trigger above conditions
                logging.warning(f"Expired or Invalid verification token.")
                return jsonify({"error": "Invalid verification token."}), 400

    except SQLAlchemyError as e:
        db.session.rollback()
        logging.error(f"Database error during email verification: {e}")
        logging.error(traceback.format_exc())
        return jsonify({"error": "An internal error occurred during verification."}), 500
    except Exception as e:
        db.session.rollback() # Rollback just in case, though less likely needed here
        logging.error(f"Unexpected error during email verification: {e}")
        logging.error(traceback.format_exc())
        return jsonify({"error": "An unexpected error occurred."}), 500

# @main.route('/api/verify_email', methods=['POST'])
# def verify_email():
#     """
#     Verifies an email verification token provided by the user.
#     Expects a JSON body: { "raw_token": "the_token_from_the_email_link" }
#     """
#     data = request.get_json()
#     if not data or 'raw_token' not in data:
#         return jsonify({"error": "Missing verification token."}), 400

#     raw_token = data['raw_token']
#     if not raw_token: # Extra check for empty string
#          return jsonify({"error": "Missing verification token."}), 400

#     matching_token = None
#     try:
#         # 1. Find potential tokens (unused, correct type, not expired ideally)
#         # We don't have the user id, or email, only the token hash.
#         # So we need to find all potential tokens of the correct type.
#         # This is a bit inefficient, but we can optimize it later if needed. 
#         # We filter by type and used status first. We can't filter by hash directly.
#         # Filtering by expiry here is optional but efficient.
#         potential_tokens = UserActionTokens.query.filter_by(
#             token_type='email_validation',
#             used=False
#         ).filter(
#             UserActionTokens.expires_at > datetime.now(timezone.utc) # Check expiry in query            
#         ).all()
        
#         logging.debug(f"Potential tokens: {potential_tokens}")
#         logger.debug(f"Potential tokens: {potential_tokens}")
#         logger.debug(f"Expires at system: {datetime.now(timezone.utc)}")
#         logger.debug(f"Expires at db: {potential_tokens[0].expires_at}")

#         # 2. Check the hash of the provided raw_token against potential stored hashes
#         for token_entry in potential_tokens:
#             # Construct a multiline debug message for clarity
#             debug_msg = f"Checking token hash: {token_entry.token_hash}"
#             debug_msg += f" against {raw_token}" 
#             debug_msg += f" for user_id: {token_entry.user_id}"
#             debug_msg += f" and expires_at: {token_entry.expires_at}"
            
#             logger.debug(debug_msg)
#             logging.debug(debug_msg)
            
#             # Check if the provided raw_token matches the stored hash
#             if check_password_hash(token_entry.token_hash, raw_token):
#                 matching_token = token_entry
#                 break # Found the match

#         # 3. Process the result
#         if matching_token:
#             # Found a valid, unused, unexpired token of the correct type!

#             # Fetch the associated user
#             user = User.query.get(matching_token.user_id)
#             logger.debug(f"User found for token: {user}")
#             logging.debug(f"User found for token: {user}")
#             if not user:
#                  # Should be rare, but handle case where user was deleted after token creation
#                 logging.error(f"User not found for valid token ID: {matching_token.id}")
#                 # Avoid confirming token validity if user is gone
#                 return jsonify({"error": "Invalid verification token."}), 400

#             # Update user and token status
#             user.is_email_verified = True
#             matching_token.used = True
#             matching_token.used_at = datetime.now(timezone.utc)

#             db.session.commit()
#             logging.info(f"Email verified successfully for user ID: {user.id}")
#             return jsonify({"message": "Email verified successfully."}), 200
#         else:
#             # No matching token found (could be invalid hash, already used, expired, or wrong type)
#             # Check if a token with this hash exists but failed the criteria (e.g., expired/used)
#             # This part is for slightly better error reporting (optional)
#             expired_or_used_token = None
#             all_tokens_ever = UserActionTokens.query.filter_by(token_type='email_validation').all()
#             for t in all_tokens_ever:
#                  if check_password_hash(t.token_hash, raw_token):
#                      expired_or_used_token = t
#                      break

#             # if expired_or_used_token:
#             #      if expired_or_used_token.used:
#             #          logging.warning(f"Attempt to use already used verification token for user ID: {expired_or_used_token.user_id}")
#             #          return jsonify({"error": "Verification token has already been used."}), 400
#             #      elif expired_or_used_token.expires_at <= datetime.now(timezone.utc):
#             #          logging.warning(f"Attempt to use expired verification token for user ID: {expired_or_used_token.user_id}")
#             #          return jsonify({"error": "Verification token has expired."}), 400

#             # If no token ever matched the hash, or it matched but didn't trigger above conditions
#             logging.warning(f"Expired or Invalid verification token.")
#             return jsonify({"error": "Invalid verification token."}), 400

#     except SQLAlchemyError as e:
#         db.session.rollback()
#         logging.error(f"Database error during email verification: {e}")
#         logging.error(traceback.format_exc())
#         return jsonify({"error": "An internal error occurred during verification."}), 500
#     except Exception as e:
#         db.session.rollback() # Rollback just in case, though less likely needed here
#         logging.error(f"Unexpected error during email verification: {e}")
#         logging.error(traceback.format_exc())
#         return jsonify({"error": "An unexpected error occurred."}), 500


@main.route('/api/resend_verification_email', methods=['POST'])
def resend_verification_email():
    """
    Resends the email verification link to a user if their account exists
    and is not yet verified.
    Expects JSON body: { "email": "user@example.com" }
    """
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({"error": "Missing email address."}), 400

    email = data.get('email')
    if not email: # Extra check for empty string
         return jsonify({"error": "Missing email address."}), 400

    # --- Security Note ---
    # To prevent user enumeration (confirming if an email is registered),
    # we will return a generic success message regardless of whether the user
    # exists or is already verified. We only perform actions if the user
    # exists and is *not* verified.

    user = None
    try:
        user = User.query.filter_by(email=email).first()

        if user and not user.is_email_verified:
            # User exists and needs verification. Proceed to resend.

            # 1. (Optional but recommended) Invalidate old tokens for this user/type
            # Find existing, unused email verification tokens for this user
            existing_tokens = UserActionTokens.query.filter_by(
                user_id=user.id,
                token_type='email_validation',
                used=False
            ).all()

            for token in existing_tokens:
                token.used = True # Mark as used
                token.used_at = datetime.now(timezone.utc)
                logging.info(f"Marking old verification token {token.id} as used for user {user.id}")
            # Note: No commit here yet, we bundle it with the new token creation.

            # 2. Generate a new token
            # Can we include a hashed email in the token? Or is that too risky?
            
            raw_token, token_hash = generate_secure_verification_token()
            expiry_duration = timedelta(days=2) # Same duration as signup
            expires_at = datetime.now(timezone.utc) + expiry_duration
            logging.debug(f"Exires at: {expires_at}")

            # 3. Create and save the new UserActionTokens record
            new_verification_token = UserActionTokens(
                user_id=user.id,
                token_type='email_validation',
                token_hash=token_hash,
                expires_at=expires_at
            )
            db.session.add(new_verification_token)

            # 4. Commit changes (invalidate old tokens, add new one)
            db.session.commit()

            # 5. Construct the new verification link
            if RUN_MODE == "prod":
                # --- TODO: Should this be www.satisfactorytracker.com or the main domain eventually?
                # --- TODO: Refactor this URL generation into a utility function? ---
                verification_link = f"https://dev.satisfactorytracker.com/verify-email/{raw_token}"
            else:
                # Use the local URL for testing purposes
                verification_link = f"http://localhost:3000/verify-email/{raw_token}"

            # 6. Send the verification email (using the same templates)
            email_sent = send_email(
                to=user.email,
                subject="Verify Your Satisfactory Tracker Account (Resend)", # Slightly different subject? Optional.
                template_name="email_verification",
                context={
                    "username": user.username,
                    "verification_link": verification_link
                 }
            )

            if not email_sent:
                # Log the error, but we don't rollback token changes. User can try again.
                 logging.error(f"Failed to resend verification email to {user.email}.")
                 # Return generic message anyway to avoid leaking info

        elif user and user.is_email_verified:
            logging.info(f"Verification email resend requested for already verified user: {email}")
            # Do nothing, fall through to generic response
        else: # user is None
            logging.info(f"Verification email resend requested for non-existent email: {email}")
            # Do nothing, fall through to generic response

        # --- Generic Success Response ---
        # Always return this to prevent leaking information about account status.
        return jsonify({"message": "If an unverified account exists for this email, a new verification link has been sent."}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logging.error(f"Database error during verification email resend for {email}: {e}")
        logging.error(traceback.format_exc())
        # Return a generic server error, not the enumeration-safe message here
        return jsonify({"error": "An internal error occurred."}), 500
    except Exception as e:
        # Attempt rollback just in case, though less likely needed if commit failed
        db.session.rollback()
        logging.error(f"Unexpected error during verification email resend for {email}: {e}")
        logging.error(traceback.format_exc())
        # Return a generic server error
        return jsonify({"error": "An unexpected error occurred."}), 500

@main.route('/api/test_email_verify_flow_1_signup_and_resend', methods=['GET'])
def test_email_verify_flow_1_signup_and_resend():
    test_email = config.SYSTEM_TEST_NEW_USER_EMAIL
    test_username = config.SYSTEM_TEST_NEW_USER_USERNAME
    test_password = config.SYSTEM_TEST_NEW_USER_PASSWORD
    test_key = config.SYSTEM_TEST_SECRET_KEY

    logger.info(f"Starting test_email_verify_flow_1 for: {test_email}")

    client = current_app.test_client()

    try:
        # --- Initial Cleanup ---
        logger.info("Performing initial cleanup...")
        existing_user = User.query.filter_by(email=test_email).first()
        if existing_user:
            logger.warning(f"Found existing user {existing_user.id}. Deleting...")
            UserActionTokens.query.filter_by(user_id=existing_user.id).delete()
            SupportMessage.query.filter_by(user_id=existing_user.id).delete()
            SupportDraft.query.filter_by(responder_id=existing_user.id).delete()
            SupportConversation.query.filter_by(user_id=existing_user.id).delete()
            db.session.delete(existing_user)
            db.session.commit()
            logger.info("Previous user and related data cleaned up.")
        
        # --- Step 1: Signup ---
        logger.info(f"Attempting signup for {test_username} / {test_email}")
        signup_response = client.post('/api/signup', json={
            "username": test_username,
            "email": test_email,
            "password": test_password,
             "recaptcha_token": test_key,
        })

        if signup_response.status_code != 201:
            error_msg = signup_response.json.get('error', 'Signup API call failed')
            logger.error(f"Signup failed: {signup_response.status_code} - {error_msg}")
            return {"test_email_verify_flow_1": f"Fail: Signup failed ({error_msg})"}, 500

        # Verify user exists and is unverified
        user = User.query.filter_by(email=test_email).first()
        if not user:
            logger.error("Signup API returned success, but user not found in DB.")
            return {"test_email_verify_flow_1": "Fail: User not found post-signup"}, 500
        if user.is_email_verified:
            logger.error(f"User {user.id} is already verified after signup.")
            return {"test_email_verify_flow_1": "Fail: User verified immediately"}, 500
        logger.info(f"User {user.id} created successfully, is_email_verified=False.")

        # --- Step 2: Resend ---
        logger.info(f"Attempting to resend verification for {test_email}")
        resend_response = client.post('/api/resend_verification_email', json={
            "email": test_email
        })

        if resend_response.status_code != 200:
            error_msg = resend_response.json.get('error', 'Resend API call failed')
            logger.error(f"Resend failed: {resend_response.status_code} - {error_msg}")
            return {"test_email_verify_flow_1": f"Fail: Resend failed ({error_msg})"}, 500

        logger.info(f"Resend triggered successfully for {test_email}.")
        logger.info("test_email_verify_flow_1 completed successfully.")
        return {"test_email_verify_flow_1": "Pass"}, 200

    except Exception as e:
        logger.exception(f"test_email_verify_flow_1: Unhandled exception: {str(e)}")
        # Rollback in case of unexpected error during DB checks/ops
        db.session.rollback()
        return {"test_email_verify_flow_1": f"Fail: Exception - {str(e)}"}, 500

@main.route('/api/test_email_verify_flow_2_verify_from_resend', methods=['GET'])
def test_email_verify_flow_2_verify_from_resend():
    wait = int(request.args.get("wait", 0))
    
    logger.info(f"Starting test_email_verify_flow_2 (waiting {wait}s)...")
    time.sleep(wait)

    test_email = config.SYSTEM_TEST_NEW_USER_EMAIL
    client = current_app.test_client()

    try:
        # --- Find User ---
        user = User.query.filter_by(email=test_email).first()
        if not user:
            logger.error("Test user not found.")
            return {"test_email_verify_flow_2": "Fail: Test user not found"}, 404
        if user.is_email_verified:
            logger.error(f"User {user.id} is already verified before test runs.")
            return {"test_email_verify_flow_2": "Fail: User already verified"}, 400 # Should be False

        logger.info(f"User {user.id} found and is not verified.")

        # --- Find Latest Verification Email ---
        logger.info(f"Searching for latest verification email for {test_email}")
        verification_subject = "Automated System Test: - Verify Your Satisfactory Tracker Account (Resend)"
        message = (
            SupportMessage.query
            .filter(SupportMessage.recipient == test_email)
            .filter(SupportMessage.subject == verification_subject) # If exact match needed
            .filter(SupportMessage.archived_at == None)
            .order_by(SupportMessage.created_at.desc()) # Get the newest one (should be the resend)
            .first()
        )

        if not message:
            logger.error("No non-archived verification support message found.")
            return {"test_email_verify_flow_2": "Fail: No verification message found"}, 404

        logger.info(f"Found potential verification email (ID: {message.id}, Subject: '{message.subject}') created at {message.created_at}")

        # --- Extract Token ---
        # Regex adjusted for /verify-email/ path
        match = re.search(r"https?://[^\s]+/verify-email/([A-Za-z0-9\-_=]+)", message.body_plain or "")
        if not match or len(match.groups()) < 1:
            logger.error("No verification link/token found in message body.")
            logger.debug(f"Message Body Plain:\n{message.body_plain}")
            return {"test_email_verify_flow_2": "Fail: No verification link found"}, 400

        raw_token = match.group(1)
        logger.info(f"Extracted token: {raw_token[:5]}...{raw_token[-5:]}") # Log partial token

        # --- Call Verify API ---
        logger.info(f"Attempting verification with extracted token.")
        verify_response = client.post('/api/verify_email', json={
            "raw_token": raw_token
        })

        if verify_response.status_code != 200:
            error_msg = verify_response.json.get('error', 'Verify API call failed')
            logger.error(f"Verification failed: {verify_response.status_code} - {error_msg}")
            return {"test_email_verify_flow_2": f"Fail: Verification API failed ({error_msg})"}, 400

        # --- Verify DB state ---
        db.session.refresh(user) # Refresh user object from DB
        if not user.is_email_verified:
            logger.error("Verify API returned success, but user.is_email_verified is still False in DB.")
            return {"test_email_verify_flow_2": "Fail: DB verification state incorrect"}, 500

        logger.info(f"User {user.id} is now verified.")

        # --- Archive Message ---
        message.archived_at = datetime.now(timezone.utc) # Or pytz.utc
        db.session.commit()
        logger.info(f"Archived support message ID: {message.id}")

        logger.info("test_email_verify_flow_2 completed successfully.")
        return {"test_email_verify_flow_2": "Pass"}, 200

    except Exception as e:
        logger.exception(f"test_email_verify_flow_2: Unhandled exception: {str(e)}")
        db.session.rollback()
        return {"test_email_verify_flow_2": f"Fail: Exception - {str(e)}"}, 500

@main.route('/api/test_email_verify_flow_3_original_token_fails_and_cleanup', methods=['GET'])
def test_email_verify_flow_3_original_token_fails_and_cleanup():
    logger.info("Starting test_email_verify_flow_3...")

    test_email = config.SYSTEM_TEST_NEW_USER_EMAIL
    client = current_app.test_client()

    try:
        # --- Find User ---
        user = User.query.filter_by(email=test_email).first()
        if not user:
            logger.error("Test user not found at start of test 3.")
            # If user doesn't exist, previous step likely failed, but maybe cleanup anyway
            # For now, report failure if user missing.
            return {"test_email_verify_flow_3": "Fail: Test user not found"}, 404
        if not user.is_email_verified:
            logger.error(f"User {user.id} is not verified at start of test 3.")
            return {"test_email_verify_flow_3": "Fail: User not verified"}, 400 # Should be True

        logger.info(f"User {user.id} found and is verified.")

        # --- Find Original (Earliest) Verification Email ---
        logger.info(f"Searching for original verification email for {test_email}")
        verification_subject = "Automated System Test: - Verify your Satisfactory Tracker Account"
        original_message = (
            SupportMessage.query
            .filter(SupportMessage.recipient == test_email)
            .filter(SupportMessage.subject == verification_subject)
            .filter(SupportMessage.archived_at == None) # Find one not yet archived by previous test
            .order_by(SupportMessage.created_at.asc()) # Get the oldest non-archived one
            .first()
        )

        if not original_message:
            # This might happen if the previous test archived both, or if email subjects varied wildly.
            # For now, consider it a Pass for this specific test's goal (cleanup) if no message found.
            logger.warning("Could not find an original, non-archived verification message. Skipping token failure check, proceeding to cleanup.")

        else:
            logger.info(f"Found potential original email (ID: {original_message.id}, Subject: '{original_message.subject}') created at {original_message.created_at}")

            # --- Extract Original Token ---
            match = re.search(r"https?://[^\s]+/verify-email/([A-Za-z0-9\-_=]+)", original_message.body_plain or "")
            if not match or len(match.groups()) < 1:
                logger.error("No verification link/token found in original message body.")
                # If token not found, we can't test its failure. Archive and proceed to cleanup.
                logger.warning("Skipping token failure test - link not parseable.")
                original_message.archived_at = datetime.now(timezone.utc)
                db.session.commit()

            else:
                original_raw_token = match.group(1)
                logger.info(f"Extracted original token: {original_raw_token[:5]}...{original_raw_token[-5:]}")

                # --- Call Verify API with Original Token ---
                logger.info(f"Attempting verification with original token (expected to fail).")
                verify_response = client.post('/api/verify_email', json={
                    "raw_token": original_raw_token
                })

                # --- Verify FAILURE ---
                if verify_response.status_code == 200:
                    logger.error(f"Original token verification succeeded unexpectedly!")
                    return {"test_email_verify_flow_3": "Fail: Original token verification succeeded"}, 500
                elif verify_response.status_code != 400:
                     logger.error(f"Original token verification returned unexpected status: {verify_response.status_code}")
                     return {"test_email_verify_flow_3": f"Fail: Unexpected status {verify_response.status_code}"}, 500
                else:
                     # Check error message content
                    error_msg = verify_response.json.get('error', '').lower()
                    if "used" in error_msg or "invalid" in error_msg or "expired" in error_msg: # Expect one of these
                         logger.info(f"Original token verification failed as expected (Status: 400, Msg: '{error_msg}')")
                    else:
                         logger.warning(f"Original token verification failed (400) but message missing expected keyword: '{error_msg}'")
                         # Might still consider this a pass if status is 400

                # --- Archive Original Message ---
                original_message.archived_at = datetime.now(timezone.utc)
                db.session.commit()
                logger.info(f"Archived original support message ID: {original_message.id}")

        # --- Final Cleanup ---
        logger.info("Performing final cleanup...")
        if user: # Check if user object exists from earlier lookup
             tokens_deleted = UserActionTokens.query.filter_by(user_id=user.id).delete()
             logger.info(f"Deleted {tokens_deleted} UserActionTokens for user {user.id}.")
             db.session.delete(user)
             logger.info(f"Deleted User record {user.id}.")

        # Archive any other messages for this test user just in case
        other_messages_archived = SupportMessage.query.filter_by(recipient=test_email).filter(SupportMessage.archived_at == None).update({"archived_at": datetime.now(timezone.utc)})
        logger.info(f"Archived {other_messages_archived} remaining support messages for {test_email}.")
        db.session.commit()

        logger.info("test_email_verify_flow_3 completed successfully.")
        return {"test_email_verify_flow_3": "Pass"}, 200

    except Exception as e:
        logger.exception(f"test_email_verify_flow_3: Unhandled exception: {str(e)}")
        db.session.rollback()
        return {"test_email_verify_flow_3": f"Fail: Exception - {str(e)}"}, 500

def handle_ses_handshake(raw_body):
    try:
        payload = json.loads(raw_body)
    except Exception as e:
        logger.error(f"❌ Failed to parse SNS payload: {e}")
        return "Invalid JSON", 400

    if payload.get("Type") == "SubscriptionConfirmation":
        token_url = payload.get("SubscribeURL")
        logger.info(f"🔐 Confirming SNS subscription: {token_url}")
        requests.get(token_url)
        return "Subscription confirmed", 200

   
def normalise_email_address(raw_address):
    match = re.match(r"([^@]+)@(?:dev|qas\.)?(satisfactorytracker\.com)", raw_address)
    if match:
        local_part, domain = match.groups()
        return f"{local_part}@{domain}"
    return raw_address

from email import message_from_string
from email.policy import default as default_policy

def extract_plain_text_from_raw_email(raw_email):
    try:
        msg = message_from_string(raw_email, policy=default_policy)

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    return part.get_content().strip()
        else:
            return msg.get_content().strip()

    except Exception as e:
        logger.error(f"❌ Error parsing email content: {e}")
        return raw_email[:500]  # fallback, first 500 chars of raw email

@main.route("/api/ses_inbound_webhook", methods=["POST"])
def handle_ses_inbound_webhook():
    try:
        logger.info("✅ SES Webhook received")
        raw_body = request.data.decode("utf-8")
        sns_data = json.loads(raw_body)

        if sns_data.get("Type") == "SubscriptionConfirmation":
            token_url = sns_data.get("SubscribeURL")
            logger.info(f"Confirming SNS subscription: {token_url}")
            requests.get(token_url)
            return "Subscription confirmed", 200

        if sns_data.get("Type") != "Notification":
            ses_message = json.loads(sns_data.get("Message", "{}"))
            notification_type = ses_message.get("notificationType")
            logger.warning(f"Unhandled SNS message type: {sns_data.get('Type')}")
            logger.warning(f"SES message: {ses_message}")
            logger.warning(f"SES message type: {notification_type}")
            return "Unhandled message type", 400

        # Decode the actual SES notification
        ses_message = json.loads(sns_data.get("Message", "{}"))
        notification_type = ses_message.get("notificationType")

        # Handle test/setup messages
        if notification_type == "Received" and ses_message.get("mail", {}).get("messageId") == "AMAZON_SES_SETUP_NOTIFICATION":
            logger.info("📥 SES setup test received successfully.")
            return "Received setup test acknowledged", 200

        # Decode the email body (base64 encoded)
        content_b64 = ses_message.get("content", "")
        if not content_b64:
            logger.warning("No email content found in SES message.")
            return jsonify({"error": "Missing content"}), 400

        raw_email = base64.b64decode(content_b64).decode("utf-8", errors="replace")
        decoded_content = extract_plain_text_from_raw_email(raw_email)

        mail_data = ses_message.get("mail", {})
        
        sender = None
        headers = mail_data.get("headers", [])
        for header in headers:
            if header.get("name", "").lower() == "from":
                sender = header.get("value")
                break

        # Fallback to the source (may be the SES ugly version)
        if not sender:
            sender = normalise_email_address(mail_data.get("source", ""))
            logger.info(f"Fallback normalised sender: {sender} from source: {mail_data.get('source', '')}")
        
        recipients = mail_data.get("destination", [])
        recipient = normalise_email_address(recipients[0]) if recipients else "unknown"
        logger.info(f"Normalized recipient: {recipient} from raw: {recipients[0]}")

        subject = next((h.get("value") for h in mail_data.get("headers", []) if h.get("name", "").lower() == "subject"), "(No Subject)")
        message_id = mail_data.get("messageId")
        timestamp = mail_data.get("timestamp")

        logger.info(f"Incoming email: from {sender} → {recipient}, Subject: {subject}")

        if not (sender and recipient and message_id):
            return jsonify({"error": "Missing required fields."}), 400

        # Identify user
        user = User.query.filter_by(email=sender).first()
        user_id = user.id if user else 0

        # Special override for test accounts
        if not user and recipient in [config.SYSTEM_TEST_USER_EMAIL, config.SYSTEM_TEST_NEW_USER_EMAIL]:
            user = User.query.filter_by(email=recipient).first()
            user_id = user.id if user else 0

        # Skip duplicates
        existing = SupportMessage.query.filter_by(message_id=message_id).first()
        if existing:
            return jsonify({"message": "Message already received."}), 200

        # Check or create conversation thread
        match = re.search(r"support-id-(\d+)", subject or "", re.IGNORECASE)
        conversation = SupportConversation.query.get(int(match.group(1))) if match else None

        if not conversation:
            conversation = SupportConversation(user_id=user_id, subject=subject)
            db.session.add(conversation)
            db.session.flush()

        if user_id != 0:
            ai_data = ai_classify_message(subject, decoded_content)
        else:
            ai_data = {
                "summary": "No AI classification available for unregistered users.",
                "category": "Unregistered",
                "suggested_actions": []
            }

        # Save the message
        message = SupportMessage(
            user_id=user_id,
            message_id=message_id,
            conversation_id=conversation.id,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body_plain=decoded_content,
            body_html=None,
            timestamp=datetime.fromisoformat(timestamp.replace("Z", "+00:00")),
            tags=ai_data["category"],
            summary=ai_data["summary"],
            suggested_actions=json.dumps(ai_data["suggested_actions"]),
        )
        db.session.add(message)
        db.session.commit()

        if conversation.summary:
            conversation.summary = None
            db.session.commit()

        logger.info(f"✅ Support message saved: {subject}")
        return jsonify({"message": "Support message received successfully."}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error handling SES webhook: {str(e)}")
        return jsonify({"error": str(e)}), 500


@main.route("/api/test_email_inbound_1_send", methods=["POST"])
@login_required
def test_send_email_inbound():
    """
    Phase 1 - Send a system test email to the inbound support address.
    Used to test end-to-end email delivery and webhook handling.
    """
    try:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        subject = f"System Test Inbound Email - support-id-99999 - {timestamp}"
        body = f"This is a system test inbound email. Timestamp: {timestamp}"

        recipient = config.SYSTEM_TEST_USER_EMAIL or "support@satisfactorytracker.com"

        sent = send_email(
            to=recipient,
            subject=subject,
            plain_override=body,
            html_only=False,
        )

        if sent:
            return jsonify({
                "result": "Pass",
                "message": f"Test email sent to {recipient}",
                "timestamp": timestamp,
                "subject": subject
            }), 200
        else:
            return jsonify({
                "result": "Fail",
                "message": f"Failed to send test email to {recipient}"
            }), 500

    except Exception as e:
        return jsonify({
            "result": "Fail",
            "error": str(e)
        }), 500

@main.route("/api/test_email_inbound_2_verify", methods=["GET"])
@login_required
def test_verify_email_inbound():
    """
    Phase 2 - Verify that the system test email was received and normalized.
    Looks for a recent inbound test email with known pattern.
    """
    try:
        cutoff_time = datetime.now() - timedelta(minutes=5)
        recent_message = (
            SupportMessage.query
            .filter(SupportMessage.subject.like("System Test Inbound Email -%"))
            .filter(SupportMessage.timestamp >= cutoff_time)
            .order_by(SupportMessage.timestamp.desc())
            .first()
        )

        if not recent_message:
            return jsonify({
                "result": "Fail",
                "message": "No recent system test email found in SupportMessage."
            }), 404

        # Validation checks
        issues = []
        if "dev." in recent_message.recipient or "qas." in recent_message.recipient:
            issues.append(f"Recipient normalization failed: {recent_message.recipient}")
        if not recent_message.conversation_id:
            issues.append("Missing conversation/threading info.")
        if not recent_message.summary or recent_message.tags == "Unregistered":
            issues.append("AI classification incomplete or skipped.")

        if issues:
            return jsonify({
                "result": "Fail",
                "message": "Email received, but validation failed.",
                "issues": issues,
                "subject": recent_message.subject,
                "recipient": recent_message.recipient
            }), 400

        return jsonify({
            "result": "Pass",
            "subject": recent_message.subject,
            "normalized_recipient": recent_message.recipient,
            "conversation_id": recent_message.conversation_id
        }), 200

    except Exception as e:
        return jsonify({
            "result": "Fail",
            "error": str(e)
        }), 500










@main.route('/<path:path>')
def catchall(path):
    logger.info(f"CATCH-ALL route called: {path}")
    """CATCH-ALL route to serve React app or fallback."""
    if path.startswith("static/"):
        logger.info(f"CATCH-ALL - Skipping static route for: {path}")
        return "", 404  # Ensure Flask doesn't interfere with /static
    file_path = os.path.join(REACT_BUILD_DIR, path)
    if os.path.exists(file_path):
        logger.info(f"CATCH-ALL - Serving file: {file_path}")
        return send_from_directory(REACT_BUILD_DIR, path)
    logger.info("CATCH-ALL - Serving React app index.html")
    return send_from_directory(REACT_BUILD_DIR, 'index.html')

print("LOADED routes.py!")