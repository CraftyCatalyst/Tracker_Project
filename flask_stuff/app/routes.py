from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user
from . import db
from .models import User

#print("Loading routes...")
main = Blueprint('main', __name__)

@main.route('/')
def home():
    return "Welcome to the home page!"
    #return render_template('index.html')
#print("Loading home page...")

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
    # Return parts data as JSON
    pass

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
