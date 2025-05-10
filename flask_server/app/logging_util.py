from dotenv import load_dotenv
import logging
from logging.handlers import TimedRotatingFileHandler
from logging.handlers import RotatingFileHandler
import importlib.util
import os
from datetime import datetime

# Load environment variables
dotenv_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path)
relative_log_file = os.getenv('LOG_FILE_DIR', "logs/")

# Construct the absolute path
base_dir = os.path.abspath(os.path.dirname(__file__))  # Base directory of the script
LOG_FILE_DIR = os.path.join(base_dir, relative_log_file)

def setup_logger(name):
    """
    Sets up and returns a logger with file and console handlers.
    :param name: Name of the logger (usually __name__)
    :return: Configured logger instance
    """
  
    # Create a logger
    logger = logging.getLogger(name)
    # print(f"Initializing logger: {name}")


    # Set the logger level to DEBUG to capture all levels of logs
    logger.setLevel(logging.DEBUG)

    # Clear existing handlers to avoid duplication
    logger.handlers.clear()
    # print(f"Cleared existing handlers for logger: {name}")
    # Ensure no propagation to parent loggers
    logger.propagate = False

    # Ensure the directory exists
    log_dir = os.path.dirname(LOG_FILE_DIR)
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)       
    
    
    # Log file with dynamic date-based naming and counter
    log_file = os.path.join(log_dir, f"app_{datetime.now().strftime('%Y-%m-%d')}.log")
    # File size-based rotating log file handler
    file_handler = RotatingFileHandler(
        log_file, maxBytes=4 * 1024 * 1024, backupCount=0, encoding='utf-8'
    )
    
    # Create a file handler
    file_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)

    # Add handlers to the logger for the file and console and flask logs
    logger.addHandler(file_handler)
    
    # Log the startup
    logger.info("Application started. Logger initialized.")
    logger.info(f"Logger Handlers: {logger}, log_file: {log_file}")
    return logger

def format_log_message(title, content):
    return f"\n*********{str.upper(title)}*************\n{content}\n*****************************"

# # Usage Example
# logger = setup_logger(__name__)
# logger.info("This is an info message")
# logger.error("This is an error message")
# logger.debug("This is a debug message")
# logger.warning("This is a warning message")
# logger.critical("This is a critical message")
# 
# log_message = format_log_message("Test Title", "This is a test content")
# logger.info(log_message)
