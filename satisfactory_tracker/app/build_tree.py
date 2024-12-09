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
        SELECT p.part_name, r.base_input, r.source_level, r.base_demand_pm, r.base_supply_pm, r.recipe_name, p.produced_in_automated
        FROM parts p
        JOIN recipes r ON p.id = r.part_id
        WHERE p.id = :part_id AND r.recipe_name = :recipe_type
        """),
        {"part_id": part_id, "recipe_type": recipe_type}
    ).fetchall()

    if not part_data:
        visited.remove((part_id, recipe_type))
        return {"Error": f"Part ID {part_id} with recipe type {recipe_type} not found."}
    
    # Iterate over base inputs for the given part
    for row in part_data:
        base_input = row.base_input
        source_level = row.source_level
        base_demand = row.base_demand_pm
        base_supply = row.base_supply_pm
        produced_in = row.produced_in_automated
        base_recipe = row.recipe_name
        
        # Calculate required input quantity for this base input
        required_quantity = base_demand * target_quantity

        #TODO - # Lookup base input data to get its supply rate and produced in machine
        #TODO - # Incorporate the Alternate_Recipes table and determine the correct recipe type for the base input (default to _Standard if no alternate specified)
        #TODO - # Perform lookup for Produced In based on Base Input and Recipe


        # Skip parts with source_level == -2
        if source_level == -2:
            continue

        # Calculate the number of machines needed to produce the required amount
        no_of_machines = required_quantity / base_supply if base_supply else 0

        # Look up the part_id for the base_input
        base_input_id = db.session.execute(
            text("SELECT id FROM parts WHERE part_name = :base_input"),
            {"base_input": base_input}
        ).scalar()

        # Recursive call for subparts
        subtree = build_tree(base_input_id, base_recipe, target_quantity, visited)
        logger.info(f"Subtree for part_id {base_input_id} with recipe_type {recipe_type} and target_quantity {target_quantity}: {subtree}")
        tree[base_input] = {
            "Required Quantity": required_quantity,
            "Produced In": produced_in,
            "No. of Machines": no_of_machines,
            # "Base Demand": base_demand,
            # "Base Supply": base_supply,
            "Recipe": base_recipe,
            "Subtree": subtree,
        }

    visited.remove((part_id, recipe_type))
    return tree