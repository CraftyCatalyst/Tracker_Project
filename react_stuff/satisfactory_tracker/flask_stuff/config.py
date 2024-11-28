import os
import logging

# Load SECRET_KEY from the environment variable, or use a default value for development
SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev_default_secret_key'

# DB config values
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "SQLite_stuff", "satisfactory_parts.db")}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(SQLALCHEMY_DATABASE_URI)

REACT_BUILD_DIR = "C:/Users/catst/OneDrive/Documents/repos/SatisfactoryExcelPY/react_stuff/satisfactory_tracker/build/"
#print(REACT_BUILD_DIR)