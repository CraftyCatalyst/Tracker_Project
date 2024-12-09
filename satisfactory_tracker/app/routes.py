"""ROUTES - Define the routes for the Flask app."""
from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import text
from sqlalchemy import inspect
from sqlalchemy.orm import sessionmaker
from flask import send_from_directory
import os
import logging
from .models import User
from . import db
from .build_tree import build_tree
from flask import request, flash, redirect, url_for
from werkzeug.security import check_password_hash
from werkzeug.security import generate_password_hash
from itsdangerous import URLSafeTimedSerializer
from flask import current_app
from flask_mail import Message
from . import mail
import importlib.util

# Construct the absolute path to the config file
config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../config.py'))
logging.INFO, f"Loading config from: {config_path}"
print (config_path)

# Load the config module dynamically
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

# Use the imported config variables
REACT_BUILD_DIR = config.REACT_BUILD_DIR
REACT_STATIC_DIR = config.REACT_STATIC_DIR

logger = logging.getLogger(__name__)

main = Blueprint(
    'main',
    __name__,
    static_folder=REACT_STATIC_DIR
)

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

@main.route('/<path:path>')
def catchall(path):
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

@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email==email).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            flash('Login successful!', 'success')
            return redirect(url_for('serve_react_app'))
        else:
            flash('Invalid email or password.', 'danger')
    return render_template('login.html')  #TODO: Implement login.html

@main.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email is already in use.', 'warning')
            return redirect(url_for('signup'))

        new_user = User(
            username=username,
            email=email,
            password=generate_password_hash(password, method='sha256')
        )
        db.session.add(new_user)
        db.session.commit()

        # Generate and send verification email
        token = generate_verification_token(email)
        verify_url = url_for('verify_email', token=token, _external=True)
        msg = Message(
            subject='Verify Your Email',
            recipients=[email],
            body=f'Click the link to verify your email: {verify_url}'
        )
        mail.send(msg)

        flash('Account created! Check your email to verify your account.', 'info')
        return redirect(url_for('login'))

    return render_template('signup.html')  #TODO: Implement signup.html

@main.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))

def generate_verification_token(email):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='email-confirm')

def confirm_verification_token(token, expiration=3600):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
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

@main.route('/api/build_tree', methods=['GET'])
def build_tree_route():
    part_id = request.args.get('part_id')
    recipe_type = request.args.get('recipe_type', '_Standard')
    target_quantity = request.args.get('target_quantity', 1, type=int)
    visited = request.args.get('visited')

    if not part_id:
        return jsonify({"error": "part_id is required"}), 400

    result = build_tree(part_id, recipe_type, target_quantity, visited)

    return jsonify(result)

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

    # Build the SQL INSERT query
    columns = ", ".join(data.keys())
    values = ", ".join(f":{key}" for key in data.keys())
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
    print("Deleting row" + table_name + row_id)
    delete_query = text(f"DELETE FROM {table_name} WHERE id = :id")
    db.session.execute(delete_query, {"id": row_id})
    db.session.commit()
    return jsonify({"message": "Row deleted successfully"})

@main.route('/api/parts', methods=['GET'])
def get_parts():
    """GET ALL PARTS - Retrieve all parts from the database."""
    query = text('SELECT * FROM parts')  # Wrap the query in text()
    parts = db.session.execute(query).fetchall()  # Execute the query
    return jsonify([dict(row._mapping) for row in parts])  # Convert rows to JSON-friendly dictionaries

@main.route('/api/part_names', methods=['GET'])
def get_parts_names():
    """GET PART NAMES Fetch all parts from the database."""
    parts_query = db.session.execute(text("SELECT id, part_name FROM parts WHERE category = 'Parts'")).fetchall()
    parts = [{"id": row.id, "name": row.part_name} for row in parts_query]
    return jsonify(parts)

@main.route('/api/recipes', methods=['GET'])
def get_recipes():
    """GET RECIPES - Retrieve all recipes from the database."""
    query = text('SELECT * FROM recipes') # Wrap the query in text()
    recipes = db.session.execute(query).fetchall()
    return jsonify([dict(row._mapping) for row in recipes])

@main.route('/api/alternate_recipes', methods=['GET'])
def get_alternate_recipes():
    """
    Fetch all alternate recipes with part and recipe names.
    """
    query = text('SELECT ar.id, ar.part_id, ar.recipe_id, ar.selected, p.part_name, r.recipe_name FROM alternate_recipes ar JOIN parts p ON ar.part_id = p.id JOIN recipes r ON ar.recipe_id = r.id')
    result = db.session.execute(query).fetchall()
    alternate_recipes = [dict(row._mapping) for row in result]
    return jsonify(alternate_recipes)

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
    
@main.route('/dashboard')
@login_required
def dashboard():
    """DASHBOARD - Render the dashboard page."""
    return f'Welcome, {current_user.username}!' #TODO: Implement dashboard.html
