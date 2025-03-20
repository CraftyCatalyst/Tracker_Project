# Description: This file contains the database models for the application.
# The models are used to define the structure of the database tables.
# FLASK DB COMMANDS
# cd flask_server
# flask db stamp head # Set the current revision to the most recent revision
# flask db migrate -m "your description" # Create a new migration
# flask db upgrade # Upgrade the database to the latest migration.


from . import db
from flask_login import UserMixin
from . import login_manager

class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False, unique=True)
    email = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(100), nullable=False, default='user')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    must_change_password = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f"User('{self.username}', '{self.email}', '{self.role}')"
    
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class Part(db.Model):
    __tablename__ = 'part'
    id = db.Column(db.Integer, primary_key=True)
    part_name = db.Column(db.String(200), nullable=False)
    level = db.Column(db.Integer)
    category = db.Column(db.String(100))
    icon_id = db.Column(db.Integer, db.ForeignKey('icon.id'), nullable=True, default=1)
    icon = db.relationship("Icon", backref="part")
    __table_args__ = (
        db.Index('idx_part_icon', 'icon_id'),
    )
    

class Recipe(db.Model):
    __tablename__ = 'recipe'
    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=False)
    recipe_name = db.Column(db.String(200), nullable=False)
    ingredient_count = db.Column(db.Integer)
    source_level = db.Column(db.Integer)
    base_production_type = db.Column(db.String(100))
    produced_in_automated = db.Column(db.String(100))
    produced_in_manual = db.Column(db.String(100))
    base_input_part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=True)
    base_input = db.Column(db.String(100))
    base_demand_pm = db.Column(db.Float)
    base_supply_pm = db.Column(db.Float)
    byproduct = db.Column(db.String(100))
    byproduct_supply_pm = db.Column(db.Float)

class Alternate_Recipe(db.Model):
    __tablename__ = 'alternate_recipe'
    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    selected = db.Column(db.Boolean, default=False)

class Machine_Level(db.Model):
    __tablename__ = 'machine_level' 
    id = db.Column(db.Integer, primary_key=True)
    machine_level = db.Column(db.String(100), nullable=False)
    

class Node_Purity(db.Model):
    __tablename__ = 'node_purity'
    id = db.Column(db.Integer, primary_key=True)
    node_purity = db.Column(db.String(100), nullable=False)

class Power_Shards(db.Model):
    __tablename__ = 'power_shards'
    id = db.Column(db.Integer, primary_key=True)
    quantity = db.Column(db.Integer, nullable=False)
    output_increase = db.Column(db.Float)

class Miner_Supply(db.Model):
    __tablename__ = 'miner_supply' 
    id = db.Column(db.Integer, primary_key=True)
    node_purity_id = db.Column(db.Integer, db.ForeignKey('node_purity.id'), nullable=False)
    machine_level_id = db.Column(db.Integer, db.ForeignKey('machine_level.id'), nullable=False)
    base_supply_pm = db.Column(db.Float)                                                    

class Data_Validation(db.Model):
    __tablename__ = 'data_validation'
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(100), nullable=False)
    column_name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(100), nullable=True)
    description = db.Column(db.String(200), nullable=True)

class Tracker(db.Model):
    __tablename__ = 'tracker'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    target_quantity = db.Column(db.Float, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    __table_args__ = (
        db.UniqueConstraint('user_id', 'part_id', 'recipe_id', name='unique_user_part_recipe'),
    )

class UserSelectedRecipe(db.Model):
    __tablename__ = 'user_selected_recipe'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    __table_args__ = (
        db.UniqueConstraint('user_id', 'part_id', 'recipe_id', name='unique_user_part_recipe'),
    )

class User_Save(db.Model):
    __tablename__ = 'user_save'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=True)
    resource_node_id = db.Column(db.Integer, db.ForeignKey('resource_node.id'), nullable=True)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)
    machine_power_modifier = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    sav_file_name = db.Column(db.String(200), nullable=False)
    current_progress = db.Column(db.Float, nullable=True)  # 0.0 to 1.0 progress of production
    input_inventory = db.Column(db.String(300), nullable=True)  # Input inventory reference
    output_inventory = db.Column(db.String(300), nullable=True)  # Output inventory reference
    time_since_last_change = db.Column(db.Float, nullable=True)  # Time since last start/stop
    production_duration = db.Column(db.Float, nullable=True)  # Time taken to produce item
    productivity_measurement_duration = db.Column(db.Float, nullable=True)  # Measurement duration
    productivity_monitor_enabled = db.Column(db.Boolean)  # Whether monitoring is enabled
    is_producing = db.Column(db.Boolean)  # Whether the machine is actively producing
	
class Machine(db.Model):
    __tablename__ = 'machine'
    id = db.Column(db.Integer, primary_key=True)
    machine_name = db.Column(db.String(200), nullable=False)
    machine_level_id = db.Column(db.Integer, db.ForeignKey('machine_level.id'), nullable=True)
    save_file_class_name = db.Column(db.String(200), nullable=False)
    icon_id = db.Column(db.Integer, db.ForeignKey('icon.id'), nullable=True, default=1)
    icon = db.relationship("Icon", backref="machine") 
    __table_args__ = (
     db.Index('idx_save_file_class_name', 'save_file_class_name'),
     db.Index('idx_machine_icon', 'icon_id'),
    )
    
	
class Resource_Node(db.Model):
    __tablename__ = 'resource_node'
    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=False)
    node_purity_id = db.Column(db.Integer, db.ForeignKey('node_purity.id'), nullable=False)
    save_file_path_name = db.Column(db.String(200), nullable=False, unique=True)
    __table_args__ = (
        db.Index('idx_save_file_path_name', 'save_file_path_name'),
    )
    
class Recipe_Mapping(db.Model):
    __tablename__ = 'recipe_mapping'
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    save_file_recipe = db.Column(db.String(200), nullable=False, unique=True)

class UserSettings(db.Model):
    __tablename__ = 'user_settings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(200), nullable=False)
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    __table_args__ = (
        db.UniqueConstraint('user_id', 'category', 'key', name='unique_user_setting'),
    )

class Conveyor_Level(db.Model):
    __tablename__ = 'conveyor_level'
    id = db.Column(db.Integer, primary_key=True)
    conveyor_level = db.Column(db.String(10), nullable=False)
    icon_id = db.Column(db.Integer, db.ForeignKey('icon.id'), nullable=True, default=1)
    icon = db.relationship("Icon", backref="conveyor_level")
    __table_args__ = (
        db.Index('idx_conveyor_level_icon', 'icon_id'),
    )

class Conveyor_Supply(db.Model):
    __tablename__ = 'conveyor_supply'
    id = db.Column(db.Integer, primary_key=True)
    conveyor_level_id = db.Column(db.Integer, db.ForeignKey('conveyor_level.id'), nullable=False)
    supply_pm = db.Column(db.Float, nullable=False)

class Pipeline_Level(db.Model):
    __tablename__ = 'pipeline_level'
    id = db.Column(db.Integer, primary_key=True)
    pipeline_level = db.Column(db.String(10), nullable=False)
    icon_id = db.Column(db.Integer, db.ForeignKey('icon.id'), nullable=True, default=1)
    icon = db.relationship("Icon", backref="pipeline_level")
    __table_args__ = (
        db.Index('idx_pipeline_level_icon', 'icon_id'),
    )

class Pipeline_Supply(db.Model):
    __tablename__ = 'pipeline_supply'
    id = db.Column(db.Integer, primary_key=True)
    pipeline_level_id = db.Column(db.Integer, db.ForeignKey('pipeline_level.id'), nullable=False)
    supply_pm = db.Column(db.Float, nullable=False)

class User_Save_Connections(db.Model):
    __tablename__ = 'user_save_connections'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    outer_path_name = db.Column(db.String(300), nullable=True)
    connected_component = db.Column(db.String(300), nullable=True)
    connection_inventory = db.Column(db.String(300), nullable=True)
    direction = db.Column(db.String(300), nullable=True)
    conveyor_speed = db.Column(db.Float, nullable=True)

class User_Save_Conveyors(db.Model):
    __tablename__ = 'user_save_conveyors'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    conveyor_first_belt = db.Column(db.String(300), nullable=True)
    conveyor_last_belt = db.Column(db.String(300), nullable=True)

class Icon(db.Model):
    __tablename__ = 'icon'
    id = db.Column(db.Integer, primary_key=True)
    icon_category = db.Column(db.String(50), nullable=False)
    icon_name = db.Column(db.String(100), nullable=False, unique=True)
    icon_path = db.Column(db.String(255), nullable=False)
    __table_args__ = (
        db.Index('idx_icon_id', 'id'),
    )
    

class Splitter(db.Model):
    __tablename__ = 'splitter'
    id = db.Column(db.Integer, primary_key=True)
    splitter_name = db.Column(db.String(100), nullable=False)
    icon_id = db.Column(db.Integer, db.ForeignKey('icon.id'), nullable=True, default=1)
    icon = db.relationship("Icon", backref="splitter")
    __table_args__ = (
        db.Index('idx_splitter_icon', 'icon_id'),
    )


class Storage(db.Model):
    __tablename__ = 'storage'
    id = db.Column(db.Integer, primary_key=True)
    storage_name = db.Column(db.String(100), nullable=False)
    icon_id = db.Column(db.Integer, db.ForeignKey('icon.id'), nullable=True, default=1)
    icon = db.relationship("Icon", backref="storage")
    __table_args__ = (
        db.Index('idx_storage_icon', 'icon_id'),
    )

class User_Save_Pipes(db.Model):
    __tablename__ = 'user_save_pipes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    instance_name = db.Column(db.String(300), nullable=False)  # Unique pipe network identifier
    fluid_type = db.Column(db.String(300), nullable=True)  # Type of fluid
    connection_points = db.Column(db.Text, nullable=True)  # JSON list of connections

class Project_Assembly_Phases(db.Model):
    __tablename__ = 'project_assembly_phases'
    id = db.Column(db.Integer, primary_key=True)
    phase_name = db.Column(db.String(100), nullable=False)
    phase_description = db.Column(db.String(200), nullable=True)       

class Project_Assembly_Parts(db.Model):
    __tablename__ = 'project_assembly_parts'
    id = db.Column(db.Integer, primary_key=True)
    phase_id = db.Column(db.Integer, db.ForeignKey('project_assembly_phases.id'), nullable=False)
    phase_part_id = db.Column(db.Integer, db.ForeignKey('part.id'), nullable=False)
    phase_part_quantity = db.Column(db.Float, nullable=False)
    

class User_Connection_Data(db.Model):
    __tablename__ = 'user_connection_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    source_component = db.Column(db.String(300), nullable=False)  # Machine, conveyor or pipe name
    source_level = db.Column(db.String(50), nullable=True)  # Mk level if applicable
    source_reference_id = db.Column(db.String(100), nullable=True)
    target_component = db.Column(db.String(300), nullable=False)  # Connected machine, conveyor or pipe name
    target_level = db.Column(db.String(50), nullable=True)
    target_reference_id = db.Column(db.String(100), nullable=True)
    connection_type = db.Column(db.String(50), nullable=False)  # "Pipe" or "Conveyor"
    produced_item = db.Column(db.String(200), nullable=True)  # Item being transported
    conveyor_speed = db.Column(db.Float, nullable=True)  # Conveyor belt speed if applicable
    direction = db.Column(db.String(50), nullable=True)  # Direction of the connection
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    __table_args__ = (
        db.Index('idx_user_connection', 'user_id', 'source_component', 'target_component'),        
    )

class User_Pipe_Data(db.Model):
    __tablename__ = 'user_pipe_data'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pipe_network = db.Column(db.String(300), nullable=False)  # Unique pipe network identifier
    source_component = db.Column(db.String(300), nullable=False)  # Machine or pipe name
    source_level = db.Column(db.String(50), nullable=True)  # Mk level if applicable
    source_reference_id = db.Column(db.String(100), nullable=True)
    target_component = db.Column(db.String(300), nullable=False)  # Connected machine or pipe name
    target_level = db.Column(db.String(50), nullable=True) # Mk level if applicable
    target_reference_id = db.Column(db.String(100), nullable=True)
    connection_type = db.Column(db.String(50), nullable=False)  # "Pipe"
    produced_item = db.Column(db.String(200), nullable=True)  # Item being transported
    pipe_flow_rate = db.Column(db.Float, nullable=True)  # pipe flow rate if applicable
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    __table_args__ = (
        db.Index('idx_user_connection', 'user_id', 'source_component', 'target_component'),        
    )

class User_Tester_Registrations(db.Model):
    __tablename__ = 'user_tester_registrations'
    id = db.Column(db.Integer, primary_key=True)
    email_address = db.Column(db.String(200), nullable=False)
    username = db.Column(db.String(150), nullable=False)
    fav_satisfactory_thing = db.Column(db.Text(300), nullable=False)
    reason = db.Column(db.Text(300), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    is_approved = db.Column(db.Boolean, default=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    db.UniqueConstraint('email_address', 'username', name='unique_tester_registration')

class Admin_Settings(db.Model):
    __tablename__ = 'admin_settings'
    id = db.Column(db.Integer, primary_key=True)
    setting_category = db.Column(db.String(100), nullable=False)
    setting_key = db.Column(db.String(100), nullable=False)
    setting_value = db.Column(db.String(150), nullable=False)
    __table_args__ = (
        db.UniqueConstraint('setting_category', 'setting_key', name='unique_admin_setting'),
    )