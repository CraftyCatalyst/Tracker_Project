const flask_port = "http://localhost:5000";

export const API_ENDPOINTS = {
  tables: `${flask_port}/api/tables`,
  table_name: (tableName) => `${flask_port}/api/${tableName}`, // Dynamic endpoint
  part_names: `${flask_port}/api/part_names`,
  alternate_recipe: `${flask_port}/api/alternate_recipe`,
  recipe: `${flask_port}/api/recipe`,
  build_tree: `${flask_port}/api/build_tree`,
  part: `${flask_port}/api/part`,
  signup: `${flask_port}/signup`,
  login: `${flask_port}/login`,
  logout: `${flask_port}/logout`,
  userinfo: `${flask_port}/api/user_info`,
  validation: `${flask_port}/api/validation`,
  };
