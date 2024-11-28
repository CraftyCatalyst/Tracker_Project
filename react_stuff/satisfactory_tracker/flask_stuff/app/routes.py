from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import text
from flask import send_from_directory
import os
import logging
from .models import User
from . import db
from config import REACT_BUILD_DIR

logger = logging.getLogger(__name__)

# print("Loading routes...")
main = Blueprint('main', __name__)

@main.route('/')
def serve_react_app():
    react_dir = os.path.join(REACT_BUILD_DIR, 'index.html')
    logger.info(f"Serving React app: {react_dir}")
    return send_from_directory(REACT_BUILD_DIR, 'index.html')
#print (loading index.html...")

@main.route('/static/<path:path>')
def serve_static_files(path):
    static_dir = (os.path.join(REACT_BUILD_DIR, 'static'), path)
    logger.info(f"Serving static file: {static_dir}")
    return send_from_directory(os.path.join(REACT_BUILD_DIR, 'static'), path)
#print("Loading static files...")

@main.route('/<path:path>')
def catchall(path):
    file_path = os.path.join(REACT_BUILD_DIR, path)
    logger.info(f"Checking file path: {file_path}")
    print(f"Checking file path: {file_path}")
    if os.path.exists(file_path):
        return send_from_directory(REACT_BUILD_DIR, path)
    else:
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
