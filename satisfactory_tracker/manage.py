from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_script import Manager
from app import create_app, db

app = create_app()
migrate = Migrate(app, db)
manager = Manager(app)

@manager.command
def list_tables():
    """List all tables in the database."""
    tables = db.engine.table_names()
    for table in tables:
        print(table)

if __name__ == '__main__':
    app.run()
