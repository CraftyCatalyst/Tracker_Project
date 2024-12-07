import os
import logging
from dotenv import load_dotenv

# Logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base directory of the project
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
#print(basedir)

# Load environment variables from .env file
load_dotenv()

class Config:
    RUN_MODE = os.getenv('RUN_MODE')
    SECRET_KEY = os.getenv('SECRET_KEY') or 'dev_default_secret_key'

# Set DB config values based on RUN_MODE
if Config.RUN_MODE == 'local':
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "satisfactory_tracker", "SQLite_stuff", "satisfactory_parts.db")}'
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
elif Config.RUN_MODE == 'docker':
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.abspath(os.path.join(basedir, "app", "SQLite_stuff", "satisfactory_parts.db"))}' 
    REACT_BUILD_DIR = f'{os.path.join(basedir, "app", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "app", "build", "static")}'
else:
    # Throw an error if the run_mode is not set
    raise ValueError('RUN_MODE environment variable not set. Please set RUN_MODE to "local" or "docker"')

#print(f'SQLALCHEMY_DATABASE_URI: {SQLALCHEMY_DATABASE_URI}')
#print(f'React Build: {REACT_BUILD_DIR}')
#print(f'React Static: {REACT_STATIC_DIR}')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Email server config values
MAIL_SERVER = 'smtp.gmail.com' # Gmail SMTP server
MAIL_PORT = 587 # Port for TLS
MAIL_USE_TLS = True # Use TLS for security
MAIL_USERNAME = os.environ.get('ST_MAIL_USER') # Load email username from environment variable
MAIL_PASSWORD = os.environ.get('ST_MAIL_PW')  # Load email password from environment variable
MAIL_DEFAULT_SENDER = os.environ.get('ST_MAIL_SENDER') # Load email sender from environment variable

# Table and column whitelist
VALID_TABLES = {'parts', 'recipes', 'alternate_recipes', 'node_purity', 'miner_type', 'miner_supply', 'power_shards', "user", "data_validation"}
VALID_COLUMNS = {'part_name', 'level', 'category', 'base_production_type', 'produced_in_automated', 'produced_in_manual', 'production_type', 
                    'recipe_name', 'ingredient_count', 'source_level', 'base_input', 'base_demand_pm', 'base_supply_pm', 'byproduct', 'byproduct_supply_pm', 'selected', 
                    "selected",
                    'node_purity', 'miner_type', 'quantity', 'output_increase', 'base_supply_pm',
                    'part_id', 'recipe_id', 'node_purity_id', 'miner_type_id', 'id',
                    'username', 'email', 'password', 'is_verified', 'role',
                    'table_name', 'column_name', 'value', 'description'
                }