import os
import logging
from sqlalchemy import text
from . import db

logger = logging.getLogger(__name__)

def build_tree(part_id, recipe_type="_Standard", target_quantity=1, visited=None):
    logger.info(f"Building tree for part_id {part_id} with recipe_type {recipe_type} and target_quantity {target_quantity}")
    if visited is None:
        visited = set()
    
    logger.info(f"Visited: {visited}")
    if (part_id, recipe_type) in visited:
        return {"Error": f"Circular dependency detected for part_id {part_id} with recipe_type {recipe_type}"}

    visited.add((part_id, recipe_type))
    tree = {}

    # Query part and recipe data
    part_data = db.session.execute(
        text("""
        SELECT p.part_name, r.base_input, r.source_level, r.base_demand_pm, r.base_supply_pm, r.recipe_name, r.produced_in_automated
        FROM parts p
        JOIN recipes r ON p.id = r.part_id
        WHERE p.id = :part_id AND r.recipe_name = :recipe_type
        """),
        {"part_id": part_id, "recipe_type": recipe_type}
    ).fetchall()

    if not part_data:
        visited.remove((part_id, recipe_type))
        return {"Error": f"Part ID {part_id} with recipe type {recipe_type} not found."}
    
    # Iterate over ingredient inputs for the given part
    for row in part_data:
        ingredient_input = row.base_input
        source_level = row.source_level
        ingredient_demand = row.base_demand_pm
        ingredient_recipe = row.recipe_name
        
        # Calculate required input quantity for this ingredient input
        required_quantity = ingredient_demand * target_quantity

        # Look up the part_id for the ingredient_input and the machine it is produced in
        ingredient_input_id = db.session.execute(
            text("SELECT id FROM parts WHERE part_name = :ingredient_input"),
            {"ingredient_input": ingredient_input}
        ).scalar()

        logger.info(f"Ingredient input: {ingredient_input}, Ingredient input ID: {ingredient_input_id}")

        #TODO TEST - # Lookup ingredient input data to get its supply rate and produced in machine
        ingredient_supply = db.session.execute(
            text("SELECT base_supply_pm FROM recipes WHERE part_id = :part_id AND recipe_name = :base_recipe"),
            {"part_id": ingredient_input_id, "base_recipe": ingredient_recipe}
        ).scalar()
        
        logger.info(f"Ingredient supply: {ingredient_supply}, ingredient_id: {ingredient_input_id}, recipe: {ingredient_recipe}")

        ingredient_production_machine = db.session.execute(
            text("SELECT produced_in_automated FROM recipes WHERE part_id = :base_input_id AND recipe_name = :base_recipe"),
            {"base_input_id": ingredient_input_id, "base_recipe": ingredient_recipe}
        ).scalar()
        sql_query = f"SELECT produced_in_automated FROM recipes WHERE part_id = {ingredient_input_id} AND recipe_name = '{ingredient_recipe}'"
        logger.info(f"SQL Query: {sql_query}")
        logger.info(f"Ingredient production machine: {ingredient_production_machine}")
        #TODO - # Incorporate the Alternate_Recipes table and determine the correct recipe type for the ingredient input (default to _Standard if no alternate specified)
        
        

        # Skip parts with source_level == -2
        if source_level == -2:
            continue

        # Calculate the number of machines needed to produce the required amount
        no_of_machines = required_quantity / ingredient_supply if ingredient_supply else 0

        logger.info(f"Ingredient input: {ingredient_input}, No. of Machines=: {no_of_machines}, Required Quantity/: {required_quantity} ingredient_supply: {ingredient_supply}")        

        # Recursive call for subparts
        subtree = build_tree(ingredient_input_id, ingredient_recipe, target_quantity, visited)
        logger.info(f"Subtree for part_id {ingredient_input_id} with recipe_type {recipe_type} and target_quantity {target_quantity}: {subtree}")
        tree[ingredient_input] = {
            "Required Quantity": required_quantity,
            "Produced In": ingredient_production_machine,
            "No. of Machines": no_of_machines,
            # "ingredient Demand": ingredient_demand,
            # "ingredient Supply": ingredient_supply,
            "Recipe": ingredient_recipe,
            "Subtree": subtree,
        }

    visited.remove((part_id, recipe_type))
    return tree