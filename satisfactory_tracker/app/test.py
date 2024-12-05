#TODO: If you need dynamic filtering based on user input
from app import db
from sqlalchemy.sql import text

filters = []
params = {}
if user_input_part_name:
    filters.append("part_name = :part_name")
    params["part_name"] = user_input_part_name
if user_input_category:
    filters.append("category = :category")
    params["category"] = user_input_category

where_clause = " AND ".join(filters)
query = text(f"SELECT * FROM parts WHERE {where_clause}")
result = db.session.execute(query, params).fetchall()


