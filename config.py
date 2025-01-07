import os
import logging
from dotenv import load_dotenv

# Logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base directory of the project
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
#print(basedir)

# Load environment variables from .env file
dotenv_path = os.path.join(basedir, ".env")
load_dotenv()

class Config:
    RUN_MODE = os.getenv('RUN_MODE_LOCATION')
    print(f'RUN_MODE: {RUN_MODE}')

# Set DB config values based on RUN_MODE
if Config.RUN_MODE == 'local':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_LOCAL')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
elif Config.RUN_MODE == 'docker':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_DOCKER')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "app", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "app", "build", "static")}'
elif Config.RUN_MODE == 'prod':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_PROD')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
elif Config.RUN_MODE == 'prod_local':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_PROD_LOCAL')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
else:
    # Throw an error if the run_mode is not set
    raise ValueError('RUN_MODE environment variable not set. Please set RUN_MODE to "local" or "docker"')

print(f'SQLALCHEMY_DATABASE_URI: {SQLALCHEMY_DATABASE_URI}')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Recaptcha keys
REACT_APP_RECAPTCHA_SITE_KEY = os.getenv('REACT_APP_RECAPTCHA_SITE_KEY')
RECAPTCHA_API_KEY = os.getenv('RECAPTCHA_API_KEY')

# Table and column whitelist
VALID_TABLES = {'part', 'recipe', 'alternate_recipe', 'node_purity', 'miner_type', 'miner_supply', 'power_shards', "user", "data_validation"}
VALID_COLUMNS = {'part_name', 'level', 'category', 'base_production_type', 'produced_in_automated', 'produced_in_manual', 'production_type', 
                    'recipe_name', 'ingredient_count', 'source_level', 'base_input', 'base_demand_pm', 'base_supply_pm', 'byproduct', 'byproduct_supply_pm', 'selected', 
                    "selected",
                    'node_purity', 'miner_type', 'quantity', 'output_increase', 'base_supply_pm',
                    'part_id', 'recipe_id', 'node_purity_id', 'miner_type_id', 'id',
                    'username', 'email', 'password', 'is_verified', 'role',
                    'table_name', 'column_name', 'value', 'description'
                }