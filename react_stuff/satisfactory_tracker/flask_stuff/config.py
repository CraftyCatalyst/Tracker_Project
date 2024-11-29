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
# logger.info(SQLALCHEMY_DATABASE_URI)

REACT_BUILD_DIR = "C:/Users/catst/OneDrive/Documents/repos/SatisfactoryExcelPY/react_stuff/satisfactory_tracker/build/"
REACT_STATIC_DIR = "C:/Users/catst/OneDrive/Documents/repos/SatisfactoryExcelPY/react_stuff/satisfactory_tracker/build/static"
#print(REACT_BUILD_DIR)

# Email server config values
MAIL_SERVER = 'smtp.gmail.com' # Gmail SMTP server
MAIL_PORT = 587 # Port for TLS
MAIL_USE_TLS = True # Use TLS for security
MAIL_USERNAME = os.environ.get('ST_MAIL_USER') # Load email username from environment variable
MAIL_PASSWORD = os.environ.get('ST_MAIL_PW')  # Load email password from environment variable
MAIL_DEFAULT_SENDER = os.environ.get('ST_MAIL_SENDER') # Load email sender from environment variable