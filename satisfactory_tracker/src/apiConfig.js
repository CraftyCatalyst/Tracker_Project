import logToBackend from "./services/logService";

let flask_port = "";

console.log("API_CONFIG: process.env.REACT_APP_RUN_MODE is " + process.env.REACT_APP_RUN_MODE);
if (process.env.REACT_APP_RUN_MODE === 'prod') {
  console.log("API_CONFIG: Running in production mode " + process.env.REACT_APP_RUN_MODE);
} else {
  console.log("API_CONFIG: Running in development mode " + process.env.REACT_APP_RUN_MODE);
}


if (process.env.REACT_APP_RUN_MODE === 'prod') {
  flask_port = "https://dev.satisfactorytracker.com";
  // logToBackend("apiConfig.js - Run Mode:" + process.env.REACT_APP_RUN_MODE, "INFO");
} else {
  flask_port = "http://localhost:5000";
}

console.log("API_CONFIG: Flask port is " + flask_port);

export const API_ENDPOINTS = {
  system_status: `${flask_port}/api/get_system_status`,
  tables: `${flask_port}/api/tables`,  
  part_names: `${flask_port}/api/part_names`,
  alternate_recipe: `${flask_port}/api/alternate_recipe`,
  selected_recipes: `${flask_port}/api/selected_recipes`,
  recipe: `${flask_port}/api/recipe`,
  build_tree: `${flask_port}/api/build_tree`,
  part: `${flask_port}/api/part`,
  signup: `${flask_port}/api/signup`,
  login: `${flask_port}/api/login`,
  logout: `${flask_port}/api/logout`,
  check_login: `${flask_port}/api/check_login`,
  userinfo: `${flask_port}/api/user_info`,
  validation: `${flask_port}/api/validation`,
  tracker_data: `${flask_port}/api/tracker_data`,
  tracker_reports: `${flask_port}/api/tracker_reports`,
  add_to_tracker: `${flask_port}/api/tracker_add`,  
  log: `${flask_port}/api/log`,
  upload_sav: `${flask_port}/api/upload_sav`,
  user_save: `${flask_port}/api/user_save`,
  processing_status: `${flask_port}/api/processing_status`,
  user_settings: `${flask_port}/api/user_settings`,
  production_report: `${flask_port}/api/production_report`,
  machine_report: `${flask_port}/api/machine_usage_report`,
  machine_connections: `${flask_port}/api/machine_connections`,
  connection_graph: `${flask_port}/api/connection_graph`,
  machine_metadata: `${flask_port}/api/machine_metadata`,
  pipe_network: `${flask_port}/api/pipe_network`,
  user_connection_data : `${flask_port}/api/user_connection_data`,
  user_pipe_data : `${flask_port}/api/user_pipe_data`,
  tester_registration: `${flask_port}/api/tester_registration`,
  tester_count: `${flask_port}/api/tester_count`,
  tester_requests: `${flask_port}/api/tester_requests`,
  tester_approve: `${flask_port}/api/tester_approve`,
  tester_reject: `${flask_port}/api/tester_reject`,
  change_password: `${flask_port}/api/change_password`,
  github_issue: `${flask_port}/api/github_issue`,
  upload_screenshot: `${flask_port}/api/upload_screenshot`,
  user_activity: `${flask_port}/api/user_activity`,
  active_users: `${flask_port}/api/active_users`,
  get_assembly_phases: `${flask_port}/api/get_assembly_phases`,
  get_all_assembly_phase_details: `${flask_port}/api/get_all_assembly_phase_details`,
  get_recipe_id: (partId) => `${flask_port}/api/recipe_id/${partId}`,
  get_assembly_phase_parts: (phaseId) => `${flask_port}/api/get_assembly_phase_parts/${phaseId}`,
  get_assembly_phase_details: (phaseId) => `${flask_port}/api/get_assembly_phase_details/${phaseId}`,
  user_selected_recipe_check_part: (partId) => `${flask_port}/api/user_selected_recipe_check_part/${partId}`,
  get_admin_setting: (category, key, type) => `${flask_port}/api/get_admin_setting/${category}/${key}/${type}`,
  table_name: (tableName) => `${flask_port}/api/${tableName}`,
};
