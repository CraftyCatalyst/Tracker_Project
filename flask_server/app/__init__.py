import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_mail import Mail
from flask_cors import CORS
from .logging_util import setup_logger

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()
mail = Mail()

logging.basicConfig(level=logging.DEBUG)

def create_app():
    # Construct the absolute path to the config file
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
    print(f"base path: {base_path}")
        
    config_path = os.path.join(base_path, "config.py")
    print(f"Loading config from: {config_path}")
    logging.debug(f"Loading config from: {config_path}")
    
    
    logger = setup_logger("__init__")
    app = Flask(__name__, static_folder=None) # Explicity set static_folder to None to disable static file serving from default location
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True) # Enable CORS for all domains on all routes with credentials support
    app.config.from_pyfile(config_path)   
    SECRET_KEY = app.config['SECRET_KEY']

    init_message = f"""
    *********************************************
    Initializing Flask Application...
    *********************************************
    """
    logger.info(init_message)
    logging.info(init_message)
    
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    login_manager.login_view = 'main.login'  # Redirect to login page if not authenticated
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    with app.app_context():
        # Import models to ensure they are registered
        from .models import User, Part, Recipe, Alternate_Recipe, Machine_Level, Node_Purity, Power_Shards, Miner_Supply, Data_Validation, Tracker, User_Save, Machine, Recipe_Mapping, Resource_Node
        #db.create_all()  # Ensure tables are created

    # Register blueprints
    from .routes import main
    app.register_blueprint(main)

    # print("Registered Routes:")
    x = 0
    for rule in app.url_map.iter_rules():
        x += 1
        # logger.debug(f"Endpoint: {rule.endpoint}, URL: {rule.rule}")        
        # print(f"Endpoint: {rule.endpoint}, URL: {rule.rule}")    
    print(f"Total Routes Registered: {x}")
    logger.info(f"Total Routes Registered: {x}")
    logging.info(f"Total Routes Registered: {x}")
    
    logger.info("✅ Flask Application successfully created")
    logging.info("Flask Application successfully created")
    return app 