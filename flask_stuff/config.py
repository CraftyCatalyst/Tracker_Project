import os

# Load SECRET_KEY from the environment variable, or use a default value for development
SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev_default_secret_key'

# Other config values
SQLALCHEMY_DATABASE_URI = 'sqlite:///app.db'
SQLALCHEMY_TRACK_MODIFICATIONS = False