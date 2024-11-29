from . import db
from flask_login import UserMixin
from . import login_manager

class User(db.Model, UserMixin):
    __tablename__ = 'user'  # Explicit table name
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False, unique=True)
    email = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)

class Parts(db.Model):
    __tablename__ = 'parts'
    id = db.Column(db.Integer, primary_key=True)
    part_name = db.Column(db.String(200), nullable=False)
    level = db.Column(db.Integer)
    category = db.Column(db.String(100))
    base_production_type = db.Column(db.String(100))
    produced_in_automated = db.Column(db.String(100))
    produced_in_manual = db.Column(db.String(100))
    production_type = db.Column(db.String(100))

class Recipes(db.Model):
    __tablename__ = 'recipes'
    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey('parts.id'), nullable=False)
    recipe_name = db.Column(db.String(200), nullable=False)
    ingredient_count = db.Column(db.Integer)
    source_level = db.Column(db.Integer)
    base_input = db.Column(db.String(100))
    base_demand_pm = db.Column(db.Float)
    base_supply_pm = db.Column(db.Float)
    byproduct = db.Column(db.String(100))
    byproduct_supply_pm = db.Column(db.Float)

class Alternate_Recipes(db.Model):
    __tablename__ = 'alternate_recipes'
    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey('parts.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    selected = db.Column(db.Boolean, default=False)

class Miner_Type(db.Model):
    __tablename__ = 'miner_type' 
    id = db.Column(db.Integer, primary_key=True)
    miner_type = db.Column(db.String(100), nullable=False)

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
    miner_type_id = db.Column(db.Integer, db.ForeignKey('miner_type.id'), nullable=False)
    base_supply_pm = db.Column(db.Float)                                                    

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

