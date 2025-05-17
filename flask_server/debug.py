from sqlalchemy import inspect
from .app import create_app, db

print("Creating the Flask app...")
# Create the Flask app
app = create_app()

print("App created")

# Use the app context
with app.app_context():
    inspector = inspect(db.engine)

    # List all tables recognized by SQLAlchemy
    print("Tables SQLAlchemy recognizes:", inspector.get_table_names())

    # Check columns in specific tables
    for table_name in ['miner_type', 'node_purity', 'miner_supply']:
        if table_name in inspector.get_table_names():
            print(f"Columns in {table_name}:", inspector.get_columns(table_name))
        else:
            print(f"Table {table_name} not found by SQLAlchemy")