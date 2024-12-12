import sqlite3
import pandas as pd
import os
import argparse
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

# Define command-line arguments
parser = argparse.ArgumentParser(description='Refresh data to SQLite database.')
parser.add_argument('table', choices=['all_tables', 'parts', 'recipes', 'alternate_recipes', 'node_purity', 'miner_type', 'miner_supply', 'power_shards', 'data_validation' ], help='The table to delete and reload load data into')
args = parser.parse_args()

# Load Excel data
file_name = 'Satisfactory Parts Data v2.xlsx'
excel_path = os.path.join(os.getcwd(), file_name)

# Connect to the SQLite database
conn = sqlite3.connect("satisfactory_parts.db")
cursor = conn.cursor()
print("Connected to the database")

def get_record_count(cursor, table):
    query = f"SELECT COUNT(*) FROM {table}"
    cursor.execute(query)
    count = cursor.fetchone()[0]
    return count

def delete_all_data_from_table(cursor, table):
    # Delete all data from the table
    delete_query = f"DELETE FROM {table}"
    cursor.execute(delete_query)
    print(f"All data from table {table} deleted.")
    
    # Reset the ID seed
    reset_query = f"DELETE FROM sqlite_sequence WHERE name='{table}'"
    cursor.execute(reset_query)
    print(f"ID seed for table {table} reset.")

# Helper function to get or insert a record and return its ID
def get_or_create(cursor, table, unique_column, value, additional_data=None):
    if table not in VALID_TABLES or unique_column not in VALID_COLUMNS:
        print("Table or column invalid: ", table, unique_column)
        raise ValueError("Invalid table or column name")
    
 # Special logic for data_validation
    if table == "data_validation":
        query = f"SELECT id FROM {table} WHERE table_name = ? AND column_name = ? AND value = ?"
        cursor.execute(query, (value, additional_data["column_name"], additional_data["value"]))
        result = cursor.fetchone()
        if result:
            return result[0]
    else:
        # Default single-column uniqueness
        query = f"SELECT id FROM {table} WHERE {unique_column} = ?"
        #print("Record check query: ", query)
        cursor.execute(query, (value,))
        result = cursor.fetchone()
        if result:
            return result[0]
    
    # Insert the record if it doesn't exist
    if additional_data:
        #print("additional_data: ", additional_data)
        columns = f"{unique_column}, " + ", ".join(additional_data.keys())
        placeholders = ", ".join(["?"] * (1 + len(additional_data)))
        values = [value] + list(additional_data.values())
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        #print("additional_data query: ", query)
        cursor.execute(query, values)
    else:
        print("Inserting value: ", value)
        query = f"INSERT INTO {table} ({unique_column}) VALUES (?)"
        #print("Insert query: ", query)
        cursor.execute(query, (value,))
    return cursor.lastrowid

if args.table == 'parts' or args.table == 'all_tables':
    # Refresh parts
    print("REFRESHING PARTS")
    parts_df = pd.read_excel(excel_path, sheet_name="Part_Data")
    parts_df.replace("N/A", None, inplace=True)
    print(f"Record count before deleting data from parts: {get_record_count(cursor, 'parts')}")
    delete_all_data_from_table(cursor, 'parts')
    for _, row in parts_df.iterrows():
        get_or_create(cursor, "parts", "part_name", row["part_name"], {
            "level": row["level"],
            "category": row["category"]              
        })
    print(f"Record count after loading data into parts: {get_record_count(cursor, 'parts')}")
    print("PARTS DONE")

if args.table == 'data_validation' or args.table == 'all_tables':
    print("REFRESHING DATA VALIDATION")
    valid_values_df = pd.read_excel(excel_path, sheet_name="Valid_Values")
    #print(f"Columns in valid_values_df: {valid_values_df.columns}")
    print(f"Record count before deleting data from data_validation: {get_record_count(cursor, 'data_validation')}")
    delete_all_data_from_table(cursor, 'data_validation')
    for _, row in valid_values_df.iterrows():
        get_or_create(cursor, "data_validation", "table_name", row["table_name"], {
            "column_name": row["column_name"],
            "value": row["value"],
            "description": row["description"]
        })
    print(f"Record count after loading data into data_validation: {get_record_count(cursor, 'data_validation')}")
    print("DATA VALIDATION DONE")
   
if args.table == 'recipes' or args.table == 'all_tables':
    # Refresh recipes
    print("REFRESHING RECIPES")
    recipes_df = pd.read_excel(excel_path, sheet_name="Recipes")
    recipes_df.replace("N/A", None, inplace=True)    
    print(f"Record count before deleting data from recipes: {get_record_count(cursor, 'recipes')}")
    delete_all_data_from_table(cursor, 'recipes')
    for _, row in recipes_df.iterrows():
        part_id = get_or_create(cursor, "parts", "part_name", row["part_name"])
        cursor.execute("""
        INSERT INTO recipes (part_id, recipe_name, ingredient_count, source_level, base_input, base_production_type, produced_in_automated, produced_in_manual, base_demand_pm, base_supply_pm, byproduct, byproduct_supply_pm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (part_id, row["recipe_name"], row["ingredient_count"], row["source_level"], row["base_input"], row["base_production_type"], row["produced_in_automated"], row["produced_in_manual"], row["base_demand_pm"], row["base_supply_pm"], row["byproduct"], row["byproduct_supply_pm"]))
    print(f"Record count after loading data into recipes: {get_record_count(cursor, 'recipes')}")
    print("RECIPES DONE")

if args.table == 'alternate_recipes' or args.table == 'all_tables':
    # Refresh alternate recipes
    print("REFRESHING ALTERNATE RECIPES")
    alternate_recipes_df = pd.read_excel(excel_path, sheet_name="Alternate_Recipes")
    alternate_recipes_df.replace("N/A", None, inplace=True)    
    print(f"Record count before deleting data from alternate_recipes: {get_record_count(cursor, 'alternate_recipes')}")
    delete_all_data_from_table(cursor, 'alternate_recipes')
    for _, row in alternate_recipes_df.iterrows():
        part_id = get_or_create(cursor, "parts", "part_name", row["part_name"])
        recipe_id = get_or_create(cursor, "recipes", "recipe_name", row["recipe_name"])
        cursor.execute("""
        INSERT INTO alternate_recipes (part_id, recipe_id, selected)
        VALUES (?, ?, ?)
        """, (part_id, recipe_id, row["selected"]))
    print(f"Record count after loading data into alternate_recipes: {get_record_count(cursor, 'alternate_recipes')}")
    print("ALTERNATE RECIPES DONE")

if args.table == 'node_purity' or args.table == 'all_tables':
    # Refresh of node purity
    print("REFRESHING NODE PURITY")
    node_purity_df = pd.read_excel(excel_path, sheet_name="Node_Purity")
    node_purity_df.replace("N/A", None, inplace=True)    
    print(f"Record count before deleting data from node_purity: {get_record_count(cursor, 'node_purity')}")
    delete_all_data_from_table(cursor, 'node_purity')
    for _, row in node_purity_df.iterrows():
        cursor.execute("""
        INSERT INTO node_purity (node_purity)
        VALUES (?)
        """, (row["node_purity"],))
    print(f"Record count after loading data into node_purity: {get_record_count(cursor, 'node_purity')}")
    print("NODE PURITY DONE")

if args.table == 'miner_type' or args.table == 'all_tables':
    # Refresh miner types
    print("REFRESHING MINER TYPE")
    miner_type_df = pd.read_excel(excel_path, sheet_name="Miner_Type")
    miner_type_df.replace("N/A", None, inplace=True)
    print(f"Record count before deleting data from miner_type: {get_record_count(cursor, 'miner_type')}")
    delete_all_data_from_table(cursor, 'miner_type')
    for _, row in miner_type_df.iterrows():
        cursor.execute("""
        INSERT INTO miner_type (miner_type)
        VALUES (?)
        """, (row["miner_type"],))
    print(f"Record count after loading data into miner_type: {get_record_count(cursor, 'miner_type')}")
    print("MINER TYPE DONE")

if args.table == 'miner_supply' or args.table == 'all_tables':
    # Refresh miner supplies
    print("REFRESHING MINER SUPPLY")
    miner_supply_df = pd.read_excel(excel_path, sheet_name="Miner_Supply")
    miner_supply_df.replace("N/A", None, inplace=True)
    print(f"Record count before deleting data from miner_supply: {get_record_count(cursor, 'miner_supply')}")
    delete_all_data_from_table(cursor, 'miner_supply')
    for _, row in miner_supply_df.iterrows():
        node_purity_id = get_or_create(cursor, "node_purity", "node_purity", row["node_purity"])
        miner_type_id = get_or_create(cursor, "miner_type", "miner_type", row["miner_type"])
        cursor.execute("""
        INSERT INTO miner_supply (node_purity_id, miner_type_id, base_supply_pm)
        VALUES (?, ?, ?)
        """, (node_purity_id, miner_type_id, row["base_supply_pm"]))
    print(f"Record count after loading data into miner_supply: {get_record_count(cursor, 'miner_supply')}")
    print("MINER SUPPLY DONE")

if args.table == 'power_shards' or args.table == 'all_tables':
    # Refresh power shards
    print("REFRESHING POWER SHARDS")
    power_shards_df = pd.read_excel(excel_path, sheet_name="Power_Shards")
    power_shards_df.replace("N/A", None, inplace=True)
    print(f"Record count before deleting data from power_shards: {get_record_count(cursor, 'power_shards')}")
    delete_all_data_from_table(cursor, 'power_shards')
    for _, row in power_shards_df.iterrows():
        cursor.execute("""
        INSERT INTO power_shards (quantity, output_increase)
        VALUES (?, ?)
        """, (row["quantity"], row["output_increase"]))
    print(f"Record count after loading data into power_shards: {get_record_count(cursor, 'power_shards')}")
    print("POWER SHARDS DONE")

# Commit and close
conn.commit()
conn.close()

print(args.table, " data refresh complete!")
