import os
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.WARNING)

# Base directory of the project
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# print(f"CONFIG BASE DIRECTORY: {basedir}")

# Load environment variables from .env file
dotenv_path = os.path.join(basedir, "satisfactory_tracker", ".env")
logging.debug(f"CONFIG Loading .env from: {dotenv_path}")
load_dotenv(dotenv_path, override=True)

class Config:
    RUN_MODE = os.getenv('REACT_APP_RUN_MODE')

RUN_MODE = Config.RUN_MODE
logging.debug(f"Config.RUN_MODE: {Config.RUN_MODE}")

# Set DB config values based on REACT_APP_RUN_MODE
if Config.RUN_MODE == 'local':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_LOCAL')
    BASE_API_URL = os.getenv('REACT_APP_API_BASE_URL_LOCAL')
    BASE_CLIENT_URL = os.getenv('REACT_CLIENT_BASE_URL_LOCAL')
elif Config.RUN_MODE == 'docker':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_DOCKER')
    BASE_API_URL = os.getenv('REACT_APP_API_BASE_URL_DOCKER')
    BASE_CLIENT_URL = os.getenv('REACT_CLIENT_BASE_URL_DOCKER')
elif Config.RUN_MODE == 'prod':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_PROD')
    BASE_API_URL = os.getenv('REACT_APP_API_BASE_URL_PROD')
    BASE_CLIENT_URL = os.getenv('REACT_CLIENT_BASE_URL_PROD')
elif Config.RUN_MODE == 'dev':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_DEV')
    BASE_API_URL = os.getenv('REACT_APP_API_BASE_URL_DEV')
    BASE_CLIENT_URL = os.getenv('REACT_CLIENT_BASE_URL_DEV')
elif Config.RUN_MODE == 'qas':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_QAS')
    BASE_API_URL = os.getenv('REACT_APP_API_BASE_URL_QAS')
    BASE_CLIENT_URL = os.getenv('REACT_CLIENT_BASE_URL_QAS')
elif Config.RUN_MODE == 'test':
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI_TEST')
    BASE_API_URL = os.getenv('REACT_APP_API_BASE_URL_TEST')
    BASE_CLIENT_URL = os.getenv('REACT_CLIENT_BASE_URL_TEST')
else:
    logging.error(f"ERROR: REACT_APP_RUN_MODE is not set: {Config.RUN_MODE} (type: {type(Config.RUN_MODE)})")
    raise ValueError('REACT_APP_RUN_MODE environment variable not set. Please set REACT_APP_RUN_MODE to "local", "docker", "prod", "dev", "qas" or "test".')

logging.debug(f"SQLALCHEMY_DATABASE_URI: {SQLALCHEMY_DATABASE_URI}")
logging.debug(f"BASE_API_URL: {BASE_API_URL}")
logging.debug(f"BASE_CLIENT_URL: {BASE_CLIENT_URL}")

if RUN_MODE == 'docker':
    REACT_BUILD_DIR = f'{os.path.join(basedir, "app", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "app", "build", "static")}'
else:
    REACT_BUILD_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build")}'
    REACT_STATIC_DIR = f'{os.path.join(basedir, "satisfactory_tracker", "build", "static")}'

logging.debug(f"REACT_BUILD_DIR: {REACT_BUILD_DIR}")
logging.debug(f"REACT_STATIC_DIR: {REACT_STATIC_DIR}")

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

# AWS variables
AWS_ACCESS_KEY_ID=os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY=os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION=os.getenv("AWS_REGION")
MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER")
MAIL_SERVER=os.getenv("MAIL_SERVER")
MAIL_PORT=int(os.getenv("MAIL_PORT", 587))
MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "true").lower() == "true"

# OPENAI variables
OPENAI_API_KEY_SUPPORT_INBOX = os.getenv("OPENAI_API_KEY_SUPPORT_INBOX")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPEN_AI_PROJECT_ID = os.getenv("OPEN_AI_PROJECT_ID")
OPEN_AI_ORG_ID = os.getenv("OPEN_AI_ORG_ID")
OPEN_AI_ADMIN_KEY = os.getenv("OPEN_AI_ADMIN_KEY")

# SYSTEM_TEST variables
SYSTEM_TEST_SECRET_KEY = os.getenv("SYSTEM_TEST_SECRET_KEY")
SYSTEM_TEST_USER_EMAIL = os.getenv("SYSTEM_TEST_USER_EMAIL")
SYSTEM_TEST_USER_PASSWORD = os.getenv("SYSTEM_TEST_USER_PASSWORD")
SYSTEM_TEST_NEW_USER_EMAIL = os.getenv("SYSTEM_TEST_NEW_USER_EMAIL")
SYSTEM_TEST_NEW_USER_USERNAME = os.getenv("SYSTEM_TEST_NEW_USER_USERNAME")
SYSTEM_TEST_NEW_USER_PASSWORD = os.getenv("SYSTEM_TEST_NEW_USER_PASSWORD")

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