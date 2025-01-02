# Table of Contents:
* [Section 1: Troubleshooting](#section-1---troubleshooting)
* [Section 2: New System Installation](#section-2---new-system-installation)
* [Section 3: Virtual Environment](#section-3---virtual-environment)
* [Section 4: Build & Run the Application - Line 56](#section-4---build--run-the-application)
* [Section 5: Docker](#section-5---docker)
* [Section 6: npm commands](#section-6---npm-commands)
* [Section 7: Table Maintenance](#section-7---table-maintenance)
* [Section 8: Flask Commands](#section-8---flask-commands)
* [Section 9: SQLite](#section-9---SQLite)
* [Section 10: Key files](#section-10---key-files)
* [Section 11: Code stuff](#section-11---code-stuff)
* [Section 12: Project relative paths](#section-12---project-relative-paths)
* [Section 13: Visual Studio](#section-13---visual-studio)
* [Section 14: Copilot](#section-14---copilot)
* [Section 15: Feature List](#section-15---feature-list--todos)

| <h1>Section 1 - Troubleshooting:</h1>|<h6>[Back to top](#table-of-contents)</h6>|
| :------------ |------------------------------------------------------:|
# Section 1 - Troubleshooting:
## When installed packages aren't recognised:
### Check >Python Interpreter in Command Palette to make sure it's pointing to the right python installation.
    Ctrl+P
    >Python Interpreter
## Issues with conflicting package versions:
### ***This will blow away the node_modules directory, the package-lock.json file, and reinstall the all packages.***
### ***Make sure any dependencies on specific versions are updated in the package.json file.***
    Remove-Item -Recurse -Force ./node_modules
    Remove-Item -Force ./package-lock.json
    npm install
## Port 3000 already in use:
### WINDOWS
    Open task manager and end all Node.js processes. Then restart the application.
### LINUX - Use the following command to find the process ID using port 3000 and kill it.
    sudo lsof -t -i:3000
    kill -9 <PID>

# Section 2 - New System Installation:
  ### 1) Install Node.js  
    https://nodejs.org/en/download/prebuilt-installer
  ### 2) Install the Communnity version of MySQL - if necessary
    https://dev.mysql.com/downloads/mysql/
  ### 3) Install MySQL Workbench - if necessary
    https://dev.mysql.com/downloads/workbench/
  ### 4) Install Python - if necessary
    https://www.python.org/downloads/windows/
  ### 5) Set Up a Virtual Environment
    See Section 3

# Section 3 - Virtual environment:
  ### Set Up:
   #### 1) Create the virtual environment
      python -m venv venv
   #### 2) Activate the virtual environment
  #### LINUX command to activate the virtual environment.
      source venv/bin/activate 
  #### WINDOWS command to activate the virtual environment.
      ./venv/Scripts/activate
  #### 3) Install the required pip packages
  #### pip package installation
    pip install -r pip_requirements.txt
#### 4) Install the required npm packages
### LINUX command to install the required packages.
    xargs -a npm_requirements.txt npm install 
#### WINDOWS command to install the required packages.
    Get-Content -Path npm_requirements.txt | ForEach-Object {npm install $_}

### Delete:
#### LINUX command to delete the virtual environment.
    rm -rf venv
#### WINDOWS command to delete the virtual environment.
    Remove-Item -Recurse -Force ./venv
Alternatively, you can manually delete the venv directory using File Explorer.

### Turn on virtual environment:
#### LINUX command to activate the virtual environment.
    source venv/bin/activate
#### WINDOWS command to activate the virtual environment.
    ./venv/Scripts/activate

### Turn off virtual environment:
    deactivate

# Section 4 - Build & Run the Application:
## ***IMPORTANT - SET RUN MODE IN .ENV FILE!***
### Make sure you set the RUN_MODE variables in the .env file before proceding.
- local - for local development on your machine. Both flask, react and sql servers will be run locally.
- docker - for running the application in a Docker container.
- prod - for running the application in a production environment. The Flask and SQL servers will be run on a separate server.

### Development mode:                
#### Navigate to the project directory    
    cd satisfactory_tracker
#### Active the virtual environment
    ./venv/Scripts/activate
#### Start the servers. This script will start both the Flask and React servers at the same time using 'concurrently'.
    npm start
#### To stop the servers.
    Ctrl C
### ***The Flask server, apis and the served application built using npm build will be running at http://192.168.50.33:5000/***
### ***The development server will be running at http://localhost:3000/***

### Production mode:
#### Install Flask and SQL on a separate server. See section 4.1 for instructions. #TODO: Section 4.1
#### The Flask and SQL servers will be running at http://192.168.50.33:5000 (update with your server IP address).
#### Start the React app in production mode.
    npm startprod
#### #TODO: Add instructions for starting the Flask and SQL servers in production mode.
#### #TODO: Add instructions for setting up the React production environment.
#### #TODO: Add instructions for setting up the Docker environment.

# Section 5 - Docker:
  ### Stop the containers
    docker-compose down
  ###  Build the Docker images. Add --no-cache to build without using the cache (useful for debugging)
    docker-compose build
  ### Start the containers. 
    docker-compose up
- Add -d to start in detached mode. 
- Add --build to build the images before starting the containers
- Add --force-recreate to force the recreation of the containers
- Add --remove-orphans to remove containers for services not defined in the Compose file
- Add --renew-anon-volumes to recreate anonymous volumes instead of retrieving data from the previous containers

### Run the app image in a container:
#### ***replace image_name with the name of the image you want to run***
    docker run -p 3000:3000 -p 5000:5000 -v "$(pwd):/app" -e FLASK_ENV=development -e NODE_ENV=development image_name npm start
### Useful commands:
#### Access the bash shell in the app container
      docker exec -it image_name bash
#### Confirm the containers are running
      docker ps
#### Check for the Flask app
      docker logs image_name
#### Debug the app container
      docker debug image_name    
#### How to tag a version of the image prior to pushing to docker hub
      docker image tag satisfactory_tracker image_name
#### How to push to docker hub
      docker image push image_name
#### Remove all docker images 
      docker container rm -f $(docker container ls -aq)

# Section 6 - npm commands:
### Builds the React app
    npm run build
### Starts the React app in developement mode
#### ***Scripts updated to use concurrently@9.1.0 to start the both react and flask servers at the same time in package.json***
    npm start
### Starts the React app in production mode
#### ***Assumes the Flask server is already running on the production server***
    npm startprod
### Stops the react server
    npm stop    

# Section 7 - Table Maintenance:
### 1) Run refresh_data.py in SQLite_stuff directory to delete all data and reload either a specific table or all tables.
- Primary keys are reset to 0 when the data is reloaded. So you shouldn't need to reload foreign key data. But spot check to be sure.
- Command line arguments as follows: all_tables, part, recipe, alternate_recipe, node_purity, miner_type, miner_supply, power_shards, data_validation
### Or just copy and paste one of the following commands into the command line.
    python refresh_data.py all_tables # Refresh all the data from the Excel file
    python refresh_data.py part # Refresh the part data from the Excel file
    python refresh_data.py recipe # Refresh the recipe data from the Excel file
    python refresh_data.py alternate_recipe # Refresh the alternate recipe data from the Excel file
    python refresh_data.py node_purity # Refresh the node purity data from the Excel file
    python refresh_data.py miner_type # Refresh the miner type data from the Excel file
    python refresh_data.py miner_supply # Refresh the miner supply data from the Excel file
    python refresh_data.py power_shards # Refresh the power shards data from the Excel file
    python refresh_data.py data_validation # Refresh the data validation data from the Excel file
### ***Note that the user table is not included. This is to prevent the loss of user data. If you need to refresh the user table, you will need to do it manually.***

# Section 8 - Flask Commands:
### Blow away the database and start over:
#### 1) Delete the database file.
LINUX command to remove the database.
    rm satisfactory_parts.db 
WINDOWS command to remove the database.
    del satisfactory_parts.db
##### ***Alternatively, you can manually delete the satisfactory_parts.db file using File Explorer.***
#### 2) Recreate the database.
    flask db stamp head # Stamp the current migration.
    flask db migrate -m "your description" # Change the message as needed.
    flask db upgrade # Upgrade the database to the latest migration.
#### 3) Migrate the data from the Excel file to the database.
    cd SQLite_stuff
#### 4) Migration script to move data from Excel to SQLite database.
    python -m SQLite_stuff.migrate_data 
##### Other useful Flask commands:
###### Downgrade to the previous migration.
    flask db downgrade
###### Show the migration history.
    flask db history
###### Show the current migration.
    flask db heads
###### Stamp the current migration.
    flask db stamp head

# Section 9 - SQLite:
- SQLite Installation Folder:
      F:/Programs/SQLite3/sqlite3.exe # Handy for me. Change path as needed.
- SQLite commands:
      sqlite3 satisfactory_parts.db .dump > backup.sql # Backup the database. Preferably BEFORE you make massive changes! :P

# Section 10 - Key files:
### General:
- satisfactory_tracker/config.py # Configuration file for both the Flask and React apps
- satisfactory_tracker/run.py # Run the Flask app
- satisfactory_tracker/pip_requirements.txt # List of pip packages for the virtual environment 
- satisfactory_tracker/npm_requirements.txt # List of npm packages for the React app
- satisfactory_tracker/.env # Environment variables for the project 
- satisfactory_tracker/useful_stuff # That's this file! :)
### SQLite:
- satisfactory_tracker/SQLite_stuff/satisfactory_parts.db # Database file for the SQLite database
- satisfactory_tracker/SQLite_stuff/Satifactory Parts Data v2.xlsx # Excel file containing the initial data
- satisfactory_tracker/SQLite_stuff/migrate_data.py # Migration script for initial setup to move data from Excel to SQLite database.
- satisfactory_tracker/SQLite_stuff/refresh_data.py # Script to delete all data and reload either a specific table or all tables.
- satisfactory_tracker/SQLite_stuff/create_db.py # Script to create the database
- satisfactory_tracker/SQLite_stuff/create_schema.py # Script to create the database schema
### Flask:
- satisfactory_tracker/app/__init__.py # App initialization and configuration 
- satisfactory_tracker/app/models.py # Database models and relationships
- satisfactory_tracker/app/routes.py # Routes and views
- satisfactory_tracker/app/build_tree.py # Script to build the dependency tree
### React:        
- satisfactory_tracker/src/pages/LoginPage.js # Login Page 
- satisfactory_tracker/src/pages/SignupPage.js # Signup Page
- satisfactory_tracker/src/pages/HomePage.js # Home Page
- satisfactory_tracker/src/pages/DataManagementPage.js # Data Management Page
- satisfactory_tracker/src/pages/EditModal.js # Edit & Create Modal form
- satisfactory_tracker/src/pages/DependencyTreePage.js # Dependency Tree Page        
- satisfactory_tracker/src/services/api.js # API service            
- satisfactory_tracker/src/theme/theme.js # Theme provider for the app
- satisfactory_tracker/src/apiConfig.js # API configuration file
- satisfactory_tracker/src/App.js # Main App component
- satisfactory_tracker/src/Header.js # Header component
- satisfactory_tracker/src/package.json # Package file
- satisfactory_tracker/src/UserContext.js # User context file            
### Docker:
- satisfactory_tracker/Dockerfile # Dockerfile
- satisfactory_tracker/docker-compose.yml # Docker Compose file for the Flask and React apps
- satisfactory_tracker/.dockerignore # Docker ignore file, used to exclude files from the Docker build
### Other Files / Folders:            
- satisfactory_tracker/package-lock.json # Package lock file, auto-generated by npm                       
- satisfactory_tracker/.gitignore # Git ignore file used to exclude files from version control
- satisfactory_tracker/excel_stuff # My initial spreadsheet code, the  inpiration for this project
- satisfactory_tracker/SQLite_stuff/backup.sql # Backup of the database
- satisfactory_tracker/venv/ # Virtual environment folder   
- satisfactory_tracker/eslint.config.mjs # ESLint configuration file
- satisfactory_tracker/file_list.txt # List of files in the project, genereated by the get_file_list.py script
- satisfactory_tracker/get_file_list.py # Script to generate a list of files in the project
### Auto-generated Files:    
- satisfactory_tracker/app/__pycache__ # Python cache folder, auto-generated by Python
- satisfactory_tracker/migrations # Alembic migrations folder
- satisfactory_tracker/node_modules/ # Node modules, auto-generated by npm
- satisfactory_tracker/public/ # Public folder for the React app
- satisfactory_tracker/SQLite_stuff/__pycache__ # Python cache folder, auto-generated by Python
### Files not in use:
- satisfactory_tracker/debug.py # Debug file - Currently not in use
- satisfactory_tracker/manage.py # Manage file - Currently not in use
- satisfactory_tracker/README.md # Readme file - Currently not in use
- satisfactory_tracker/app/test.py # Test file for the app, currently not in use
- satisfactory_tracker/instance # Currently not in use
- satisfactory_tracker/SQLite_stuff/query.py # Currently not in use
- satisfactory_tracker/src/components # Components folder for the React app, currently not in use
- satisfactory_tracker/src/services/dependencyTreeService.js # Dependency Tree Service, currently not in use
- satisfactory_tracker/src/App.css # App CSS file, currently not in use
- satisfactory_tracker/src/App.test.js # App test file, currently not in use
- satisfactory_tracker/src/setupTests.js # Setup test file, currently not in use

# Section 11 - Code stuff:
formatting of TODOs:
- #TODO:

# Section 12 - Project relative paths:
- satisfactory_tracker/
- satisfactory_tracker/SQLite_stuff
- satisfactory_tracker/excel_stuff

# Section 13 - Visual Studio:
### Exclude venv and node_modules from search. Copy into the files to exclude text box in the search tab.
    satisfactory_tracker/venv/**/, satisfactory_tracker/node_modules/**/

# Section 14 - Copilot:
- copilot-debug python filename.py # Debug a file using copilot-debug
- By typing # followed by a symbol, function_name, class_name etc... you'll get suggestions for that type from files you've recently worked on.
- To reference symbols across your entire project, you can use #sym to open a global symbols picker.
- Folders can now be added as context by dragging them from the Explorer, Breadcrumbs, or other views into Copilot Chat.
- When a folder is dragged into Copilot Edits, all files within the folder are included in the working set.
- Copilot usage graph
- VS Code extensions can use the VS Code API to build on the capabilities of Copilot. You can now see a graph of an extension's Copilot usage in the Runtime Status view. This graph shows the number of chat requests that were made by the extension over the last 30 days.
- The graph is available for extensions that have been granted the copilot.usage permission in their extension manifest.
- Multi-select
- Ctrl + Shift + L 

# Section 15 - Feature List & TODOs:
## Data Management
* ### Edit Modal:            
    * [ ] Implement Data Validation on EditModal
    * [ ] Implement the data validation on the EditModal for edit and create modes.
    * [ ] Get valid values from data_validation table.
    * [ ] Get values for foreign key constraints
    * [ ] Change parts and recipes tables to 'part' and 'recipe' for consistency.

## Dependencies
* ### Build Tree:
    * [ ] Update build_tree to take alternate recipes into account.
    * [ ] Save and Load Configurations
        * [ ] Allow users to save their selected recipes, parts, and target quantities into configurations that they can load later.
    * [ ] Machine and Resource Calculations
        * [ ] Add summaries for the required machines and resource supply/demand at the bottom of the tree.
* ### User Interface:
    * [ ] Export Tree Data
        * [ ] Allow exporting the dependency tree (e.g., as JSON, CSV, or a downloadable PDF).
    * [x] Visualization of Dependency Tree
        * [x] Use a tree graph (e.g., D3.js, react-tree-graph, or MUI X TreeView) to visually display the tree structure instead of the current table. This will help users better understand relationships.
        * [x] Interactive Filtering (updated all tables to MUI X DataGrid)
        * [x] Added interactive filtering to the tables to allow users to search, sort, and filter the data.
    * [x] Collapsible Tree Nodes
        * [x] Add the ability to collapse/expand all/individual nodes of the tree for better usability. 

* ### Production Configuration:
    * [x] Get Flask working on a seperate server
        * [ ] Separate Flask/SQL and React code
        * [ ] Add a new 'prod' RUN_MODE
        * [ ] Test Docker with new folder structure
    * [ ] Upgrade from SQLite3 to MySQL

* ### MISC:
    * [x] Test new system installation instructions on laptop
    * [x] Fix Logout button in the header. It's not working.
    


  

