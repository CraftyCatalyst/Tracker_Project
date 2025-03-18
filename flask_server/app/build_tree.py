from sqlalchemy import text
from . import db
from flask_login import current_user
from .logging_util import setup_logger
import logging

logger = setup_logger("build_tree")

def build_tree(part_id, recipe_name="_Standard", target_quantity=1, visited=None, in_recursion=False):
    #logger.debug("Building tree for part_id %s, recipe_name %s, target_quantity %s", part_id, recipe_name, target_quantity)
        # Check for user-selected recipe
    # logging.debug("Building tree for part_id %s, recipe_name %s, target_quantity %s", part_id, recipe_name, target_quantity)
    selected_recipe_query = """
        SELECT r.id, r.recipe_name
        FROM user_selected_recipe usr
        JOIN recipe r ON usr.recipe_id = r.id
        WHERE usr.user_id = :user_id AND usr.part_id = :part_id
    """
    selected_recipe = db.session.execute(
        text(selected_recipe_query), {"user_id": current_user.id, "part_id": part_id}
    ).fetchone()

    # logging.debug("Selected Recipe: %s", selected_recipe)

    recipe_type = selected_recipe.recipe_name if selected_recipe else recipe_name
    if visited is None:
        visited = set()
    
    # logging.debug("Visited: %s", visited)

    if (part_id, recipe_type) in visited:
        logging.error("Circular dependency detected for part_id %s with recipe_name %s", part_id, recipe_type)
        return {"Error": f"Circular dependency detected for part_id {part_id} with recipe_name {recipe_type}"}
    

    
    visited.add((part_id, recipe_type))
    # logging.debug("Visited: %s", visited)
    #logger.debug("Visited: %s", visited)
    #tree = {}
    
    root_data = db.session.execute(
            text("""
            SELECT p.part_name, r.base_demand_pm, r.base_supply_pm, r.recipe_name, r.produced_in_automated
            FROM part p
            JOIN recipe r ON p.id = r.part_id
            WHERE p.id = :part_id AND r.recipe_name = :recipe_name
            """),
            {"part_id": part_id, "recipe_name": recipe_type}
        ).fetchone()

    # logging.debug("Root Data: %s", root_data)
    if not root_data:
            logging.error("Part ID %s with recipe type %s not found.", part_id, recipe_type)
            visited.remove((part_id, recipe_type))
            return {"Error": f"Part ID {part_id} with recipe type {recipe_type} not found."}
    
    # Create the root or current node
    root_info = {
        "Required Quantity": target_quantity,
        "Produced In": root_data.produced_in_automated,
        "No. of Machines": target_quantity / (root_data.base_supply_pm or 1),
        "Recipe": recipe_name,
        "Base Supply PM": root_data.base_supply_pm,
        "Subtree": {},  # Initialize empty Subtree
    }
    # logging.debug("Root Info: %s", root_info)

    # Fetch all ingredients for the current recipe
    ingredients = db.session.execute(
        text("""
        SELECT r.base_input, r.source_level, r.base_demand_pm, r.base_supply_pm, r.recipe_name
        FROM recipe r
        WHERE r.part_id = :part_id AND r.recipe_name = :recipe_name
        """),
        {"part_id": part_id, "recipe_name": recipe_type}
    ).fetchall()

    # logging.debug("Ingredients: %s", ingredients)

    # Iterate over ingredient inputs for the given part
    for row in ingredients:        
        # logging.debug("Processing ingredient input: %s", row)
        ingredient_input = row.base_input
        source_level = row.source_level
        ingredient_demand = row.base_demand_pm
        ingredient_supply = row.base_supply_pm
        ingredient_recipe = row.recipe_name
        
        # Calculate required input quantity for this ingredient input based the demand from the parent and the target quantity
        required_quantity = ingredient_demand * target_quantity

        # Look up the part_id for the ingredient_input and the machine it is produced in
        ingredient_input_id = db.session.execute(
            text("SELECT id FROM part WHERE part_name = :ingredient_input"),
            {"ingredient_input": ingredient_input}
        ).scalar()

        if not ingredient_input_id:
            logging.error("Part ID not found for ingredient input %s", ingredient_input)
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
        # logging.debug("Selected Recipe for ingredient input %s: %s", ingredient_input, selected_recipe)
        # Use the selected recipe or default to the ingredient_recipe (from part_data)
        final_recipe = selected_recipe if selected_recipe else ingredient_recipe
        # logging.debug("Final Recipe for ingredient input %s: %s", ingredient_input, final_recipe)
        # Query the base_supply_pm for the ingredient_input_id and final_recipe
        ingredient_supply = db.session.execute(
            text("SELECT base_supply_pm FROM recipe WHERE part_id = :part_id AND recipe_name = :base_recipe"),
            {"part_id": ingredient_input_id, "base_recipe": final_recipe}
        ).scalar()
        # logging.debug("Ingredient Supply for ingredient input %s: %s", ingredient_input, ingredient_supply)
        # Query the machine that produces the ingredient_input_id and final_recipe
        ingredient_production_machine = db.session.execute(
            text("SELECT produced_in_automated FROM recipe WHERE part_id = :base_input_id AND recipe_name = :base_recipe"),
            {"base_input_id": ingredient_input_id, "base_recipe": final_recipe}
        ).scalar()
        # logging.debug("Ingredient Production Machine for ingredient input %s: %s", ingredient_input, ingredient_production_machine)
        # Skip parts with source_level == -2 or 11
        if source_level == -2 or source_level == 11:
            # logging.debug("Skipping ingredient input %s with source_level %s", ingredient_input, source_level)
            continue

        # Calculate the number of machines needed to produce the required amount
        no_of_machines = required_quantity / ingredient_supply if ingredient_supply else 0
        # logging.debug("No. of Machines for ingredient input %s: %s", ingredient_input, no_of_machines)
        # Recursive call for the ingredient's subtree
        ingredient_subtree = build_tree(ingredient_input_id, final_recipe, target_quantity, visited, True)
        # logging.debug("Ingredient Subtree for ingredient input %s: %s", ingredient_input, ingredient_subtree)

        # Attach the ingredient's subtree to the current node
        root_info["Subtree"][ingredient_input] = {
            "Required Quantity": required_quantity,
            "Produced In": ingredient_production_machine,
            "No. of Machines": no_of_machines,
            "Recipe": final_recipe,
            "Base Supply PM": ingredient_supply,
            "Subtree": ingredient_subtree.get("Subtree", {}) if isinstance(ingredient_subtree, dict) else {},
        }
        # logging.debug("Root Info for ingredient input %s: %s", ingredient_input, root_info)
    visited.remove((part_id, recipe_type))
    # logging.debug("root_info: %s root_data: %s", root_info, root_data)
    return {root_data.part_name: root_info} if not in_recursion else root_info
