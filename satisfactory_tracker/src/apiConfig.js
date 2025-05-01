let flask_port;


const runMode = process.env.REACT_APP_RUN_MODE;
console.log("API_CONFIG: process.env.REACT_APP_RUN_MODE is " + runMode);

// Use a mapping for clarity and easier management
const baseUrlMap = {
  prod: process.env.REACT_APP_API_BASE_URL_PROD,
  dev: process.env.REACT_APP_API_BASE_URL_DEV,
  qas: process.env.REACT_APP_API_BASE_URL_QAS,
  local: process.env.REACT_APP_API_BASE_URL_LOCAL,
  docker: process.env.REACT_APP_API_BASE_URL_DOCKER
};

// Assign flask_port based on the runMode
flask_port = baseUrlMap[runMode];

// Handle cases where the runMode is not recognized
if (!flask_port) {
  console.log(`API_CONFIG: Unrecognized or missing REACT_APP_RUN_MODE: "${runMode}".`);
  console.log(`API_CONFIG: ERROR: Invalid run mode "${runMode}"`, "ERROR");
  // Option A: Assign a default fallback (e.g., local)
  // flask_port = process.env.REACT_APP_CLIENT_BASE_URL_LOCAL || 'http://localhost:5000'; // Provide a hardcoded default if needed
  // Option B: Throw an error to stop execution if a valid mode is required
  throw new Error(`Invalid or missing REACT_APP_RUN_MODE: "${runMode}"`);
} else {
  // Log only if a valid port was assigned
  console.log("API_CONFIG: Run Mode: " + runMode, "INFO");
  console.log("API_CONFIG: Flask Port: " + flask_port, "INFO");

}
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
  system_resources: `${flask_port}/api/system_resources`,
  get_user_activity: `${flask_port}/api/get_user_activity`,
  functional_tests: `${flask_port}/api/functional_tests`,
  run_page_tests: `${flask_port}/api/run_page_tests`,
  run_api_tests: `${flask_port}/api/run_api_tests`,
  maintenance_mode: `${flask_port}/api/maintenance_mode`,
  admin_settings: `${flask_port}/api/admin_settings`,
  tester_registration_mode: `${flask_port}/api/tester_registration_mode`,
  test_pages: `${flask_port}/api/test_pages`,
  test_apis: `${flask_port}/api/test_apis`,
  system_test_list: `${flask_port}/api/system_test_list`,
  run_system_test: `${flask_port}/api/run_system_test`,
  system_tests: `${flask_port}/api/system_tests`,
  test_render_template: `${flask_port}/api/test_render_template`,
  support_messages: `${flask_port}/api/support_messages`,
  support_reply: `${flask_port}/api/support_reply`,
  save_support_draft: `${flask_port}/api/support_draft`,
  request_password_reset: `${flask_port}/api/request_password_reset`,
  reset_password: `${flask_port}/api/reset_password`,
  verify_email: `${flask_port}/api/verify_email`,
  resend_verification_email: `${flask_port}/api/resend_verification_email`,
  resolve_support_message: (message_id) => `${flask_port}/api/support_message/${message_id}/resolve`,
  get_support_draft: (messageID) => `${flask_port}/api/support_draft/${messageID}`,
  delete_support_draft: (messageID) => `${flask_port}/api/support_draft/${messageID}`,
  support_conversation: (conversationId) => `${flask_port}/api/support_conversation/${conversationId}`,
  support_message: (storageKey) => `${flask_port}/api/support_message/${storageKey}`,
  send_test_email: (recipient) => `${flask_port}/api/send_test_email/${recipient}`,
  send_email: (recipient_email) => `${flask_port}/api/send_email/${recipient_email}`,
  update_must_change_password:(userId) => `${flask_port}/api/update_must_change_password/${userId}`,
  admin_reset_password: (userId) => `${flask_port}/api/reset_user_password/${userId}`,
  get_recipe_id: (partId) => `${flask_port}/api/recipe_id/${partId}`,
  get_assembly_phase_parts: (phaseId) => `${flask_port}/api/get_assembly_phase_parts/${phaseId}`,
  get_assembly_phase_details: (phaseId) => `${flask_port}/api/get_assembly_phase_details/${phaseId}`,
  user_selected_recipe_check_part: (partId) => `${flask_port}/api/user_selected_recipe_check_part/${partId}`,
  get_admin_setting: (category, key) => `${flask_port}/api/get_admin_setting/${category}/${key}`,
  fetch_logs: (service_name) => `${flask_port}/api/fetch_logs/${service_name}`,
  restart_service: (service_name) => `${flask_port}/api/restart_service/${service_name}`,
  table_name: (tableName) => `${flask_port}/api/${tableName}`,

};
