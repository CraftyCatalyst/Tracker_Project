import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_mail import Mail

print("Loading extensions...")
login_manager = LoginManager()
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
mail = Mail()

def create_app():
    # Construct the absolute path to the config file
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../config.py'))
    #print(config_path)
    app = Flask(__name__, static_folder=None) # Explicity set static_folder to None to disable static file serving from default location
    app.config.from_pyfile(config_path)
    print("App created")

    print("Initializing extensions...")
    db.init_app(app)
    print("DB initialized")
    migrate.init_app(app, db)
    print("Migrate initialized")
    login_manager.init_app(app)
    print("Login Manager initialized")
    login_manager.login_view = 'login'
    print("Login view set")
    mail.init_app(app)
    print("Mail initialized")

    with app.app_context():
        print("Importing models...")
        # Import models to ensure they are registered
        from .models import User, Parts, Recipes, Alternate_Recipes, Miner_Type, Node_Purity, Power_Shards, Miner_Supply
        print("Models imported")
        
        print("Inspecting metadata...")
        for table_name, table_obj in db.metadata.tables.items():
            print(f"Table: {table_name}, Columns: {list(table_obj.columns.keys())}")

        print("Creating tables...")
        db.create_all()  # Ensure tables are created
        print("Tables created")

    # Register blueprints
    print("Registering blueprints...")
    from .routes import main
    app.register_blueprint(main)
    print("Blueprints registered")
    
    # print("Registered Routes:")
    # for rule in app.url_map.iter_rules():
    #     print(rule)
    
    print("App successfully created")
    return app
