from app import create_app, db
from flask_migrate import Migrate
from waitress import serve

app = create_app()
migrate = Migrate(app, db)

if __name__ == '__main__':
    # Use Waitress to serve the Flask app
    serve(app, host="0.0.0.0", port=5000)
