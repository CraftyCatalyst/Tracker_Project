import os
import logging
from sqlalchemy import text
from . import db

logger = logging.getLogger(__name__)

def build_tree(part_id, recipe_type="_Standard", target_quantity=1, visited=None):
    logger.info(f"Building tree for part_id {part_id} with recipe_type {recipe_type} and target_quantity {target_quantity}")
    if visited is None:
        visited = set()
    
    if (part_id, recipe_type) in visited:
        return {"Error": f"Circular dependency detected for part_id {part_id} with recipe_type {recipe_type}"}

    visited.add((part_id, recipe_type))
    tree = {}

    # Query part and recipe data
    part_data = db.session.execute(
        text("""
        SELECT p.part_name, r.base_input, r.base_demand_pm, r.base_supply_pm, r.recipe_name
        FROM parts p
        JOIN recipes r ON p.id = r.part_id
        WHERE p.id = :part_id AND r.recipe_name = :recipe_type
        """),
        {"part_id": part_id, "recipe_type": recipe_type}
    ).fetchall()

    if not part_data:
        return {"Error": f"Part ID {part_id} with recipe type {recipe_type} not found."}
    
    # Iterate over base inputs for the given part
    for row in part_data:
        base_input = row.base_input
        base_demand = row.base_demand_pm
        base_supply = row.base_supply_pm
        required_quantity = base_demand * target_quantity

        # Recursive call for subparts
        subtree = build_tree(base_input, recipe_type, target_quantity, visited)
        tree[base_input] = {
            "Required Quantity": required_quantity,
            "Base Demand": base_demand,
            "Base Supply": base_supply,
            "Recipe": row.recipe_name,
            "Subtree": subtree
        }

    visited.remove((part_id, recipe_type))
    return tree