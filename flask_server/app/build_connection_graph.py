from flask import jsonify
from collections import defaultdict
from .logging_util import setup_logger
from . import db
from .models import User_Save_Pipes, User_Connection_Data, User_Pipe_Data
from sqlalchemy import text
import json
import re

logger = setup_logger("build_connection_graph")
progress = ""  # Debugging variable
visited = None

def build_connection_graph(connection_data):
    """
    Processes the connection data into a machine graph.
    
    Returns:
      - graph: Dictionary mapping machines to their connected machines.
      - machine_types: Dictionary categorizing machines.
    """
    graph = defaultdict(list)  # Maps machines to outputs
    machine_types = {}  # Classify machines

    # Step 1: Build connection lookup table
    conveyor_to_machine = {}  # Maps conveyors to the machine they connect to
    machine_to_conveyor = {}  # Maps machines to their conveyor output
    #connection_direction = {}  # Maps connections to their direction
    
    for row in connection_data:
        machine = row["connection_inventory"]  # Machine that is outputting
        conveyor = row["connected_component"]  # Conveyor belt receiving the output
        target = row["outer_path_name"]  # The next machine in the path
        #direction = row["direction"]  # Direction of the connection
        # Store mappings
        if conveyor:
            conveyor_to_machine[conveyor] = target  # Map conveyor to destination
            #conveyor_to_machine[connection_direction] = direction  # Map direction to conveyor
        if machine:
            machine_to_conveyor[machine] = conveyor  # Map machine to its output conveyor
           # machine_to_conveyor[connection_direction] = direction  # Map direction to machine
    
    # logger.info(f"✅ Step 1: Successfully completed Step 1: Build connection lookup table")

    # Step 2: Link Machines Together
    for machine, conveyor in machine_to_conveyor.items():
        if conveyor in conveyor_to_machine:  # Conveyor leads to another machine
            destination = conveyor_to_machine[conveyor]
            graph[machine].append(destination)
    # logger.info(f"✅ Step 2: Successfully completed Step 2: Linked Machines Together")
    return graph

def detect_cycles(graph):
    """Detects cycles in the graph."""
    visited = set()
    stack = set()

    def visit(node):
        if node in stack:
            return True  # Cycle detected
        if node in visited:
            return False
        
        visited.add(node)
        stack.add(node)
        for neighbor in graph.get(node, []):
            if visit(neighbor):
                return True
        stack.remove(node)
        return False

    return any(visit(node) for node in graph)

def build_factory_graph(user_id, visited=None):
    """Builds a factory graph by navigating the machine connections step by step."""
    try:
        graph, metadata_map = {}, {}

        # 🔹 Step 1: Get all starting points (machines with no input OR machines with pipe inputs and conveyor outputs)
        start_query = text("""
            SELECT output_inventory 
            FROM user_save
            WHERE user_id = 1 
            AND output_inventory REGEXP 'Miner|Blender|Converter|Packager|Encoder';                           
        """)
        # Old query SELECT output_inventory FROM user_save WHERE input_inventory IS NULL AND user_id = :user_id

        start_points = db.session.execute(start_query, {"user_id": user_id}).fetchall()
        progress = f"Step 1 Query: {start_query}, Start Points: {start_points}"
        
        # 🔹 Step 2: Fetch machine metadata
        metadata_query = text("""
            SELECT us.output_inventory, m.machine_name, p.part_name AS produced_item, 
                   r.part_supply_pm, cs.supply_pm AS conveyor_speed, i.icon_path AS icon_path
            FROM user_save us
            JOIN machine m ON us.machine_id = m.id
            JOIN recipe r ON us.recipe_id = r.id
            JOIN part p ON r.part_id = p.id
            LEFT JOIN user_save_connections usc ON us.output_inventory = usc.connection_inventory
            LEFT JOIN conveyor_supply cs ON usc.conveyor_speed = cs.supply_pm
            LEFT JOIN icon i ON m.icon_id = i.id
            WHERE us.user_id = :user_id
        """)

        metadata_results = db.session.execute(metadata_query, {"user_id": user_id}).fetchall()
        for row in metadata_results:
            metadata_map[row.output_inventory] = {
                "machine_name": row.machine_name,
                "produced_item": row.produced_item,
                "conveyor_speed": row.conveyor_speed,
                "icon_path": row.icon_path,
            }
        progress = f"Step 2 Query: {metadata_query}, Metadata Results: {metadata_results}"
        # 🔹 Step 3: Build the conveyor connections
        for start in start_points:
            machine = start.output_inventory
            graph[machine] = []
            if visited is None:
                visited = set()
            # 🔹 Steps 4 & 5 Connect the sources and targets until you find the last machine
            traverse_factory_graph(machine, graph, user_id, visited)  # Recursively build graph
        
        logger.info(f"✅ Successfully built factory graph")
        progress = f"Step 3, 4, 5: Successfully built factory graph"


        # 🔹 Step 6: Integrate pipes into the graph
        # pipes = User_Save_Pipes.query.filter_by(user_id=user_id).all()
        
        # # logger.debug(f"🔍 Total pipes: {len(pipes)}")
        
        # for pipe in pipes:
        #     pipe_id = pipe.instance_name
        #     fluid_type = pipe.fluid_type
        #     connected_components = json.loads(pipe.connection_points)
            
        #     # ✅ Add pipe as a node
        #     if pipe_id not in graph:
        #         graph[pipe_id] = []

        #     # ✅ Create links to all connected machines/pipes
        #     for conn in connected_components:
        #         if conn not in graph:
        #             graph[conn] = []  # Initialize node if missing
        #         graph[pipe_id].append(conn)  # Link pipe to component
        #         graph[pipe_id].append(fluid_type)  # Add fluid type as a label

        # progress = f"Step 6: Successfully integrated pipes into the graph"

        # 🔹 Step 7: Save the Processed User Connection Data
        save_user_connection_data(graph, metadata_map, user_id)  # Save processed data 
        process_pipe_network(user_id)  # Process pipe network       
        progress = f"Step 7: Successfully saved processed user conveyor and pipe data"
        logger.info(f"✅ Successfully saved processed user conveyor and pipe data")


        return graph, metadata_map

    except Exception as e:
        logger.error(f"❌ Error building full factory graph. Progress: {progress} Error: {e}")
        return jsonify({"error": "Failed to build factory graph"}), 500

def traverse_factory_graph(current_machine, graph, user_id, visited):
    """Recursively finds machines linked through conveyors."""
    
    try:
        # 🔹 Step 4: Get the first conveyor connected to this machine
        conveyor_query = text("""
            SELECT connected_component, direction FROM user_save_connections
            WHERE connection_inventory = :machine AND user_id = :user_id
        """)
        conveyors = db.session.execute(conveyor_query, {"machine": current_machine, "user_id": user_id}).fetchall()
        progress = f"Step 4 Conveyors: {conveyor_query}, {conveyors} for machine: {current_machine}"
        # logger.debug(f"-- Step 4 Querying for conveyors: found: {conveyors} for machine: {current_machine}")
        # log_text = f"SELECT connected_component, direction FROM user_save_connections WHERE connection_inventory = '{current_machine}' AND user_id = {user_id};\n/*RESULT\n\n*/"
        # logger.debug(log_text)
        
        
        if not conveyors:
            # 🔹 Step 4.5: Check if connected to a merger before skipping.
            conveyor_query = text("""
                SELECT connected_component, direction FROM user_save_connections
                WHERE outer_path_name = :machine AND direction LIKE 'input%' AND user_id = :user_id
   """)
            conveyors = db.session.execute(conveyor_query, {"machine": current_machine, "user_id": user_id}).fetchall()
            progress = f"Step 4 Conveyors: {conveyor_query}, {conveyors} for machine: {current_machine}"
            # logger.debug(f"-- Step 4.5 Querying for merger: found: {conveyors} for machine: {current_machine}")
            # log_text = f"SELECT connected_component, direction FROM user_save_connections WHERE outer_path_name = '{current_machine}' AND direction LIKE 'input%' AND user_id = {user_id};\n/*RESULT\n\n*/"
            # logger.debug(log_text)
            
            
            #return graph  # If no conveyors, stop recursion

        for conveyor in conveyors:
            conveyor_belt = conveyor.connected_component
            source_direction = conveyor.direction
            progress = f"Step 4 iterating through conveyor belts: {conveyor_belt}, {source_direction}"
            
            # logger.debug(f"🔍 Adding connection to graph: {current_machine} -> {conveyor_belt} ({source_direction})")
            if visited and conveyor_belt in visited:
                continue  # Skip if already visited
            
            if conveyor_belt not in graph:
                graph[conveyor_belt] = []  # Initialize if not present
            #graph[current_machine].append(conveyor_belt)  # Add conveyor to graph
            graph[current_machine].append({
                "target": conveyor_belt if conveyor_belt is not None else "Unused",
                "direction": source_direction if source_direction is not None else "Unused"
            })
            visited.add(conveyor_belt) 
            # graph[conveyor_belt].append(conveyor_belt)

            progress = f"Step 4 Finished adding conveyors to graph: {graph}"

            # 🔹 Step 5: Find the next machine (destination of the conveyor)
            next_machine_query = text("""
                SELECT connected_component, direction FROM user_save_connections
                WHERE outer_path_name = :conveyor AND direction LIKE 'input%' AND user_id = :user_id
            """)
            next_machines = db.session.execute(next_machine_query, {"conveyor": conveyor_belt, "user_id": user_id}).fetchall()
            progress = f"Step 5 Query: {next_machine_query}, Conveyor: {conveyor_belt}, User: {user_id}"
            # logger.debug(f"-- Step 5 Querying for next machines: found: {conveyor_belt}, User: {user_id}")
            # log_text = f"SELECT connected_component, direction FROM user_save_connections WHERE outer_path_name = '{conveyor_belt}' AND direction LIKE 'input%' AND user_id = {user_id};\n/*RESULT\n\n*/"
            # logger.debug(log_text)

            if not next_machines:
                next_machine_query = text("""
                SELECT connected_component, direction FROM user_save_connections
                WHERE outer_path_name = :conveyor AND direction LIKE 'conveyor%' AND user_id = :user_id
            """)
                next_machines = db.session.execute(next_machine_query, {"conveyor": conveyor_belt, "user_id": user_id}).fetchall()
                progress = f"No input found, checking for conveyors Query: {next_machine_query}, Conveyor: {conveyor_belt}, User: {user_id}"
                # logger.debug(f"-- Step 5.5 No input found, checking for conveyors. found: {conveyor_belt}, User: {user_id}")
                # log_text = f"SELECT connected_component, direction FROM user_save_connections WHERE outer_path_name = '{conveyor_belt}' AND direction LIKE 'conveyor%' AND user_id = {user_id};\n/*RESULT\n\n*/"
                # logger.debug(log_text)

            if not next_machines:
                # logger.warning(f"⚠️ Conveyor {conveyor_belt} does not lead to another machine.")
                continue  # Skip if no next machines or conveyor does not lead to another machine.
            progress = f"Step 5 Query Result: {next_machines}"
            
            for next_machine in next_machines:
                progress = f"Step 5 iterating through next machines: {next_machine}"
                machine_target = next_machine.connected_component
                target_direction = next_machine.direction
                
                # logger.debug(f"🔍 Adding target to graph: {conveyor_belt} -> {machine_target} ({target_direction})")

                if not machine_target:
                    logger.error(f"❌ Unexpected NULL target for {conveyor_belt}")
                    continue  # Skip broken connections

                if machine_target not in graph:
                    graph[machine_target] = []  # Initialize node
                    
                graph[conveyor_belt].append({
                    "target": machine_target if machine_target is not None else "Unused",
                    "direction": target_direction if target_direction is not None else "Unused"
                })

                
                traverse_factory_graph(machine_target, graph, user_id, visited)  # Continue traversing        
        return graph
    except Exception as e:
        logger.error(f"❌ Error traversing factory graph: e: {e}, Progress: {progress}, Current Machine: {current_machine}")
        return graph  # Return whatever was built so far

def format_graph_for_frontend(graph, metadata):
    """Converts the Python dictionary graph into an array-based format for React with metadata."""
    ## replace with save_user_connection_data function - commenting out for now
    nodes = []
    links = []

    # for node_id in graph.keys():
    #     if node_id:
    #         clean_component, clean_level, clean_ref_id = clean_name(node_id)
    #         node_data = {
    #             "id": node_id,
    #             "label": metadata.get(node_id, {}).get("machine_name", node_id),  # Machine name if available
    #             "produced_item": metadata.get(node_id, {}).get("produced_item", metadata.get(node_id, {}).get("fluid_type", "Unknown")),
    #             "icon_path": metadata.get(node_id, {}).get("icon_path", None),
    #             "component": clean_component,
    #             "level": clean_level,
    #             "reference_id": clean_ref_id,                
    #         }
    #         nodes.append(node_data)
    
    # for src, targets in graph.items():
    #     for tgt in targets:
    #         if tgt:
    #             src_clean, src_level, src_ref = clean_name(src)
    #             tgt_clean, tgt_level, tgt_ref = clean_name(tgt)


    #             link_type = "pipe" if "Pipe" in src else "conveyor"
    #             links.append({
    #                 "source": src,
    #                 "source_component": src_clean,
    #                 "source_level": src_level,
    #                 "source_reference_id": src_ref,
    #                 "target": tgt,
    #                 "target_component": tgt_clean,
    #                 "target_level": tgt_level,
    #                 "target_reference_id": tgt_ref,
    #                 "direction": tgt.get("direction", src.get("direction", None)),
    #                 "type": link_type,
    #                 "label": "Fluid" if link_type == "pipe" else "Conveyor",
    #                 "produced_item": metadata.get(src, {}).get("produced_item", None),
    #                 "conveyor_speed": metadata.get(src, {}).get("conveyor_speed", None),
    #             })

    return {"nodes": nodes, "links": links}

def clean_name(raw_name):
    """
    Cleans and extracts key components from a machine name.
    Example: 'Persistent_Level:PersistentLevel.Build_MinerMk1_C_2147443909'
    Returns: ('Miner', 'Mk1', '2147443909')
    """
    # Remove everything before the second underscore
    match = re.search(r"([A-Za-z]+)(Mk\d*|MK\d*)?_C_(\d+)", raw_name)


    if match:
        component = match.group(1)  # Machine/Conveyor Type
        level = match.group(2) if match.group(2) else "N/A"  # Mk level or 'N/A' if missing
        reference_id = match.group(3)  # Reference number at the end
        return component, level, reference_id

    return raw_name, "N/A", "N/A"  # Default values if no match is found

def save_user_connection_data(graph, metadata_map, user_id):
    """Saves the processed connection data into the database."""
    try:
        connection_entries = []
        
        # logger.debug(f"🔍 About to process {len(graph)} connections for user {user_id}")
        # logger.debug("**************************Graph**************************")
        # logger.debug(graph)
        # logger.debug("**************************End of Graph**************************")
        
        for src, targets in graph.items():
            
            # logger.debug(f"🔍 Processing connections for source: {src} targets {targets} in graph.items {graph.items}")
            
            for tgt in targets:
                if tgt:
                    target_component = tgt.get("target", tgt) if isinstance(tgt, dict) else tgt
                    target_direction = tgt.get("direction", None) if isinstance(tgt, dict) else None

                    
                    src_clean, src_level, src_ref = clean_name(src)                    
                    tgt_clean, tgt_level, tgt_ref = clean_name(target_component)
                    
                    
                    connection_entries.append(User_Connection_Data(
                        user_id=user_id,
                        source_component=src_clean,
                        source_level=src_level,
                        source_reference_id=src_ref,
                        target_component=tgt_clean,
                        target_level=tgt_level,
                        target_reference_id=tgt_ref,
                        direction=target_direction,
                        connection_type="Conveyor Network",
                        produced_item=metadata_map.get(src, {}).get("produced_item", None),
                        conveyor_speed=metadata_map.get(src, {}).get("conveyor_speed", None)
                    ))

        # Bulk insert processed data
        # logger.debug(f"📥 About to save {len(connection_entries)} processed connections in user_connection_data")
        
        db.session.bulk_save_objects(connection_entries)
        
        # logger.debug(f"📥 Successfully bulk saved processed connections in user_connection_data")
        
        db.session.commit()
        
        logger.info(f"✅ Stored {len(connection_entries)} processed connections in user_connection_data")
        return True
    except Exception as e:
        logger.error(f"❌ Error saving user connection data: error: {e} connection entries: {connection_entries}")
        return False
    
def clean_fluid_type(fluid_path):
    """Extracts a readable fluid name from the file path and removes 'Desc'."""
    if not fluid_path:
        return "Unknown"
    match = re.search(r"Desc_?([A-Za-z0-9]+)", fluid_path)
    return match.group(1).replace("_", " ") if match else fluid_path


def clean_instance_name(instance_name):
    """Extracts a readable instance name from the file path."""
    """Takes in the following format: Persistent_Level:PersistentLevel.FGPipeNetwork_2147456253"""
    """ Returns: PipeNetwork_2147456253"""

    if not instance_name:
        return "Unknown"
    match = re.search(r"Persistent_Level:PersistentLevel\.FG([A-Za-z0-9_]+)", instance_name)
    return match.group(1) if match else instance_name

def process_pipe_network(user_id):
    """Processes pipes into a Source → Target format for visualization."""
    try:
        query = text("""
            SELECT id, instance_name, fluid_type, connection_points 
            FROM user_save_pipes WHERE user_id = :user_id
        """)
        pipe_networks = db.session.execute(query, {"user_id": user_id}).fetchall()

        if not pipe_networks:
            logger.warning(f"⚠️ No pipes found for user {user_id}")
            return

        processed_pipes = []
        
        for pipe in pipe_networks:
            instance_name = clean_instance_name(pipe.instance_name)
            fluid_type = clean_fluid_type(pipe.fluid_type)
            connection_points = json.loads(pipe.connection_points) if pipe.connection_points else []

            # Convert connection points into Source → Target links
            for i in range(len(connection_points) - 1):
                source = connection_points[i]
                target = connection_points[i + 1]

                # Extract names, levels, and IDs
                src_clean, src_level, src_ref = clean_name(source)
                tgt_clean, tgt_level, tgt_ref = clean_name(target)

                # Fetch pipeline flow rate if available
                flow_rate_query = text("""
                    SELECT ps.supply_pm 
                    FROM pipeline_supply ps
                    JOIN pipeline_level pl ON ps.pipeline_level_id = pl.id
                    WHERE pl.pipeline_level = :pipeline_level
                """)
                flow_rate_result = db.session.execute(flow_rate_query, {"pipeline_level": src_level}).fetchone()
                pipe_flow_rate = flow_rate_result.supply_pm if flow_rate_result else None

                processed_pipes.append(User_Pipe_Data(
                        user_id=user_id,
                        pipe_network=instance_name,
                        source_component=src_clean,
                        source_level=src_level,
                        source_reference_id=src_ref,
                        target_component=tgt_clean,
                        target_level=tgt_level,
                        target_reference_id=tgt_ref,
                        connection_type="Pipe Network",
                        produced_item=fluid_type,
                        pipe_flow_rate=pipe_flow_rate                        
                    ))        

        db.session.bulk_save_objects(processed_pipes)
        db.session.commit()
        logger.info(f"✅ Processed and saved {len(processed_pipes)} pipe connections for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"❌ Error saving user pipe data: {e}. First 5 entries: {repr(processed_pipes[:5])}")
        return False

    
    #         # Create formatted pipe entry
        #         processed_pipes.append({
        #             "user_id": user_id,
        #             "pipe_network": instance_name,
        #             "source_component": src_clean,
        #             "source_level": src_level,
        #             "source_reference_id": src_ref,
        #             "target_component": tgt_clean,
        #             "target_level": tgt_level,
        #             "target_reference_id": tgt_ref,
        #             "connection_type": "Pipe Network",
        #             "produced_item": fluid_type,
        #             "pipe_flow_rate": pipe_flow_rate
        #         })

        # # Insert processed pipes into user_pipe_data
        # insert_query = text("""
        #     INSERT INTO user_pipe_data (user_id, pipe_network, source_component, source_level, source_reference_id, 
        #                                 target_component, target_level, target_reference_id, 
        #                                 connection_type, produced_item, pipe_flow_rate)
        #     VALUES (:user_id, :pipe_network, :source_component, :source_level, :source_reference_id, 
        #             :target_component, :target_level, :target_reference_id, 
        #             :connection_type, :produced_item, :pipe_flow_rate)
        # """)
        
        # db.session.execute(insert_query, processed_pipes)
        # db.session.commit()    
    
    # except Exception as e:
    #     logger.error(f"❌ Error processing pipe network: {e}")
    #     db.session.rollback()