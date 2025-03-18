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
from .models import User, Tracker, User_Save, Part, Recipe, Machine, Machine_Level, Node_Purity, Resource_Node, UserSettings, User_Save_Pipes, User_Tester_Registrations, Project_Assembly_Phases, Project_Assembly_Parts, UserSelectedRecipe, Admin_Settings
from sqlalchemy.exc import SQLAlchemyError
from . import db
from .build_tree import build_tree
from .build_connection_graph import format_graph_for_frontend, build_factory_graph
from flask import request, flash, redirect, url_for
from werkzeug.security import check_password_hash
from werkzeug.security import generate_password_hash
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
from .logging_util import setup_logger
import secrets
import base64
import subprocess
import shutil


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

print("AT THE TOP OF routes.py!")

@main.before_request
def debug_request():
    if request.path != '/api/active_users':
        logging.debug(f"Routes: Incoming request: {request.method} {request.path} Current user: {current_user.username if current_user.is_authenticated else 'Anonymous'}")
    
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

@main.route('/api/login', methods=['GET', 'POST'])
def login():
    logging.info("Login route called")
    if request.method == 'POST':
        logging.info("POST method called")
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # logging.info(f"Email: {email}")
        user = User.query.filter_by(email=email).first()
        # logging.info(f"User: {user}")
        if not user or not check_password_hash(user.password, password):
            logging.info(f"Invalid email or password for user: {user}")
            return jsonify({"message": "Invalid email or password."}), 401

        # ✅ Instead of just sending 403, send user ID too
        if user.must_change_password:
            logging.info(f"Password reset required for user: {user}")
            return jsonify({
                "message": "Password reset required",
                "must_change_password": True,
                "user_id": user.id  # Pass user_id to the frontend!
            }), 403

        login_user(user) 
        logging.info(f"User logged in successfully: {user}")

        # ✅ Generate JWT Token (Same as before)
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
                "role": user.role
            }
        }), 200

    elif request.method == 'GET':
        logging.info("GET method called")
        current_user = User.query.get(1)
        user_info = {
            "is_authenticated": current_user.is_authenticated,
            "id": current_user.id if current_user.is_authenticated else None,
            "username": current_user.username if current_user.is_authenticated else None,
            "email": current_user.email if current_user.is_authenticated else None,
            "role": current_user.role if current_user.is_authenticated else None
        }
        logging.info(f"Current user: {user_info.username}")
        return jsonify({
            "message": "Please log in via the POST method.",
            "current_user": user_info
        }), 401

        
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
        data = request.get_json()  # Parse JSON payload
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        recaptcha_token = data.get('recaptcha_token')
        
        # Verify reCAPTCHA
        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
        response = requests.post(verify_url, data={
            'secret': API_KEY,
            'response': recaptcha_token
        })
        result = response.json()

        if not result.get('success'):
            return jsonify({"message": "reCAPTCHA validation failed. Please try again."}), 400
        
        # Verify that the username is unique
        user = User.query.filter_by(username=username).first()
        if user:
            return jsonify({"message": "Username is unavailable."}), 400    

        
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        
        new_user = User(
            username=username,
            email=email,
            password=hashed_password,
            role='user'
        )
        
        db.session.add(new_user)
        db.session.commit()

        flash('Account successfully created!', 'info')        
    return jsonify({"message": "Account created successfully."}), 201

@main.route('/api/logout')
@login_required
def logout():
    logout_user()    
    flash('Logged out successfully.', 'info')
    return jsonify({"message": "Logged out successfully."}), 201

def generate_verification_token(email):
    #print(f"********************************************Generating verification token for {email} with secret key: {config.SECRET_KEY}")
    serializer = URLSafeTimedSerializer(config.SECRET_KEY)
    return serializer.dumps(email, salt='email-confirm')

def confirm_verification_token(token, expiration=3600):
    serializer = URLSafeTimedSerializer(config.SECRET_KEY)
    try:
        email = serializer.loads(token, salt='email-confirm', max_age=expiration)
    except Exception:
        return None
    return email

@main.route('/verify/<token>')
def verify_email(token):
    try:
        email = confirm_verification_token(token)
    except Exception as e:
        flash('The verification link is invalid or has expired.', 'danger')
        return redirect(url_for('signup'))

    user = User.query.filter_by(email=email).first()
    if user.is_verified:  # Add `is_verified` to your User model
        flash('Account already verified. Please log in.', 'info')
        return redirect(url_for('login'))

    user.is_verified = True
    db.session.commit()
    flash('Your account has been verified! You can now log in.', 'success')
    return redirect(url_for('login'))

@main.route('/api/user_info', methods=['GET'])
#@login_required
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
    visited = request.args.get('visited')

    if not part_id:
        logger.error("❌ part_id is required")
        return jsonify({"error": "part_id is required"}), 400
    
    result = build_tree(part_id, recipe_name, target_quantity, visited)
    #logger.info(f"Build Tree Result: {result}")
    return jsonify(result)

@main.route('/api/get_system_status', methods=['GET'])
@login_required
def system_status():
    """Returns system-wide status information for the admin dashboard."""
    logger.info("ENTERED system_status ROUTE!")  # 🔹 Add a log
    print("ENTERED system_status ROUTE!")  # 🔹 Also print to console
    
    import subprocess
  
    # Check Flask Port
    flask_port = request.host.split(":")[-1]  # Extract from request URL
    logger.info(f"SYSTEM STATUS FLASK_PORT: {flask_port}")
    print(f"SYSTEM STATUS FLASK_PORT: {flask_port}")
    logger.info(f"SYSTEM STATUS RUN_MODE: {RUN_MODE}")
    print(f"SYSTEM STATUS RUN_MODE: {RUN_MODE}")
    # Check Database Connection
    try:
        db.session.execute(text("SELECT 1"))
        db_status = "Connected"
        print(f"SYSTEM STATUS DB_STATUS: {db_status}")
        logger.info(f"SYSTEM STATUS DB_STATUS: {db_status}")
    except Exception as e:
        db_status = f"Error: {str(e)}"
    
    # Check Nginx Status (only if running in production mode)
    if RUN_MODE in ["prod", "prod_local"]:
        try:
            #nginx_status = subprocess.run(["systemctl", "is-active", "nginx"], capture_output=True, text=True)
            nginx_status = subprocess.run(["/bin/sudo", "/usr/bin/systemctl", "is-active", "nginx"], capture_output=True, text=True)
            logging.debug(f"NGINX STATUS: {nginx_status} - {nginx_status.stdout}")
            nginx_status = "Running" if "active" in nginx_status.stdout else "Not Running"
        except Exception as e:
            nginx_status = f"Error: {str(e)}"
    else:
        nginx_status = "Not applicable (RUN_MODE is not 'prod')"

    print(f"SYSTEM STATUS NGINX_STATUS: {nginx_status}")
    logger.info(f"SYSTEM STATUS NGINX_STATUS: {nginx_status}")    
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
    logger.info(f"Getting recipe ID for part_id: {part_id} and recipe_name: {recipe_name}")

    try:
        # Use parameterized query to fetch the recipe
        query = text("SELECT * FROM recipe WHERE part_id = :part_id AND recipe_name = :recipe_name")
        recipe = db.session.execute(query, {"part_id": part_id, "recipe_name": recipe_name}).fetchall()
        logger.info(f"Query result: {recipe}")
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

@main.route('/api/dependencies', methods=['GET'])
def get_dependencies():
    """GET DEPENDENCIES - Retrieve all dependencies from the database."""
    query = text('SELECT * FROM dependencies')
    dependencies = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in dependencies])

@main.route('/tracker', methods=['GET'])
def tracker():
    """TRACKER - Render the tracker page."""
    return render_template('tracker.html') #TODO: Implement tracker.html
    
@main.route('/api/dashboard')
@login_required
def dashboard():
    """DASHBOARD - Render the dashboard page."""
    return f'Welcome, {current_user.username}!' #TODO: Implement dashboard.html
    

@main.route('/api/validation', methods=['GET'])
def get_data_validation():
    """Fetch all data validation rules."""
    query = text("SELECT * FROM data_validation")
    validation_data = db.session.execute(query).fetchall()
    # print("**************************************", [dict(row._mapping) for row in validation_data])
    return jsonify([dict(row._mapping) for row in validation_data])

@main.route('/api/tracker_reports', methods=['GET'])
def get_tracker_reports():
    user_id = current_user.id

    try:
        # Query the tracker table for the user's tracked parts
        query = """
            SELECT t.part_id, t.recipe_id, t.target_quantity, p.part_name, r.recipe_name
            FROM tracker t
            JOIN part p ON t.part_id = p.id
            JOIN recipe r ON t.recipe_id = r.id
            WHERE t.user_id = :user_id
        """
        # logger.info(f"tracker_reports Query: {query}, User: {user_id}")
        tracked_parts = db.session.execute(text(query), {"user_id": user_id}).fetchall()
        # logger.info(f"User: {user_id}, Tracked parts: {tracked_parts}")
        # Generate dependency trees for each tracked part
        reports = []
        for part in tracked_parts:
            part_id = part.part_id
            recipe_name = part.recipe_name
            target_quantity = part.target_quantity

            # Call build_tree for each tracked part
            tree = build_tree(part_id, recipe_name, target_quantity)
            reports.append({
                "part_id": part_id,
                "part_name": part.part_name,
                "recipe_name": recipe_name,
                "target_quantity": target_quantity,
                "tree": tree
            })

        return jsonify(reports), 200
    except Exception as e:
        logger.error(f"❌ Error generating tracker reports: {e}")
        return jsonify({"error": "Failed to generate tracker reports"}), 500

@main.route('/api/tracker_add', methods=['POST'])
@login_required
def add_to_tracker():
    logger.info("Adding part and recipe to tracker")
    if not current_user.is_authenticated:
        #logger.info(f"{current_user}, User is not authenticated")
        return jsonify({"error": "User is not authenticated"}), 401
    
    data = request.json
    part_id = data.get('partId')
    target_quantity = data.get('targetQuantity')
    recipe_id = data.get('recipeId')

    logger.info(f"Part ID: {part_id}, Recipe Name: {recipe_id}, Target Quantity: {target_quantity}")
    if not part_id or not recipe_id:
        return jsonify({"error": "Part ID and Recipe ID are required"}), 400

    #(f"Current user: {current_user}")
    # Check if the part and recipe are already in the user's tracker
    existing_entry = Tracker.query.filter_by(part_id=part_id, recipe_id=recipe_id, user_id=current_user.id).first()
    logger.info(f"Existing entry: {existing_entry}")
    if existing_entry:
        return jsonify({"message": "Part and recipe are already in the tracker"}), 200

    # Get the current time formatted as dd/mm/yy hh:mm:ss
    current_time = datetime.now().strftime('%d/%m/%y %H:%M:%S')

    logger.info(f"Adding new tracker entry for user: {current_user.id}, part: {part_id}, recipe: {recipe_id}, target quantity: {target_quantity}, recipe_id: {recipe_id}")
    # Add new tracker entry
    new_tracker_entry = Tracker(
        part_id=part_id,
        recipe_id=recipe_id,
        user_id=current_user.id,
        target_quantity=target_quantity,
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
        SELECT t.id, t.target_quantity, p.part_name, r.recipe_name, t.created_at, t.updated_at
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
        logger.info(f"Deleting tracker item with ID: {tracker_id}")
        tracker_item = Tracker.query.filter_by(id=tracker_id, user_id=current_user.id).first()
        logger.info(f"Tracker item: {tracker_item}")
        if not tracker_item:
            logger.info("Tracker item not found or you don't have permission to delete it")
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
        if target_quantity is None:
            return jsonify({"error": "Target quantity is required"}), 400

        tracker_item = Tracker.query.filter_by(id=tracker_id, user_id=current_user.id).first()
        if not tracker_item:
            return jsonify({"error": "Tracker item not found or you don't have permission to update it"}), 404

        tracker_item.target_quantity = target_quantity
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
        logger.info(f"Query: {query}, User: {user_id}, Recipe: {recipe_id}")
        
        db.session.execute(text(query), {"user_id": user_id, "recipe_id": recipe_id})
        db.session.commit()
        
        logger.info(f"Selected recipe deleted successfully: Recipe {recipe_id}, User {user_id}")
        
        return jsonify({"message": "Selected recipe deleted successfully"}), 200
    except Exception as e:
        logger.error(f"❌ Error deleting selected recipe: {e}")
        return jsonify({"error": "Failed to delete selected recipe"}), 500

@main.route('/api/log', methods=['POST'])
def log_message():
    data = request.json
    message = data.get('message')
    level = data.get('level', 'INFO')  # Default to INFO level

    if not message:
        return jsonify({"error": "Log message is required"}), 400

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
    logger.log(log_level, f"Frontend: {message}")
    return jsonify({"message": "Log recorded"}), 200

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
            logger.info(f"BEFORE PROCESS_SAVE_FILE CALL - Processing file: {filename} for user ID: {user_id}")
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
            Recipe.base_supply_pm,
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
            "base_supply_pm": us.base_supply_pm or 0,
            "actual_ppm": (us.base_supply_pm or 0) * (us.machine_power_modifier or 1), 
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
        #logger.info("Generating production report")
        data = request.json
        tracker_data = data.get("trackerData", [])
        save_data = data.get("saveData", [])
        
        #logger.info(f"Tracker Data: {tracker_data}, Save Data: {save_data}")

        if not tracker_data or not save_data:
            return jsonify({"error": "trackerData and saveData are required"}), 400
        
        part_production = {}
        
        def extract_required_quantities(tree, part_production):
            """Recursively extract required quantities from the dependency tree."""
            for part_name, details in tree.items():
                if part_name not in part_production:
                    part_production[part_name] = {"target": 0, "actual": 0}
                
                # Add required quantity
                part_production[part_name]["target"] += details.get("Required Quantity", 0)

                # Recursively process the subtree
                if "Subtree" in details and isinstance(details["Subtree"], dict):
                    extract_required_quantities(details["Subtree"], part_production)

        #logger.info("Processing trackerData for target production")
        # Process trackerData for target production
        for report in tracker_data:
            if not report.get("tree"):
                continue
               # ✅ Process trackerData for ALL dependencies, not just root parts
        for report in tracker_data:
            if not report.get("tree"):
                continue
            extract_required_quantities(report["tree"], part_production)
        
        #logger.info("Processing saveData for actual production")
        # Process saveData for actual production using base_supply_pm
        for save in save_data:
            base_supply_pm = save["base_supply_pm"] if save["base_supply_pm"] is not None else 0.0
            machine_power_modifier = save["machine_power_modifier"] if save["machine_power_modifier"] is not None else 1.0
            
            actual_ppm = base_supply_pm * machine_power_modifier

            save_part_name = save["part_name"] if save["part_name"] else "UNKNOWN_PART"
            
            if save_part_name == "UNKNOWN_PART":
                #logger.warning(f"Missing part name detected in user save data: {save}")
                continue

            if save_part_name not in part_production:
                part_production[save["part_name"]] = {"target": 0, "actual": 0}
            
            part_production[save["part_name"]]["actual"] += actual_ppm
            #logger.info(f"Save File Actual: {part_production[save_part_name]['actual']}")
        return jsonify(part_production), 200
    except Exception as e:
        logger.error(f"❌ Error generating production report: {e}")
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
                    r.base_supply_pm, 
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
                    MAX(base_supply_pm) AS base_supply_pm, 
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
                     r.base_supply_pm, cs.supply_pm AS conveyor_speed, i.icon_path AS icon_path
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

    return jsonify({
        "message": "Tester approved and user account created.",
        "temp_password": temp_password  # ⚠️ Only for testing; send securely via email later
    })

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
    requests = Project_Assembly_Parts.query.filter_by(phase_id=phase_id).all()
    return jsonify([
        {
            "id": req.id,
            "phase_id": req.phase_id,
            "phase_part_id": req.phase_part_id,
            "phase_part_quantity": req.phase_part_quantity,
        }
        for req in requests
    ])

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

@main.route('/api/get_admin_settings', methods=['GET'])
@login_required
def get_admin_settings():
    settings = Admin_Settings.query.all()
    # return the following fields id, setting_category, setting_key, setting_type, value_text, value_boolean, value_float, value_integer, value_datetime, created_at, updated_at
    
    return jsonify([
        {
            "id": settings.id,
            "setting_category": settings.setting_category,
            "setting_key": settings.setting_key,
            "setting_type": settings.setting_type,
            "value_text": settings.value_text,
            "value_boolean": settings.value_boolean,
            "value_float": settings.value_float,
            "value_integer": settings.value_integer,
            "value_datetime": settings.value_datetime,
            "created_at": settings.created_at,
            "updated_at": settings.updated_at,
        }
    ])

@main.route('/api/get_admin_setting/<category>/<key>/<type>', methods=['GET'])
@login_required
def get_admin_setting(category, key, type):
    setting = Admin_Settings.query.filter_by(setting_category=category, setting_key=key, setting_type=type).first()
    if not setting:
        return jsonify({"error": "Setting not found"}), 404
    
    if type == 'text':
        return jsonify({"value": setting.value_text})
    elif type == 'boolean':
        return jsonify({"value": setting.value_boolean})
    elif type == 'float':
        return jsonify({"value": setting.value_float})
    elif type == 'integer':
        return jsonify({"value": setting.value_integer})
    elif type == 'datetime':
        return jsonify({"value": setting.value_datetime})
    else:
        return jsonify({"error": "Invalid setting type"}), 400
    

@main.route('/api/add_admin_setting', methods=['POST'])
@login_required
def add_admin_setting():
    data = request.json
    category = data.get('category')
    key = data.get('key')
    type = data.get('type')
    value = data.get('value')

    if not category or not key or not type or value is None:
        return jsonify({"error": "Category, key, type, and value are required"}), 400

    setting = Admin_Settings.query.filter_by(setting_category=category, setting_key=key, setting_type=type).first()
    if not setting:
        return jsonify({"error": "Setting not found"}), 404

    if type == 'text':
        setting.value_text = value
    elif type == 'boolean':
        setting.value_boolean = value
    elif type == 'float':
        setting.value_float = value
    elif type == 'integer':
        setting.value_integer = value
    elif type == 'datetime':
        setting.value_datetime = value
    else:
        return jsonify({"error": "Invalid setting type"}), 400

    try:
        db.session.commit()
        return jsonify({"message": "Setting updated successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@main.route('/api/update_admin_setting', methods=['PUT'])
@login_required
def update_admin_setting():
    data = request.json
    id = data.get('id')
    category = data.get('category')
    key = data.get('key')
    type = data.get('type')
    value = data.get('value')

    if not category or not key or not type or value is None:
        return jsonify({"error": "Category, key, type, and value are required"}), 400

    setting = Admin_Settings.query.filter_by(id).first()
    if not setting:
        return jsonify({"error": "Setting not found"}), 404

    setting.category = category
    setting.key = key
    setting.type = type

    if type == 'text':
        setting.value_text = value
    elif type == 'boolean':
        setting.value_boolean = value
    elif type == 'float':
        setting.value_float = value
    elif type == 'integer':
        setting.value_integer = value
    elif type == 'datetime':
        setting.value_datetime = value
    else:
        return jsonify({"error": "Invalid setting type"}), 400

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
        "mysql": ["/usr/bin/sudo", "/usr/bin/journalctl", "-u", "mysql", "--no-pager", "--lines=100"]
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
        #return jsonify({"error": str(e)}), 500
    
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
        cpu_usage = subprocess.check_output(["top", "-bn1"]).decode('utf-8').split('\n')[2]
        memory_usage = subprocess.check_output(["free", "-m"]).decode('utf-8').split('\n')[1]
        disk_usage = subprocess.check_output(["df", "-h", "/"]).decode('utf-8').splitlines()[1]

        return jsonify({
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage
        })
    except Exception as e:
        return jsonify({"error": f"Could not fetch resources: {str(e)}"}), 500


# New route to update the must_change_password field for a user
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