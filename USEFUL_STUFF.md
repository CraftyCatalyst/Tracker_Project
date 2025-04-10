  View at https://github.com/CraftyCatalyst/Tracker_Project/blob/main/USEFUL_STUFF.md

# Tracker Project - Useful Stuff
This file contains all the things I learned during this project and needed to reference over and over.

## Table of Contents:
* [Section 1: Troubleshooting](#section-1)
* [Section 2: New System Installation](#section-2)
* [Section 3: Virtual Environment](#section-3)
* [Section 4: Build & Run the Application](#section-4)
* [Section 5: Docker](#section-5)
* [Section 6: npm commands](#section-6)
* [Section 7: Table Maintenance](#section-7)
* [Section 8: Flask Commands](#section-8)
* [Section 9: SQLite](#section-9)
* [Section 10: Key files](#section-10)
* [Section 11: Code stuff](#section-11)
* [Section 12: Project relative paths](#section-12)
* [Section 13: Visual Studio](#section-13)
* [Section 14: Copilot](#section-14)
* [Section 15: Feature List](#section-15)

## <h1 id="markdown">Markdown Cheatsheet: </h1>

|Element    |Syntax |
|-----------|-------|
|Add colour using CSS: |<span style="color: red; font-size: 18px;">Text - </span> `<span style="color: red; font-size: 18px;">Text</span>`</span><br><span style="color: orange; font-size: 18px;">Text - </span> `<span style="color: orange; font-size: 18px;">Text</span>`<br><span style="color: yellow; font-size: 18px;">Text - </span> `<span style="color: yellow; font-size: 18px;">Text</span>`<br><span style="color: green; font-size: 18px;">Text - </span> `<span style="color: green; font-size: 18px;">Text</span>`<br><span style="color: blue; font-size: 18px;">Text - </span> `<span style="color: blue; font-size: 18px;">Text</span>`<br><span style="color: indigo; font-size: 18px;">Text - </span> `<span style="color: indigo; font-size: 18px;">Text</span>`<br><span style="color: violet; font-size: 18px;">Text - </span> `<span style="color: violet; font-size: 18px;">Text</span>` |
| Headings |# Heading 1 <br> ## Heading 2 <br>### Heading 3|
| **bold text** | `**bold**`
|*italicized text*| `*italicized text*`
| ***bold and italicized*** | `***bold and italicized***`
|blockquote | > blockquote
|Ordered List| 1. First item <br> 2. Second item <br> 3. Third item|
|Unordered List|- First item <br> - Second item <br> - Third item|
|Code|\`code\` <br> `code`|
|Horizontal Rule | --- |
|Link | `[title](https://www.example.com)` |
|Image| `![alt text](image.jpg)` |
|Fenced Code Block | \`\`\`<br>{<br>"firstName": "John",<br>"lastName": "Smith",<br>"age": 25<br>}<br>\`\`\` |
|Footnote |Here's a sentence with a footnote. [^1] <br> [^1]: This is the footnote. |
|Heading ID|### My Great Heading {#custom-id}|
|Definition List|term <br>: definition|
|Strikethrough| `~~The world is flat.~~`, ~~The world is flat.~~ |
|Task List| - [x] Write the press release <br>- [ ] Update the website <br> - [ ] Contact the media|
|Emoji|[Complete list of Github markdown emoji markup](https://gist.github.com/rxaviers/7360908) <br> Thank you [rxaviers](https://gist.github.com/rxaviers) :smiley: |
|Highlight| 1) If your Markdown processor supports highlighting text then you can use == before and after the text. <br>I need to highlight these ==very important words== <br><br>If that doesn't work for you here are another couple of options: <br><br> 2) Define the CSS (if your Markdown renderer supports custom CSS): <br> `<style>` <br> `.highlight` <br>`{`<br> `background-color: yellow;` <br> `color: black;` <br>`}` <br><br> Use the CSS Class in your Markdown <br> `<style> I need to highlight these <span class="highlight">very important words</span></style>` <br><br> I need to highlight these <span class="highlight">very important words</span> <br><br> 3) Another way is to use HTML like so: <br> `I need to highlight these <mark>very important words</mark>` <br><br> I need to highlight these <mark>very important words</mark>|
|Subscript| H~2~O |
|Superscript| X^2^ |

>Sourced from: [markdownguide.org](https://www.markdownguide.org/cheat-sheet/)

>This is a really good Markdown Preview extension for VSCode: [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)

## <h1 id="section-1">Section 1 - Troubleshooting
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### 1.1. When installed packages aren't recognised:
Check >Python Interpreter in Command Palette to make sure it's pointing to the right python installation.

    Ctrl+P
    >Python Interpreter`

### 1.2. Issues with conflicting package versions:
***<span style="color: red; font-size: 18px;">Note:</span>*** This will blow away the node_modules directory, the package-lock.json file, and reinstall the all packages. Make sure any dependencies on specific versions are updated in the package.json file.

    Remove-Item -Recurse -Force ./node_modules
    Remove-Item -Force ./package-lock.json
    npm install

### Port 3000 already in use:
* #### <span style="color: orange; font-size: 18px;">LINUX</span> - Use the following command to find the process ID using port 3000 and kill it.
        sudo lsof -t -i:3000
        kill -9 <PID>
* #### <span style="color: orange; font-size: 18px;">WINDOWS</span>
      Open task manager and end all Node.js processes. Then restart the application.

 ### Flask stops recognising new routes 
    Do a full Flask restart (CTRL+C)
    clear __pycache__
    then restart

## <h1 id="section-2">Section 2 - New System Installation 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>
  
* ### 1) Install Node.js  
        https://nodejs.org/en/download/prebuilt-installer
* ### 2) Install the Communnity version of MySQL
        https://dev.mysql.com/downloads/mysql/
* ### 3) Install MySQL Workbench
        https://dev.mysql.com/downloads/workbench/
* ### 4) Install Python - if necessary. * *<span style="color: red; font-size: 28px;">(Note:</span> that installing Node.js may also install python if option is selected*)
        https://www.python.org/downloads/windows/
* ### 5) Set Up a Virtual Environment
    * <a href="#section-3">See Section 3.1</a></h1>

## <h1 id="section-3">Section 3 - Virtual Environment
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### 1) Set Up:
* ####  1.1) Create the virtual environment
        python -m venv venv
* #### 1.2) Activate the virtual environment
  * ##### <span style="color: orange; font-size: 18px;">LINUX</span> command to activate the virtual environment.
        source venv/bin/activate 
  * ##### <span style="color: orange; font-size: 18px;">WINDOWS</span> command to activate the virtual environment.
        ./venv/Scripts/activate
* #### 1.3) Install the required pip packages
        pip install -r pip_requirements.txt
* #### 1.4) Install the required npm packages
    * ##### <span style="color: orange; font-size: 18px;">LINUX</span> command to install the required packages.
            xargs -a npm_requirements.txt npm install 
    * ##### <span style="color: orange; font-size: 18px;">WINDOWS</span> command to install the required packages.
          Get-Content -Path npm_requirements.txt | ForEach-Object {npm install $_}

### 2) Turn on virtual environment:
* #### <span style="color: orange; font-size: 18px;">LINUX</span> command to activate the virtual environment.
      source venv/bin/activate
* #### <span style="color: orange; font-size: 18px;">WINDOWS</span> command to activate the virtual environment.
        ./venv/Scripts/activate

### 3) Turn off virtual environment:
    deactivate
### 4) Delete:
* ####  <span style="color: orange; font-size: 18px;">LINUX</span> command to delete the virtual environment.
      rm -rf venv
* #### <span style="color: orange; font-size: 18px;">WINDOWS</span> command to delete the virtual environment.
      Remove-Item -Recurse -Force ./venv
     #### <span style="color: orange; font-size: 20px;">Alternatively, you can manually delete the venv directory using File Explorer.</span>



## <h1 id="section-4">Section 4 - Build & Run the Application 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### ***<span style="color: red;">IMPORTANT - SET RUN MODE IN .ENV FILE!</span>***
* #### Make sure you set the RUN_MODE_LOCATION variable in the .env file before proceding.

    > **local** - for local development on your machine. Both flask, react and sql servers will be run locally.
    **docker** - for running the application in a Docker container.
    **prod** - for running the application in a production environment. The Flask and SQL servers will be run on a separate machine. <span style="color: orange;">#TODO: Work in Progress</span>

### Development mode:                
* #### Navigate to the project directory    
        cd satisfactory_tracker
* ####  Active the virtual environment
        ./venv/Scripts/activate
* ####  Start the servers. This script will start both the Flask and React servers at the same time using 'concurrently'.
        npm start
* ####  To stop the servers.
        Ctrl C

> ***The Flask server, apis and the served application built using npm build will be running at http://192.168.50.33:5000/***
> ***The development server will be running at http://localhost:3000/***

### Production mode:
* Install Flask and SQL on a separate server. See section 4.1 for instructions. 
    * <span style="color: orange;">#TODO: Add Section 4.1</span>
* The Flask and SQL servers will be running at http://192.168.50.33:5000 <span style="color: orange;">(update with your server IP address).</span>
* #### Start the React app in production mode.
     npm startprod

* <span style="color: orange;">#TODO: Add instructions for starting the Flask and SQL servers in production mode.</span> 
* <span style="color: orange;">#TODO: Add instructions for setting up the React production environment.</span> 
* <span style="color: orange;">#TODO: Add instructions for setting up the Docker environment.</span> 

## <h1 id="section-5">Section 5 - Docker 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### Build the Docker images.
    docker-compose build

#### Add --no-cache to build the container without using the cache (useful for debugging)
    docker-compose build --no-cache
  ###  Start the containers. 
    docker-compose up
>- Add -d to start in detached mode. 
>- Add --build to build the images before starting the containers
>- Add --force-recreate to force the recreation of the containers
>- Add --remove-orphans to remove containers for services not defined in the Compose file
>- Add --renew-anon-volumes to recreate anonymous volumes instead of retrieving data from the previous containers

### Stop the containers
    docker-compose down

###  Run the app image in a container:
####  <span style="color: orange; font-size: 18px;"> replace *image_name* with the name of the image you want to run</span>
    docker run -p 3000:3000 -p 5000:5000 -v "$(pwd):/app" -e FLASK_ENV=development -e NODE_ENV=development image_name npm start
### Useful commands:
* ####  Access the bash shell in the app container
        docker exec -it image_name bash
* ####  Confirm the containers are running
        docker ps
* ####  Check for the Flask app
      docker logs image_name
* ####  Debug the app container
      docker debug image_name    
* #### How to tag a version of the image prior to pushing to docker hub
      docker image tag satisfactory_tracker image_name
* ####  How to push to docker hub
      docker image push image_name
* #### Remove all docker images 
      docker container rm -f $(docker container ls -aq)

## <h1 id="section-6">Section 6 - npm commands 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### Builds the React app
    npm run build
* ###  Starts the React app in developement mode
>***Note: npm scripts have been updated to use concurrently@9.1.0 to start the both react and flask servers at the same time in package.json***
    
    npm start

* ### Starts the React app in production mode
    #### ***Assumes the Flask server is already running on the production server***
      npm startprod
###  Stops the react server
    npm stop    

## <h1 id="section-7">Section 7 - Table Maintenance 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### <span style="color: red;"> THIS WHOLE SECTION IS OUT OF DATE #TODO</span>
Run refresh_data.py in SQLite_stuff directory to delete all data and reload either a specific table or all tables.</span>
- Primary keys are reset to 0 when the data is reloaded. So you shouldn't need to reload foreign key data. But spot check to be sure.
- Command line arguments as follows: all_tables, part, recipe, alternate_recipe, node_purity, miner_type, miner_supply, power_shards, data_validation
### Or just copy and paste one of the following commands into the command line.
    python refresh_data.py all_tables
    python refresh_data.py part
    python refresh_data.py recipe
    python refresh_data.py alternate_recipe
    python refresh_data.py node_purity
    python refresh_data.py miner_type
    python refresh_data.py miner_supply
    python refresh_data.py power_shards
    python refresh_data.py data_validation
 ***<span style="color: red; font-size: 18px;">Note:</span>*** The user table is not included. This is to prevent the loss of user data. If you need to refresh the user table, you will need to do it manually.

## <h1 id="section-8">Section 8 - Flask Commands 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>


#### Update or Recreate the database Schema.
    cd flask_server
    flask db stamp head # Stamp the current migration.
    flask db migrate -m "your description" # Change the message as needed.
    flask db upgrade # Upgrade the database to the latest migration.


##### Downgrade to the previous migration.
        flask db downgrade
##### Show the migration history.
        flask db history
##### Show the current migration.
        flask db heads
##### Stamp the current migration.
        flask db stamp head

## <h1 id="section-9">Section 9 - SQL 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

#### Useful MySQL Commands
##### Disable foreign key checks temporarily
    SET FOREIGN_KEY_CHECKS = 0;
    TRUNCATE TABLE referenced_table;
    SET FOREIGN_KEY_CHECKS = 1;


## <h1 id="section-10">Section 10 - Key files 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### 1General:
| Filename      | Description |
|---------------|-------------|
|config.py      | Configuration file for both the Flask and React apps</span>|
|pip_requirements.txt | List of pip packages</span>|
|npm_requirements.txt |List of npm packages for the React app</span>
|.env | Environment variables for the project </span>
|USEFUL_STUFF.md | That's this file! 😜</span>
|README.md | In Progress</span>

### SQLite:
| Filename      | Description |
|---------------|-------------|
|satisfactory_tracker/SQLite_stuff/satisfactory_parts.db | Database file for the SQLite database |
|satisfactory_tracker/SQLite_stuff/Satifactory Parts Data v2.xlsx | Excel file containing the initial data |
|satisfactory_tracker/SQLite_stuff/migrate_data.py | Migration script for initial setup to move data from Excel to SQLite database. |
|satisfactory_tracker/SQLite_stuff/refresh_data.py | Script to delete all data and reload either a specific table or all tables. |
|satisfactory_tracker/SQLite_stuff/create_db.py | Script to create the database |
|satisfactory_tracker/SQLite_stuff/create_schema.py | Script to create the database schema |

### Flask:
| Filename      | Description |
|---------------|-------------|
|satisfactory_tracker/run.py | Run the Flask app |
|satisfactory_tracker/app/__init__.py | App initialization and configuration |
|satisfactory_tracker/app/models.py | Database models and relationships |
|satisfactory_tracker/app/routes.py | Routes and views |
|satisfactory_tracker/app/build_tree.py | Script to build the dependency tree |

### React:
| Filename      | Description |
|---------------|-------------|
|satisfactory_tracker/src/pages/LoginPage.js | Login Page  |
|satisfactory_tracker/src/pages/SignupPage.js | Signup Page |
|satisfactory_tracker/src/pages/HomePage.js | Home Page |
|satisfactory_tracker/src/pages/DataManagementPage.js | Data Management Page |
|satisfactory_tracker/src/pages/EditModal.js | Edit & Create Modal form |
|satisfactory_tracker/src/pages/DependencyTreePage.js | Dependency Tree Page |    
|satisfactory_tracker/src/services/api.js | API service |         
|satisfactory_tracker/src/theme/theme.js | Theme provider for the app |
|satisfactory_tracker/src/apiConfig.js | API configuration file |
|satisfactory_tracker/src/App.js | Main App component |
|satisfactory_tracker/src/Header.js | Header component |
|satisfactory_tracker/src/package.json | Package file |
|satisfactory_tracker/src/UserContext.js | User context file |

### Docker:
| Filename      | Description |
|---------------|-------------|
|Dockerfile | Dockerfile |
|docker-compose.yml | Docker Compose file for the Flask and React apps |
|.dockerignore | Docker ignore file, used to exclude files from the Docker build |
|entrypoint.sh | Execute a Flask database upgrade |

### Other Files / Folders:
| Filename      | Description |
|---------------|-------------|
|satisfactory_tracker/package-lock.json | Package lock file, auto-generated by npm |                   
|satisfactory_tracker/.gitignore | Git ignore file used to exclude files from version control |
|satisfactory_tracker/excel_stuff | My initial spreadsheet code, the  inpiration for this project |
|satisfactory_tracker/SQLite_stuff/backup.sql | Backup of the database |
|satisfactory_tracker/venv/ | Virtual environment folder |
|satisfactory_tracker/eslint.config.mjs | ESLint configuration file |
|satisfactory_tracker/file_list.txt | List of files in the project, genereated by the get_file_list.py script |
|satisfactory_tracker/get_file_list.py | Script to generate a list of files in the project |

### Auto-generated Files:
| Filename      | Description |
|---------------|-------------|
|satisfactory_tracker/app/__pycache__ | Python cache folder, auto-generated by Python |
|satisfactory_tracker/migrations | Alembic migrations folder |
|satisfactory_tracker/node_modules/ | Node modules, auto-generated by npm |
|satisfactory_tracker/public/ | Public folder for the React app |
|satisfactory_tracker/SQLite_stuff/__pycache__ | Python cache folder, auto-generated by Python |
### Files not in use:
| Filename      | Description |
|---------------|-------------|
|satisfactory_tracker/useful_stuff | Replaced with USEFULE_STUFF.md |
|satisfactory_tracker/debug.py | Debug file - Currently not in use |
|satisfactory_tracker/manage.py | Manage file - Currently not in use |
|satisfactory_tracker/app/test.py | Test file for the app, currently not in use |
|satisfactory_tracker/instance | Currently not in use |
|satisfactory_tracker/SQLite_stuff/query.py | Currently not in use |
|satisfactory_tracker/src/components | Components folder for the React app, currently not in use |
|satisfactory_tracker/src/services/dependencyTreeService.js | Dependency Tree Service, currently not in use |
|satisfactory_tracker/src/App.css | App CSS file, currently not in use |
|satisfactory_tracker/src/App.test.js | App test file, currently not in use |
|satisfactory_tracker/src/setupTests.js | Setup test file, currently not in use |

## <h1 id="section-11">Section 11 - Code stuff 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### Formatting of TODOs:
    #TODO:

### Conventional Commits Cheatsheet:
| Commit Type | Description |
|-------------|-------------|
| feat        | A new feature is introduced with the changes |
| fix         | A bug fix has occurred |
| chore       | Changes that do not relate to a fix or feature and don't modify src or test files (for example modifying .gitignore) |
| refactor    | Refactored code that neither fixes a bug nor adds a feature |
| docs        | Updates to documentation such as the README or other markdown files |
| style       | Changes that do not affect the meaning of the code, likely related to code formatting such as white-space, missing semi-colons, and so on |
| test        | Including new or correcting previous tests |
| perf        | Performance improvements |
| ci          | Continuous integration related |
| build       | Changes that affect the build system, project version, external dependencies etc... |
| ops         | Changes that affect operational components like infrastructure, deployment, backup, recovery etc... |
| revert      | Reverts a previous commit |

### Commit Message format
    <type>(<optional scope>): <description>
    empty separator line
    <optional body>
    empty separator line
    <optional footer>

###  Merge Commit
    Merge branch '<branch name>'

### Revert Commit
    Revert "<reverted commit subject line>"

### Inital Commit
    chore: init

# App Logging
### In files where logging is required, add this at the top:
    from logging_util import setup_logger
    logger = setup_logger(__name__)

#### Use Appropriate Log Levels:

    logger.info("Info")
    logger.warning("Warning")
    logger.error("Error")
#### Example multi-line log:
- ##### Frontend
        const logMessage = `
            *********TrackerPage*************
            Tracker Reports:
            ${JSON.stringify(limitedTrackerReports, null, 2)}
            `;

        centralLogging(logMessage, "DEBUG");

- ##### Backend
        logger.info("*********TrackerPage*************\n"
                    f"Save Data: {save_data}"
                   )

## <h1 id="section-12">Section 12 - Project relative paths 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

    flask_server
    satisfactory_tracker

## <h1 id="section-13">Section 13 - Visual Studio
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### Exclude venv and node_modules from search. Copy into the files to exclude text box in the search tab.
    satisfactory_tracker/venv/**/, satisfactory_tracker/node_modules/**/

### Collapse/Expand all code blocks
#### Using Keyboard Shortcuts
        Collapse All: Ctrl + K, Ctrl + 0 (Windows/Linux) or Cmd + K, Cmd + 0 (Mac)

        Expand All: Ctrl + K, Ctrl + J (Windows/Linux) or Cmd + K, Cmd + J (Mac)

#### Using the Command Palette
    Open the Command Palette: Press Ctrl + Shift + P (Windows/Linux) or Cmd + Shift + P (Mac).
    
    Collapse All: Type Fold All and select the Fold All command.
    
    Expand All: Type Unfold All and select the Unfold All command.

## <h1 id="section-14">Section 14 - Copilot
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

### Debug a file using copilot-debug
    copilot-debug python filename.py
### Get suggestions for that type from files you've recently worked on
    Type # followed by a symbol, function_name, class_name etc...
### To reference symbols across your entire project, you can use the following to open a global symbols picker.
    #sym
### Adding folders to chat for context
* Folders can now be added as context by dragging them from the Explorer, Breadcrumbs, or other views into Copilot Chat.
* When a folder is dragged into Copilot Edits, all files within the folder are included in the working set.
### Copilot usage graph
* VS Code extensions can use the VS Code API to build on the capabilities of Copilot. You can now see a graph of an extension's Copilot usage in the Runtime Status view. This graph shows the number of chat requests that were made by the extension over the last 30 days.
    
* The graph is available for extensions that have been granted the copilot.usage permission in their extension manifest.
### Multi-select
    Ctrl + Shift + L 

## <h1 id="section-15">Section 15 - Features & Issues List 
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a></h1>

## Database
* ### Migration from SQLite3 to MySQL
  - [x] WHAT HAVE YOU DONE! FIX EVERYTHING!
* ### Docker
-  [ ] Move Dockerfile, docker-compose.yml, pip_requirements.txt and npm_requirements.txt to Tracker_Project directory so that both the Flask_Server and satisfactory_tracker(React) are included in the copy.
- [ ] Update Dockerfile
    - [ ] Ensure the Dockerfile installs the necessary MySQL client libraries
        * default-libmysqlclient-dev \
    - [ ] Include the database migration:
        * RUN flask db upgrade
- [ ] Update docker-compose.yml
    - [ ] MySQL Service: 
        - [ ] Define a mysql service using the mysql:8.0 image. 
        - [ ] Set the root password and database name using environment variables.
    - [ ] App Service:
        - [ ] Define the app service to build from the Dockerfile. 
        - [ ] Set environment variables for MySQL connection details. 
        - [ ] Use depends_on to ensure the MySQL service starts before the app service.
* ### Update README.md:
    - [ ] Section 2 - New System Installation
    - [ ] Section 4 - Build & Run the Application
    - [ ] Section 7 - Table Maintenance
    - [ ] Section 8 - Flask Commands
    - [ ] Section 9: SQLite
    - [ ] Section 10 - Key files

##  Data Management Page
* ### Edit Modal Page:            
    - [ ] Implement Data Validation on EditModal
    - [ ] Implement the data validation on the EditModal for edit and create modes.
    - [ ] Get valid values from data_validation table.
    - [ ] Get values for foreign key constraints
    - [ ] Change parts and recipes tables to 'part' and 'recipe' for consistency.
    - [x] Fix the Delete button, it's not working.

## Dependency Tree Page
* ### Build Tree:
    - [ ] Update build_tree to take alternate recipes into account.
    - [ ] Save and Load Configurations
    - [ ] Allow users to save their selected recipes, parts, and target quantities into configurations that they can load later.
    - [ ] Machine and Resource Calculations
        - [ ] Add summaries for the required machines and resource supply/demand at the bottom of the tree.
* ### User Interface:
    - [ ] Export Tree Data
        - [ ] Allow exporting the dependency tree (e.g., as JSON, CSV, or a downloadable PDF).
        - [x] Visualization of Dependency Tree
            - [x] Use a tree graph (e.g., D3.js, react-tree-graph, or MUI X TreeView) to visually display the tree structure instead of the current table. This will help users better understand relationships.
        - [x] Interactive Filtering (updated all tables to MUI X DataGrid)
            - [x] Added interactive filtering to the tables to allow users to search, sort, and filter the data.
        - [x] Collapsible Tree Nodes
            - [x] Add the ability to collapse/expand all/individual nodes of the tree for better usability. 
* ### Production Configuration:
    - [X] Get Flask working on a seperate server
        - [X] Separate Flask/SQL and React code
        - [X] Add a new 'prod' RUN_MODE
        - [X] Test Docker with new folder structure
    - [X] Upgrade from SQLite3 to MySQL

## Tracker Feature
* ## 1. Adding Parts to the Tracker
    - [x] Clicking on "Add to my Tracker" from the Tracker Tab on the DependencyTreePage:
    - [ ]  Adds the part, the target quantity, and the recipe the user has configured.
      - [x]  Standard Recipes
      - [ ]  Alternative recipes
    - Constraints:
      - [ ] Users cannot add the same part with the same alternative recipe combination more than once.
* ## 2. Accessing the TrackerPage
    * ### Button Visibility:
      - [ ] Ensure the "My Tracker" button in the Header and any related buttons are disabled for non-logged-in users.
    * ### Placeholder:
      - [ ] If the tracker is empty, display a message encouraging users to add parts from the DependencyTreePage.
* ## 3. Tables on the TrackerPage
  * ### Total Number of Parts Needed by Part
      - [ ] Displays only the parts the user has selected.
      - [ ] Must account for alternative recipes to calculate the correct parts required.
* ### Total Number of Machines Needed by Machine
    - [ ] Displays the name of the machine and the total number required.
    - [ ] Includes only the parts selected by the user.
* ### Total Number of Parts Needed Per Minute by Part
    - [ ] Users input machine configurations (e.g., built machines, modifiers applied).
    - [ ] Calculations reflect the impact of modifiers such as power_shards and somesloop.
* ### Time Needed to Complete Selected Parts by Part
    - [ ] Based on the user’s machine configurations.
    - [ ] If "ingredients" for a part are insufficient, display a warning or placeholder.
    - [ ] Includes an efficiency indicator and links to alternative recipes for optimization insights.
* ### Additional Features
    - [ ] Resource allocation by raw materials.
    - [ ] Alerts for missing components.
    - [ ] Efficiency recommendations for recipes and machine setups.
* ## 4. Modifier Tracking
  * ### Power Shards:
      - [ ] Include a dropdown to select the number of power shards applied to a machine.
      - [ ] Shards will directly impact the parts created per minute.
  * ### Somersloop:
      - [ ] Add a checkbox to indicate whether a somesloop is applied, doubling the machine output.
  * ### Miner Supply:
      - [ ] Use the miner_supply table to account for node_purity_id, miner_type_id, and supply_pm in calculations.
* ## 5. Dynamic Totals Adjustment
  * ### Automatic Recalculation:
      - [ ] Totals should update immediately after a record is added, reducing user interaction steps.
  * ### Totals Calculation:
      - [ ] Reflect the initial target totals (based on parts tracked) minus the impact of what the user has created.
* ## 6. Additional Features
  * ### Editable Tables:
      - [ ] Allow users to edit configurations like quantities or modifiers directly in the tables.
  * ### Filtering:
      - [ ] Provide options to filter parts by type, category, or machine type.
  * ### Export/Share:
      - [ ] Enable users to export their tracker data to a CSV or share it with others.
## Next Steps
* ### Design the TrackerPage UI:
    - [ ] Create a wireframe or a mockup of how the TrackerPage should look.
    - [ ] Include sections for each table and user interactions.
* ### Build the TrackerPage Component:
    - [ ] Set up the layout with placeholders for data.
    - [ ] Add UI elements like buttons, dropdowns, and tables.
* ### Integrate Backend Endpoints:
    - [ ] Mock data initially, then replace it with API calls.
## Database Structure:
  - [ ] New table to capture total parts needed to commplete an item to calculate time to complete
## MISC:
  - [x] Test new system installation instructions on laptop
  - [x] Fix Logout button in the header. It's not working.
    
<a href="#table-of-contents" style="font-size: 14px; float: right;">Back to top</a>

---------------g
  
<style>
.highlight {
  background-color: yellow;
  color: black;
}
</style>

