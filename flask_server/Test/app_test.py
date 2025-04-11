from app import create_app, db
from flask_migrate import Migrate
import logging
from flask import Flask
from flask_cors import CORS
from waitress import serve
from flask import jsonify

app = create_app()
migrate = Migrate(app, db)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,  # Log INFO level and above
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.route("/")
def home():
    logger.info("Home route accessed")
    return {"message": "Hello from MiniPC!"}

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=5000)

@app.route("/logs")
def get_logs():
    with open("waitress_server.log", "r") as log_file:
        logs = log_file.readlines()
    return jsonify(logs)