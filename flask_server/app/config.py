import os
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.DEBUG)

# Base directory of the project
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
print(f"CONFIG BASE DIRECTORY: {basedir}")

# Load environment variables from .env file
dotenv_path = os.path.join(basedir, "satisfactory_tracker", ".env")
print(f"CONFIG Loading .env from: {dotenv_path}")
logging.debug(f"CONFIG Loading .env from: {dotenv_path}")
load_dotenv(dotenv_path, override=True)

# for key in os.environ:
#     print(f"{key}: {os.getenv(key)}")
# print(f"Loaded .env from: {dotenv_path}")
# logging.debug(f"Loaded .env from: {dotenv_path}")

# Print a test variable to verify loading (Remove after testing)
# print(f"Loaded GITHUB_REPO: {os.getenv('GITHUB_REPO')}")

class Config:
    RUN_MODE = os.getenv('REACT_APP_RUN_MODE', '')

RUN_MODE = Config.RUN_MODE
print(f"Config.RUN_MODE: {Config.RUN_MODE}")    
logging.debug(f"Config.RUN_MODE: {Config.RUN_MODE}")

# print(f"os.getenv REACT_APP_RUN_MODE: {os.getenv('REACT_APP_RUN_MODE')}")
#logging.debug(f"os.getenv REACT_APP_RUN_MODE: {os.getenv('REACT_APP_RUN_MODE')}")

# Set DB config values based on REACT_APP_RUN_MODE
if Config.RUN_MODE == 'local':
    # print("Entering local condition")
    # logging.debug("Entering local condition")
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_LOCAL')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
elif Config.RUN_MODE == 'docker':
    # print("Entering docker condition")
    # logging.debug("Entering docker condition")
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_DOCKER')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "app", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "app", "build", "static")}'
elif Config.RUN_MODE == 'prod':
    # print("Entering prod condition")
    # logging.debug("Entering prod condition")
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_PROD')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
elif Config.RUN_MODE == 'prod_local':
    # print("Entering prod_local condition")
    # logging.debug("Entering prod_local condition")
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_PROD_LOCAL')
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'
else:
    # Throw an error if the REACT_APP_RUN_MODE is not set
    # print(f"ERROR: REACT_APP_RUN_MODE is not set: {Config.RUN_MODE} (type: {type(Config.RUN_MODE)})")
    logging.error(f"ERROR: REACT_APP_RUN_MODE is not set: {Config.RUN_MODE} (type: {type(Config.RUN_MODE)})")
    raise ValueError('REACT_APP_RUN_MODE environment variable not set. Please set REACT_APP_RUN_MODE to "local", "docker", "prod", or "prod_local"')

#print(f'SQLALCHEMY_DATABASE_URI: {SQLALCHEMY_DATABASE_URI}')
# logging.debug(f'SQLALCHEMY_DATABASE_URI: {SQLALCHEMY_DATABASE_URI}')
# Flask-login variables
SECRET_KEY = os.getenv('SECRET_KEY') or 'dev_default_secret_key'
SESSION_TYPE = 'filesystem'

SQLALCHEMY_TRACK_MODIFICATIONS = False

# Recaptcha keys
REACT_APP_RECAPTCHA_SITE_KEY = os.getenv('REACT_APP_RECAPTCHA_SITE_KEY')
RECAPTCHA_API_KEY = os.getenv('RECAPTCHA_API_KEY')

# .sav file upload config
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER')  # Define upload folder for save files
ALLOWED_EXTENSIONS = os.getenv('ALLOWED_EXTENSIONS')  # Define allowed file extensions

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN") # GitHub Personal Access Token
GITHUB_REPO = os.getenv("GITHUB_REPO") # GitHub Repository

MAIL_SERVER = os.getenv("MAIL_SERVER")
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")
MAILGUN_API_KEY=os.getenv("MAILGUN_API_KEY")
MAILGUN_DOMAIN=os.getenv("MAILGUN_DOMAIN")

OPENAI_API_KEY_SUPPORT_INBOX = os.getenv("OPENAI_API_KEY_SUPPORT_INBOX")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPEN_AI_PROJECT_ID = os.getenv("OPEN_AI_PROJECT_ID")
OPEN_AI_ORG_ID = os.getenv("OPEN_AI_ORG_ID")
OPEN_AI_ADMIN_KEY = os.getenv("OPEN_AI_ADMIN_KEY")

# Table and column whitelist
VALID_TABLES = {'admin_settings', 'alternate_recipe', 'conveyor_level', 'conveyor_supply', 'data_validation', 'icon', 'machine', 
                'machine_level', 'miner_supply', 'node_purity', 'part', 'pipeline_level', 'pipeline_supply', 'power_shards', 
                'project_assembly_parts', 'project_assembly_phases', 'recipe', 'recipe_mapping', 'resource_node', 'splitter', 'storage', 
                'tracker', 'user', 'user_connection_data', 'user_pipe_data', 'user_save', 'user_save_connections', 
                'user_save_conveyors', 'user_save_pipes', 'user_selected_recipe', 'user_settings', 'user_tester_registrations'
                }
VALID_COLUMNS = {'id', 'setting_category', 'setting_key', 'setting_value', 'recipe_id', 'selected', 'conveyor_level', 'conveyor_level_id', 'supply_pm', 'column_name', 
                 'description', 'table_name', 'value', 'icon_category', 'icon_name', 'icon_path', 'icon_id', 'machine_level_id', 'machine_name', 'save_file_class_name', 
                 'machine_level', 'base_supply_pm', 'node_purity', 'category', 'level', 'part_name', 'pipeline_level', 'pipeline_level_id', 'output_increase', 'quantity', 
                 'phase_id', 'phase_part_id', 'phase_part_quantity', 'phase_target_parts_pm', 'phase_target_timeframe', 'phase_description', 'phase_name', 'byproduct', 
                 'byproduct_supply_pm', 'byproduct_supply_quantity', 'ingredient', 'ingredient_count', 'ingredient_demand_pm', 'ingredient_demand_quantity', 'ingredient_part_id', 
                 'part_cycle_time_sec', 'part_id', 'part_supply_pm', 'part_supply_quantity', 'produced_in_automated', 'produced_in_manual', 'production_type', 'recipe_name', 
                 'source_level', 'save_file_recipe', 'node_purity_id', 'save_file_path_name', 'splitter_name', 'storage_name', 'target_parts_pm', 'target_quantity', 'target_timeframe', 
                 'updated_at', 'created_at', 'email', 'must_change_password', 'password', 'role', 'username', 'connection_type', 'conveyor_speed', 'direction', 'produced_item', 
                 'source_component', 'source_reference_id', 'target_component', 'target_level', 'target_reference_id', 'pipe_flow_rate', 'pipe_network', 'current_progress', 
                 'input_inventory', 'is_producing', 'machine_id', 'machine_power_modifier', 'output_inventory', 'production_duration', 'productivity_measurement_duration', 
                 'productivity_monitor_enabled', 'resource_node_id', 'sav_file_name', 'time_since_last_change', 'connected_component', 'connection_inventory', 'outer_path_name', 
                 'conveyor_first_belt', 'conveyor_last_belt', 'connection_points', 'fluid_type', 'instance_name', 'key', 'user_id', 'email_address', 'fav_satisfactory_thing', 
                 'is_approved', 'reason', 'reviewed_at'
                }