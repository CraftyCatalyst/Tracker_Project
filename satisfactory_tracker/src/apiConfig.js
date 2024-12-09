const flask_port = "http://localhost:5000";
export const API_ENDPOINTS = {
  tables: `${flask_port}/api/tables`,
  part_names: `${flask_port}/api/part_names`,
  alternate_recipes: `${flask_port}/api/alternate_recipes`,
  recipes: `${flask_port}/api/recipes`,
  build_tree: `${flask_port}/api/build_tree`,
  parts: `${flask_port}/api/parts`
};
