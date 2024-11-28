from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import text
from flask import send_from_directory
import os
import logging
from .models import User
from . import db
from config import REACT_BUILD_DIR
from config import REACT_STATIC_DIR

logger = logging.getLogger(__name__)

# print("Loading routes...")
#main = Blueprint('main', __name__)
main = Blueprint(
    'main',
    __name__,
    static_folder="C:/Users/catst/OneDrive/Documents/repos/SatisfactoryExcelPY/react_stuff/satisfactory_tracker/build/static"
)

@main.route('/')
def serve_react_app():
    react_dir = os.path.join(REACT_BUILD_DIR, 'index.html')
    logger.info(f"Serving React app: {react_dir}")
    return send_from_directory(REACT_BUILD_DIR, 'index.html')
#print (loading index.html...")


# from werkzeug.middleware.shared_data import SharedDataMiddleware

# # Serve React static files directly
# app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
#     '/static': os.path.join(REACT_BUILD_DIR, 'static')
# })
@main.route('/static/<path:path>')
def serve_static_files(path):
    """STATIC ROUTE - Serve static files from React's build directory."""
    logger.info(f"Serving static file: {path}")
    return send_from_directory(os.path.join(REACT_BUILD_DIR, 'static'), path)
#print("Loading static files...")

@main.route('/<path:path>')
def catchall(path):
    """Catch-all route to serve React app or fallback."""
    if path.startswith("static/"):
        logger.info(f"CATCHALL - Skipping static route for: {path}")
        return "", 404  # Ensure Flask doesn't interfere with /static
    file_path = os.path.join(REACT_BUILD_DIR, path)
    if os.path.exists(file_path):
        logger.info(f"CATCHALL - Serving file: {file_path}")
        return send_from_directory(REACT_BUILD_DIR, path)
    logger.info("CATCHALL - Serving React app index.html")
    return send_from_directory(REACT_BUILD_DIR, 'index.html')
#print("Loading catchall...")

@main.route('/login', methods=['GET', 'POST'])
def login():
    # Handle login logic
    pass
#print("Loading login page...")

@main.route('/signup', methods=['GET', 'POST'])
def signup():
    # Handle signup logic
    pass
#print("Loading signup page...")

@main.route('/logout', methods=['GET', 'POST'])
def logout():
    # Handle logout logic
    pass
#print("Loading logout page...")

@main.route('/api/parts', methods=['GET'])
def get_parts():
    query = text('SELECT * FROM parts')  # Wrap the query in text()
    parts = db.session.execute(query).fetchall()  # Execute the query
    return jsonify([dict(row._mapping) for row in parts])  # Convert rows to JSON-friendly dictionaries

@main.route('/api/recipes', methods=['GET'])
def get_recipes():
    # Return recipes data as JSON
    pass

@main.route('/api/alternate_recipes', methods=['GET'])
def get_alternate_recipes():
    # Return alternate_recipes data as JSON
    pass

@main.route('/api/dependencies', methods=['GET'])
def get_dependencies():
    # Return dependencies data as JSON
    pass

@main.route('/tracker', methods=['GET'])
def tracker():
    # Handle tracker logic
    pass

@main.route('/dashboard')
@login_required
def dashboard():
    return f'Welcome, {current_user.username}!'
