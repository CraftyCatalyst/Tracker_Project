import sqlite3
import pandas as pd
import os
import importlib.util

# Construct the absolute path to the config file
config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../config.py'))
print (config_path)

# Load the config module dynamically
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

# Use the imported config variables
VALID_TABLES = config.VALID_TABLES
VALID_COLUMNS = config.VALID_COLUMNS

# Import the whitelist from the config file
#from config import VALID_TABLES, VALID_COLUMNS

# Load Excel data
file_name = 'SQLite_stuff/Satisfactory Parts Data v2.xlsx'
excel_path = os.path.join(os.getcwd(), file_name)

# Connect to the SQLite database
conn = sqlite3.connect("satisfactory_parts.db")
cursor = conn.cursor()

print("Connected to the database")

# Helper function to get or insert a record and return its ID
def get_or_create(cursor, table, unique_column, value, additional_data=None):
    if table not in VALID_TABLES or unique_column not in VALID_COLUMNS:
        raise ValueError("Invalid table or column name")
    
    # Check if the record already exists
    query = f"SELECT id FROM {table} WHERE {unique_column} = ?"
    print("Record check query: ", query)
    cursor.execute(query, (value,))
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Insert the record if it doesn't exist
    if additional_data:
        columns = f"{unique_column}, " + ", ".join(additional_data.keys())
        placeholders = ", ".join(["?"] * (1 + len(additional_data)))
        value = [value] + list(additional_data.values())
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        print("additional_data query: ", query)
        cursor.execute(query, value)
    else:
        query = f"INSERT INTO {table} ({unique_column}) VALUES (?)"
        print("Insert query: ", query)
        cursor.execute(query, (value,))
    return cursor.lastrowid

# Load data from the spreadsheet
part_df = pd.read_excel(excel_path, sheet_name="Part_Data")
recipe_df = pd.read_excel(excel_path, sheet_name="Recipes")
alternate_recipe_df = pd.read_excel(excel_path, sheet_name="Alternate_Recipes")
node_purity_df = pd.read_excel(excel_path, sheet_name="Node_Purity")
miner_type_df = pd.read_excel(excel_path, sheet_name="Miner_Type")
miner_supply_df = pd.read_excel(excel_path, sheet_name="Miner_Supply")
power_shards_df = pd.read_excel(excel_path, sheet_name="Power_Shards")
valid_values_df = pd.read_excel(excel_path, sheet_name="Valid_Values")

print("Data loaded from Excel")

#Replace "N/A" with None (treated as NULL in SQLite)
part_df.replace("N/A", None, inplace=True)
recipe_df.replace("N/A", None, inplace=True)
alternate_recipe_df.replace("N/A", None, inplace=True)
node_purity_df.replace("N/A", None, inplace=True)
miner_type_df.replace("N/A", None, inplace=True)
miner_supply_df.replace("N/A", None, inplace=True)
power_shards_df.replace("N/A", None, inplace=True)

print("Replaced 'N/A' with None")


# Migrate parts
print("Migrating parts")
for _, row in parts_df.iterrows():
    get_or_create(cursor, "parts", "part_name", row["part_name"], {
        "level": row["level"],
        "category": row["category"]              
    })

print("Migrated parts" )

# Migrate data validation
print("Migrating data validation")
for _, row in valid_values_df.iterrows():
    get_or_create(cursor, "data_validation", "table_name", row["table_name"], {
        "column_name": row["column_name"],
        "value": row["value"],
        "description": row["description"]
    })
print("Migrated data validation")

# Migrate recipes
print("Migrating recipes")
for _, row in recipe_df.iterrows():
    part_id = get_or_create(cursor, "part", "part_name", row["part_name"])
    cursor.execute("""
    INSERT INTO recipe (part_id, recipe_name, ingredient_count, source_level, base_input, base_production_type, produced_in_automated, produced_in_manual, base_demand_pm, base_supply_pm, byproduct, byproduct_supply_pm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (part_id, row["recipe_name"], row["ingredient_count"], row["source_level"], row["base_input"], row["base_production_type"], row["produced_in_automated"], row["produced_in_manual"], row["base_demand_pm"], row["base_supply_pm"], row["byproduct"], row["byproduct_supply_pm"]))

print("Migrated recipes")

# Migrate alternate recipes
print("Migrating alternate recipes")
for _, row in alternate_recipe_df.iterrows():
    part_id = get_or_create(cursor, "part", "part_name", row["part_name"])
    recipe_id = get_or_create(cursor, "recipe", "recipe_name", row["recipe_name"])
    cursor.execute("""
    INSERT INTO alternate_recipe (part_id, recipe_id, selected)
    VALUES (?, ?, ?)
    """, (part_id, recipe_id, row["selected"]))

print("Migrated alternate recipes")

# Migration of node purity
print("Migrating node purity")
for _, row in node_purity_df.iterrows():
    cursor.execute("""
    INSERT INTO node_purity (node_purity)
    VALUES (?)
    """, (row["node_purity"],))

print("Migrated node purity")

# Migrate miner types
print("Migrating miner types")
for _, row in miner_type_df.iterrows():
    cursor.execute("""
    INSERT INTO miner_type (miner_type)
    VALUES (?)
    """, (row["miner_type"],))

print("Migrated miner types")

# Migrate miner supplies
print("Migrating miner supplies")
for _, row in miner_supply_df.iterrows():
    node_purity_id = get_or_create(cursor, "node_purity", "node_purity", row["node_purity"])
    miner_type_id = get_or_create(cursor, "miner_type", "miner_type", row["miner_type"])
    cursor.execute("""
    INSERT INTO miner_supply (node_purity_id, miner_type_id, base_supply_pm)
    VALUES (?, ?, ?)
    """, (node_purity_id, miner_type_id, row["base_supply_pm"]))

print("Migrated miner supplies")

# Migrate power shards
print("Migrating power shards")
for _, row in power_shards_df.iterrows():
    cursor.execute("""
    INSERT INTO power_shards (quantity, output_increase)
    VALUES (?, ?)
    """, (row["quantity"], row["output_increase"]))

print("Migrated power shards")

# Commit and close
conn.commit()
conn.close()

print("Data migration complete!")
