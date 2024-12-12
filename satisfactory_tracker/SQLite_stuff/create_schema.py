import sqlite3

# Connect to the database
conn = sqlite3.connect("satisfactory_parts.db")
cursor = conn.cursor()

# Create the schema
cursor.execute("""
CREATE TABLE parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_name TEXT NOT NULL,
    level INTEGER,
    category TEXT    
);
""")

cursor.execute("""
CREATE TABLE data_validation (
id INTEGER PRIMARY KEY AUTOINCREMENT,
table_name TEXT NOT NULL,
column_name TEXT NOT NULL,
value TEXT NOT NULL,
description TEXT
);
""")

cursor.execute("""
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    recipe_name TEXT NOT NULL,
    ingredient_count INTEGER,
    source_level INTEGER,
    base_input TEXT,
    base_production_type TEXT,
    produced_in_automated TEXT,
    produced_in_manual TEXT,
    base_demand_pm REAL,
    base_supply_pm REAL,
    byproduct TEXT,
    byproduct_supply_pm REAL,
    FOREIGN KEY(part_id) REFERENCES parts(id)
);
""")

cursor.execute("""
CREATE TABLE alternate_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    selected INTEGER DEFAULT 0 CHECK (selected IN (0, 1)),
    FOREIGN KEY(part_id) REFERENCES parts(id),
    FOREIGN KEY(recipe_id) REFERENCES recipes(id)
);
""")

cursor.execute("""
CREATE TABLE node_purity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_purity TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE miner_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    miner_type TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE miner_supply (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_purity_id INTEGER NOT NULL,
    miner_type_id INTEGER NOT NULL,
    base_supply_pm REAL NOT NULL,
    FOREIGN KEY(node_purity_id) REFERENCES node_purity(id),
    FOREIGN KEY(miner_type_id) REFERENCES miner_type(id)
);
""")

cursor.execute("""
CREATE TABLE power_shards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quantity INTEGER NOT NULL,
    output_increase REAL NOT NULL
);
""")

cursor.execute("""
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_verified BOOLEAN
    UNIQUE(username, email)
);
""")
# Close the connection
conn.commit()
conn.close()