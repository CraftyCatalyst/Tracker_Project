let flask_port = "";

if (process.env.RUN_MODE_LOCATION === 'prod') {
  flask_port = "http://192.168.50.33:5000";
} else {
  flask_port = "http://localhost:5000";
}

export const API_ENDPOINTS = {
  tables: `${flask_port}/api/tables`,  
  table_name: (tableName) => `${flask_port}/api/${tableName}`, // Dynamic endpoint
  part_names: `${flask_port}/api/part_names`,
  alternate_recipe: `${flask_port}/api/alternate_recipe`,
  selected_recipes: `${flask_port}/api/selected_recipes`,
  recipe: `${flask_port}/api/recipe`,
  get_recipe_id: (partId) => `${flask_port}/api/recipe_id/${partId}`,
  build_tree: `${flask_port}/api/build_tree`,
  part: `${flask_port}/api/part`,
  signup: `${flask_port}/signup`,
  login: `${flask_port}/login`,
  logout: `${flask_port}/logout`,
  check_login: `${flask_port}/check_login`,
  userinfo: `${flask_port}/api/user_info`,
  validation: `${flask_port}/api/validation`,
  tracker_data: `${flask_port}/api/tracker_data`,
  tracker_reports: `${flask_port}/api/tracker_reports`,
  add_to_tracker: `${flask_port}/api/tracker_add`,  
  log: `${flask_port}/api/log`,
  upload_sav: `${flask_port}/upload_sav`,
  user_save: `${flask_port}/user_save`,
  processing_status: `${flask_port}/processing_status`,
  };
