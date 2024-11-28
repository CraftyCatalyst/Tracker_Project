from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate

print("Loading extensions...")
login_manager = LoginManager()
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

def create_app():
    #print("Creating app...")
    app = Flask(__name__)

    # Load configurations from config.py
    app.config.from_object('config')
    #print("Loading configurations...")

    # Initialize extensions
    db.init_app(app)

    with app.app_context():
        db.create_all()  # Ensure tables are created
    #print("Creating tables...")
    migrate.init_app(app, db)
    
    # Import models to ensure they are registered
    from .models import User
    
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    #print("Initializing extensions...")

    # Register blueprints (if any)
    from .routes import main
    app.register_blueprint(main)
    #print("Registering blueprints...")

    return app
