# Description: This module contains the function to build the tree structure for the given part_id, recipe_name, target_quantity and target_parts_pm/target_timeframe.
# It then recursively builds the subtrees for each part in the recipe.
# The function calculates the required quantity, required parts per minute, timeframe, and number of machines needed to produce the given part and each of the ingredient inputs based on the target quantity and target parts per minute.
# The function returns a dictionary containing the tree structure and subtrees for the given part_id and all it's ingredient inputs.

from sqlalchemy import text
from . import db
from flask_login import current_user
from .logging_util import setup_logger
import logging

logger = setup_logger("build_tree")

def build_tree(part_id, recipe_name="_Standard", target_quantity=1, target_parts_pm=None, target_timeframe=None, visited=None, in_recursion=False):
    #logging.debug(f"*********************Building tree for part_id: {part_id}, recipe_name: {recipe_name}, target_quantity: {target_quantity}, target_parts_pm: {target_parts_pm}, target_timeframe: {target_timeframe}, visited: {visited}, in_recursion: {in_recursion}*****************")
    # Check for user-selected recipe
    parent_required_rate = 0
    if float(target_parts_pm) is not None and float(target_parts_pm) > 0:
        parent_required_rate = float(target_parts_pm)
    elif float(target_timeframe) is not None and float(target_timeframe) > 0:
        parent_required_rate = target_quantity / float(target_timeframe)
    
    parent_total_quantity = target_quantity
    selected_recipe_query = """
        SELECT r.id, r.recipe_name
        FROM user_selected_recipe usr
        JOIN recipe r ON usr.recipe_id = r.id
        WHERE usr.user_id = :user_id AND usr.part_id = :part_id
    """
    selected_recipe = db.session.execute(
        text(selected_recipe_query), {"user_id": current_user.id, "part_id": part_id}
    ).fetchone()

    recipe_type = selected_recipe.recipe_name if selected_recipe else recipe_name
    if visited is None:
        visited = set()
    
    if (part_id, recipe_type) in visited:
        logging.error("Circular dependency detected for part_id %s with recipe_name %s", part_id, recipe_type)
        return {"Error": f"Circular dependency detected for part_id {part_id} with recipe_name {recipe_type}"}
    
    visited.add((part_id, recipe_type))
    
    root_data = db.session.execute(
            text("""
            SELECT p.part_name, r.ingredient_demand_pm, r.part_supply_pm, r.recipe_name, r.produced_in_automated,
                 r.ingredient_demand_quantity, r.part_supply_quantity, r.part_cycle_time_sec, 
                 r.byproduct, r.byproduct_supply_pm, r.byproduct_supply_quantity
            FROM part p
            JOIN recipe r ON p.id = r.part_id
            WHERE p.id = :part_id AND r.recipe_name = :recipe_name
            """),
            {"part_id": part_id, "recipe_name": recipe_type}
        ).fetchone()

    if not root_data:
            logging.error("Part ID  with recipe type  not found.", part_id, recipe_type)
            visited.remove((part_id, recipe_type))
            return {"Error": f"Part ID {part_id} with recipe type {recipe_type} not found."}
    
    # Create the root or current node
    root_info = {
        "Recipe": recipe_name,
        "Required Quantity": parent_total_quantity,
        "Required Parts PM": parent_required_rate,
        "Timeframe": (target_timeframe if target_timeframe is not None
                    else (target_quantity / parent_required_rate if parent_required_rate else 0)),
        "Produced In": root_data.produced_in_automated,
        #"No. of Machines": target_parts_pm / (root_data.part_supply_pm or 1),
        "Part Supply PM": root_data.part_supply_pm,
        "Part Supply Quantity": root_data.part_supply_quantity,
        "Part Cycle Time": root_data.part_cycle_time_sec,        
        "Subtree": {},  # Initialize empty Subtree
    }
    if root_data.part_supply_pm and root_data.part_supply_pm > 0:
        root_info["No. of Machines"] = parent_required_rate / root_data.part_supply_pm
    else:
        root_info["No. of Machines"] = 0
    
    # Fetch all ingredients for the current recipe
    ingredients = db.session.execute(
        text("""
        SELECT r.recipe_name, r.ingredient, r.source_level, r.ingredient_demand_pm, r.part_supply_pm, 
             r.ingredient_demand_quantity, r.part_supply_quantity, r.part_cycle_time_sec, 
             r.byproduct, r.byproduct_supply_pm, r.byproduct_supply_quantity
        FROM recipe r
        WHERE r.part_id = :part_id AND r.recipe_name = :recipe_name
        """),
        {"part_id": part_id, "recipe_name": recipe_type}
    ).fetchall()

    # Iterate over ingredient inputs for the given part
    for row in ingredients:
        ingredient_recipe = row.recipe_name
        ingredient_input = row.ingredient
        source_level = row.source_level
        ingredient_demand_pm = row.ingredient_demand_pm
        part_supply_pm = row.part_supply_pm
        ingredient_demand_quantity = row.ingredient_demand_quantity or 0
        part_supply_quantity = row.part_supply_quantity
        child_required_quantity = parent_total_quantity * ingredient_demand_quantity
        child_required_rate = parent_required_rate * ingredient_demand_quantity
        byproduct = row.byproduct
        byproduct_supply_pm = row.byproduct_supply_pm
        byproduct_supply_quantity = row.byproduct_supply_quantity
        child_timeframe = (child_required_quantity / child_required_rate
                        if child_required_rate else 0)

        # Skip parts with source_level == -2 or 11
        if source_level == -2 or source_level == 11:
            continue
        
        
        # Look up the part_id for the ingredient_input and the machine it is produced in
        ingredient_input_id = db.session.execute(
            text("SELECT id FROM part WHERE part_name = :ingredient_input"),
            {"ingredient_input": ingredient_input}
        ).scalar()

        if not ingredient_input_id:
            #logging.error("Part ID not found for ingredient input ", ingredient_input)
            continue

        # Lookup the selected recipe for this ingredient from user_selected_recipe
        selected_recipe_query = """
            SELECT r.recipe_name
            FROM user_selected_recipe usr
            JOIN recipe r ON usr.recipe_id = r.id
            WHERE usr.user_id = :user_id AND usr.part_id = :part_id
        """
        selected_recipe = db.session.execute(
            text(selected_recipe_query),
            {"user_id": current_user.id, "part_id": ingredient_input_id}
        ).scalar()

        # Use the selected recipe or default to the ingredient_recipe (from part_data)
        final_recipe = selected_recipe if selected_recipe else ingredient_recipe

        # Query the part_supply_pm for the ingredient_input_id and final_recipe
        child_supply_pm = db.session.execute(
            text("SELECT part_supply_pm FROM recipe WHERE part_id = :part_id AND recipe_name = :recipe_name"),
            {"part_id": ingredient_input_id, "recipe_name": final_recipe}
        ).scalar()

        # Query the part_supply_pm for the ingredient_input_id and final_recipe
        child_supply_quantity = db.session.execute(
            text("SELECT part_supply_pm, part_supply_quantity FROM recipe WHERE part_id = :part_id AND recipe_name = :recipe_name"),
            {"part_id": ingredient_input_id, "recipe_name": final_recipe}
        ).scalar()
        
        child_machines = (child_required_rate / child_supply_pm
                        if child_supply_pm else 0)
        
        # Query the machine that produces the ingredient_input_id and final_recipe
        ingredient_production_machine = db.session.execute(
            text("SELECT produced_in_automated FROM recipe WHERE part_id = :ingredient_part_id AND recipe_name = :recipe_name"),
            {"ingredient_part_id": ingredient_input_id, "recipe_name": final_recipe}
        ).scalar()

        # Recursively call build_tree for each ingredient_input
        subtree = build_tree(
            part_id=ingredient_input_id,
            recipe_name=final_recipe,
            target_quantity=child_required_quantity,
            target_parts_pm=child_required_rate,
            target_timeframe=child_timeframe,
            visited=visited,
            in_recursion=True
        )
        # Attach the ingredient's subtree to the current node
        root_info["Subtree"][ingredient_input] = {
            "Required Quantity": child_required_quantity,
            "Required Parts PM": child_required_rate,
            "Timeframe": child_timeframe,
            "Produced In": ingredient_production_machine,
            "No. of Machines": child_machines,
            "Recipe": final_recipe,
            "Part Supply PM": part_supply_pm,
            "Part Supply Quantity": part_supply_quantity,
            "Ingredient Demand PM": ingredient_demand_pm,
            "Ingredient Demand Quantity": ingredient_demand_quantity,
            "Ingredient Supply PM": child_supply_pm,
            "Ingredient Supply Quantity": child_supply_quantity,            
            "Subtree": subtree.get("Subtree", {}) if isinstance(subtree, dict) else {},
        }
    visited.remove((part_id, recipe_type))
    
    return {root_data.part_name: root_info} if not in_recursion else root_info
