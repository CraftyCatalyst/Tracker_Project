import sqlite3
import pandas as pd
import os

# Import the whitelist from the config file
from config import VALID_TABLES, VALID_COLUMNS

# Load Excel data
file_name = 'Satisfactory Parts Data v1.xlsx'
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
    cursor.execute(query, (value,))
    result = cursor.fetchone()
    if result:
        return result[0]
    # Insert the record if it doesn't exist
    if additional_data:
        columns = f"{unique_column}, " + ", ".join(additional_data.keys())
        placeholders = ", ".join(["?"] * (1 + len(additional_data)))
        values = [value] + list(additional_data.values())
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        cursor.execute(query, values)
    else:
        query = f"INSERT INTO {table} ({unique_column}) VALUES (?)"
        cursor.execute(query, value,)
    return cursor.lastrowid

# Load data from the spreadsheet
parts_df = pd.read_excel(excel_path, sheet_name="Part_Data")
recipes_df = pd.read_excel(excel_path, sheet_name="Recipes")
alternate_recipes_df = pd.read_excel(excel_path, sheet_name="Alternate_Recipes")
node_purity_df = pd.read_excel(excel_path, sheet_name="Node_Purity")
miner_type_df = pd.read_excel(excel_path, sheet_name="Miner_Type")
miner_supply_df = pd.read_excel(excel_path, sheet_name="Miner_Supply")
power_shards_df = pd.read_excel(excel_path, sheet_name="Power_Shards")

print("Data loaded from Excel")

#Replace "N/A" with None (treated as NULL in SQLite)
parts_df.replace("N/A", None, inplace=True)
recipes_df.replace("N/A", None, inplace=True)
alternate_recipes_df.replace("N/A", None, inplace=True)
node_purity_df.replace("N/A", None, inplace=True)
miner_type_df.replace("N/A", None, inplace=True)
miner_supply_df.replace("N/A", None, inplace=True)
power_shards_df.replace("N/A", None, inplace=True)

print("Replaced 'N/A' with None")


# Migrate parts
for _, row in parts_df.iterrows():
    get_or_create(cursor, "parts", "part_name", row["part_name"], {
        "level": row["level"],
        "category": row["category"],
        "base_production_type": row["base_production_type"],
        "produced_in_automated": row["produced_in_automated"],
        "produced_in_manual": row["produced_in_manual"],
        "production_type": row["production_type"]
    })

print("Migrated parts")

# Migrate recipes
for _, row in recipes_df.iterrows():
    part_id = get_or_create(cursor, "parts", "part_name", row["part_name"])
    cursor.execute("""
    INSERT INTO recipes (part_id, recipe_name, ingredient_count, source_level, base_input, base_demand_pm, base_supply_pm, byproduct, byproduct_supply_pm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (part_id, row["recipe_name"], row["ingredient_count"], row["source_level"], row["base_input"], row["base_demand_pm"], row["base_supply_pm"], row["byproduct"], row["byproduct_supply_pm"]))

print("Migrated recipes")

# Migrate alternate recipes
for _, row in alternate_recipes_df.iterrows():
    part_id = get_or_create(cursor, "parts", "part_name", row["part_name"])
    recipe_id = get_or_create(cursor, "recipes", "recipe_name", row["recipe_name"])
    cursor.execute("""
    INSERT INTO alternate_recipes (part_id, recipe_id, selected)
    VALUES (?, ?, ?)
    """, (part_id, recipe_id, row["selected"]))

print("Migrated alternate recipes")

# Migration of node purity
for _, row in node_purity_df.iterrows():
    cursor.execute("""
    INSERT INTO node_purity (node_purity)
    VALUES (?)
    """, (row["node_purity"],))

print("Migrated node purity")

# Migrate miner types
for _, row in miner_type_df.iterrows():
    cursor.execute("""
    INSERT INTO miner_type (miner_type)
    VALUES (?)
    """, (row["miner_type"],))

print("Migrated miner types")

# Migrate miner supplies
for _, row in miner_supply_df.iterrows():
    node_purity_id = get_or_create(cursor, "node_purity", "node_purity", row["node_purity"])
    miner_type_id = get_or_create(cursor, "miner_type", "miner_type", row["miner_type"])
    cursor.execute("""
    INSERT INTO miner_supply (node_purity_id, miner_type_id, base_supply_pm)
    VALUES (?, ?, ?)
    """, (node_purity_id, miner_type_id, row["base_supply_pm"]))

print("Migrated miner supplies")

# Migrate power shards
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
