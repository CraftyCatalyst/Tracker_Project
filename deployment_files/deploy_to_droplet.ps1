######################################################################################
#                       SATISFACTORY TRACKER DEPLOYMENT SCRIPT                       #

######################################################################################
#                           --------------------------------                         
#                           !! BEFORE RUNNING THIS SCRIPT !!                         
#                           --------------------------------                         
# Ensure that:                                                                       
#    - The REACT_APP_RUN_MODE variable in the .env file is set to the correct 
#      environment for deployment (prod, qas, dev, test).                
#    - The following files are in the same directory as this script:                 
#       - .deployment_env                                                                             
#       - LaunchNPP_Monitor.exe                                                      
#    - sql release scripts have been copied to the correct directories:              
#       - release_scripts/dev                                                        
#       - release_scripts/qas                                                        
#       - release_scripts/prod                                                       
#       - release_scripts/test                                                       
#    - .env file is in satisfactory_tracker directory so it gets picked up by 
#      the build process.                                               
#    - DOUBLE_CHECK THAT the REACT_APP_RUN_MODE variable in the .env file is set 
#      to the correct environment for deployment (prod, qas, dev, test).                                                       
#                                                                                    
#                           --------------------------------                         

######################################################################################
#                                       TODO!                                        #
#   - TODO: Consider updating the step numbers in the log messages/comments 
#   (--- Step X ---) for clarity.
#


######################################################################################
# ---------------------------------- About Section ----------------------------------#
<#
.SYNOPSIS
Main step of the deployment script.
    Step 1: Run React Build / Git Checkout
    Step 2: Backup Server State
    Step 3: Sync Files (React & Flask)
    Step 4: Update Flask Dependencies
    Step 5: Invoke Database Migration
    Step 6: Apply SQL Release Scripts
    Step 7: Restart Services
    

.DESCRIPTION
This script is designed to automate the deployment process for Satisfactory Tracker App's Flask server and React app to it's remote LINUX server using rsync and SSH.
The script performs the following tasks:

Initial Setup:
- Loads environment variables from .deployment_env and .env files.
    - The .deployment_env file contains settings specific to the deployment process.
    - The .env file contains the application settings.
- Get or creates the version to be deployed.
    - If BumpType is specified the version will be created based on BumpType and the current version in the version.txt file.
    - If Version is specified, it will get that version from the git tag and deploy it.
    - If neither is specified, the script will prompt for the version to be deployed.
Check Environment & Confirm:
    - Compares the target environment with the local .env variables in order to ensure that the app will be built for the correct environment.
    - Throws an error if the target environment does not match the local .env variables.
    - If they do match, it presents the local and target variables to the user and prompts for confirmation before proceeding as a final safety measure.

Deployment Process:
Step 1: Run React build locally
    - Uses npm to build the React app locally and create the build directory.

Step 2: Backup Existing Project Files
    - Create backups of the existing Flask and React app files on the server.
    - Backs up the database using mysqldump and stores it in the backup directory.
    - Removes old backups based on the specified retention policy in .deployment_env (e.g., keep only the last 5 backups).

Step 3: Deploy Application Files using rsync
    - Uses rsync to transfer the React app files to the server.
    - Uses rsync to transfer Flask app files to the server, excludes certain directories and files from the transfer (e.g., __pycache__, logs, scripts, etc.).

Step 4: Install/Upgrade Flask Dependencies
    - Installs Python dependencies on the server using pip and the pip_requirements file to install/update the necessary packages.

Step 5: Database Migration
    - Runs database migrations if specified.
    - New Environments:
        - Creates the database and schema if they do not exist.
        - Populates the database with initial data using SQL scripts.
    - Existing Environments:
        - Runs database migrations using Flask-Migrate.
        - Applies SQL release scripts if specified.

Step 6: Apply SQL Release Scripts
    - Runs SQL release scripts if specified.
    - The script looks for SQL release scripts in the release_scripts directory for the specified environment (e.g., dev, qas, prod, test).
    - It checks if the SQL scripts have already been applied to the database.
    - If the sql scripts have not been applied, it will run them.
    - If the -ForceSqlScripts switch is used, it will re-run all SQL release scripts regardless of whether they have been applied or not.

Step 7: Restart Services
    - Restarts the relevant Flask service and Nginx server on the target server.

- PREREQUISITES
    - This script is designed to be run in PowerShell
    - It requires WSL (Windows Subsystem for Linux) for rsync operations.
    - It requires SSH access to the target server and passwordless authentication set up for the specified user.
    - This script assumes .my.cnf is configured on the server for passwordless root login to MySQL.
    - It also assumes visudo is configured on the server for passwordless sudo access for the specified user. Specifically for the following commands:
        - systemctl restart nginx
        - systemctl restart flask-* (To match the DEPLOYMENT_FLASK_SERVICE_NAME_* in .deployment_env)
    - The directories specified in the .deployment_env file for the following keys must exist on the target server:
        DEPLOYMENT_BACKUP_DIR_*
        DEPLOYMENT_SERVER_BASE_DIR_*        
    - The MySQL database specified in the .deployment_env file for the following keys must exist on the target server:
        - DEPLOYMENT_DB_NAME_*
    - The following tools must be installed on the server:
        - rsync
        - MySQL (for database backup and migration)
        - Flask (backend)
        - React (frontend)
        - Flask-Migrate (for database migrations)
        - Nginx (for web server) including configurations for PROD domain and DEV, QAS & TEST subdomains
        - Gunicorn (for serving Flask app) including configurations for PROD domain and DEV, QAS & TEST subdomains
    - If creating a new environment, ensure that the server has the necessary configurations and dependencies installed.
        - Ensure the blank target database is created and the application database user has the necessary permissions.
            - This script will create the schema and tables based on the models if they do not exist.
            - You will need to provide the seed data sql scripts to populate the tables.
        - Ensure you have nginx and gunicorn configurations set up for the new environment.
            - nginx configurations are located in /etc/nginx/sites-available/ and /etc/nginx/sites-enabled/.
            - gunicorn configurations are located in /etc/systemd/system/.
        - Update visudoers to include the new environment for passwordless sudo access via SSH.
            - This is required for the following commands:
                - systemctl restart nginx
                - systemctl restart flask-*

- VERSIONING
    - Release versioning and branch merges are handled automatically by the script.
    - The script will automatically bump the version based on the specified type and update the version.txt and package.json files.
    - The script will also create a new Git tag for the new version and push it to the remote repository.
    - If you are using the script for testing purposes, you can set the BumpType to 'none' to skip the version bumping process.
    - The script will automatically determine the target branch and source branch for merge based on the specified bump type.
        - BumpType: dev -> target branch: dev (this is not merged with any other branch during deployment)    
        - BumpType: qas -> target branch: qas -> source branch: dev
        - BumpType: major, minor, patch -> target branch: prod -> source branch: qas
        - BumpType: test -> target branch: test (this is used by the test harness and is not merged with any other branch)
    - After a successful production deployment, the script will sync all other branches with the main branch.

.PARAMETER Environment
The target environment (PROD, QAS, DEV, TEST). Mandatory. 
    - This is used to specify the target environment for deployment.
.PARAMETER runDBMigration
Run Flask database migration (y/n). Optional. Default is 'y'. 
    - This is used to determine if the database migration and any release scripts should be run as part of the deployment.
.PARAMETER Version
The Git tag/version to deploy (e.g., v1.3.0). Optional.
    - This is used to specify an existing version of code to be deployed.
    - If neither this parameter nor the -BumpType parameter is specified, the script will prompt for this value.
.PARAMETER BumpType
Bump type for version bumping (major, minor, patch, dev, qas, test, none). Optional.
    - This is used to specify the type of version bump to perform.
    - If this parameter is used, the -Version parameter is ignored.
.PARAMETER runBackup
Backup server folders and database before deployment (y/n). Optional. Default is 'y'.
    - This is used to determine if the backup should be taken before deployment.
    - If you are deploying to a new environment, set this to 'n' as there won't be any existing files to back up.
.PARAMETER runBuild
Run the npm build process (y/n). Optional. Default is 'y'.
    - This is used to determine if a new build of the React app should be created before deployment.
    - If you have already built the React app and just want to deploy the build files, set this to 'n'.
.PARAMETER ForceSqlScripts
This switch is used to force the script to run all SQL release scripts, even if they have already been applied to the database. Optional.
    - This is useful if data has become corrupted and/or you need to re-run the scripts to restore the data to a known state.    
.PARAMETER ForceConfirmEnvOnly
This switch is used to force the script to only check the source and target environments . Optional.
.PARAMETER ForceReactBuildOnly
This switch is used to force the script to only run the React build locally. Optional.
.PARAMETER ForceBackupOnly
This switch is used to force the script to only run the backup process. Optional.
.PARAMETER ForceSyncFilesToServerOnly
This switch is used to force the script to only sync the React build and Flask app files to the server. Optional.
.PARAMETER ForceFlaskUpdateOnly
This switch is used to force the script to only run the Flask dependency update. Optional.
.PARAMETER ForceDBMigrationOnly
This switch is used to force the script to only run the Flask database migration. Optional.
.PARAMETER ForceSqlScriptsOnly
This switch is used to force the script to only run the SQL release scripts. Optional.
.PARAMETER ForceRestartServicesOnly
This switch is used to force the script to only restart the services. Optional.
.PARAMETER ForceConfirmation
This switch is used by the test harness to skip the confirmation prompt. Optional.
.PARAMETER AutoApproveMigration
This switch is used by the test harness to skip the DB migration review prompt. Optional.
.PARAMETER AppendTestRun
This switch is used by the test harness to append a string to the log file name for test runs. Optional.

.EXAMPLE
In PowerShell, to run the script with the PROD environment and default parameters, you can use the following command:
    C:/repos/Tracker_Project/deploy_to_droplet.ps1 -Environment PROD
or, if you're in the same directory as the script:
    ./deploy_to_droplet.ps1 -Environment PROD

To set the runBackup and runBuild parameters to 'n', you can use the following command:
    ./deploy_to_droplet.ps1 -Environment PROD -runBackup n -runBuild n

To release a new version to the QAS environment, you can use the following command:
    ./deploy_to_droplet.ps1 -Environment QAS -BumpType qas

To release an existing version to the QAS environment, you can use the following command:
    ./deploy_to_droplet.ps1 -Environment QAS -Version v1.2.3

To use the Force*Only switches, you can use the following command as an example, use in conjunction with BumpType = none for testing:
    ./deploy_to_droplet.ps1 -Environment TEST -BumpType none -ForceSqlScriptsOnly -ForceRestartServicesOnly

If you don't specify any parameters, you will be prompted as follows:
    (prompt)    - Supply values for the following parameters:
                - Environment: PROD
                - Deploy existing [V]ersion or [B]ump version? (v/b)
                    - (v) - Enter existing version tag to deploy (e.g., v1.2.3)
                    - (b) - Enter bump type (major, minor, patch, rc, dev, qas, prod or test)


#>

######################################################################################
# ------------------------------------ Parameters -----------------------------------#

param(
    [Parameter(Mandatory = $true, HelpMessage = "Specify the target environment. Valid values are: PROD, QAS, DEV or TEST")]
    [ValidateSet('PROD', 'QAS', 'DEV', 'TEST')]
    [string]$Environment,

    [Parameter(Mandatory = $false, HelpMessage = "Specify if database migration should run. Valid values are: y, n")]
    [ValidateSet('y', 'n')]
    [string]$runDBMigration = 'y', # Default to 'y' for DB migration unless specified otherwise

    [Parameter(Mandatory = $false, HelpMessage = "Specify the Git tag/version to deploy (e.g., v1.3.0). Required if -BumpType is NOT used.")]
    [ValidatePattern('^v\d+\.\d+\.\d+(?:-(?:dev|qas|test)\.\d+)?$', Options = 'IgnoreCase')]
    [string]$Version,

    [Parameter(Mandatory = $false, HelpMessage = "Specify the type of version bump to perform before deployment. If used, -Version is ignored. Valid values: major, minor, patch, rc, dev, prod or test")]
    [ValidateSet("major", "minor", "patch", "dev", "qas", "test", "none")]
    [string]$BumpType,

    [Parameter(Mandatory = $false, HelpMessage = "Set to 'n' for new environment creation. Valid values are: y, n")]
    [ValidateSet('y', 'n')]
    [string]$runBackup = 'y', # Default to 'y' for backup unless specified otherwise

    [Parameter(Mandatory = $false, HelpMessage = "Set to 'n' if you've already run npm build and just want to deploy. Valid values are: y, n")]
    [ValidateSet('y', 'n')]
    [string]$runBuild = 'y', # Default to 'y' for build unless specified otherwise

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to force re-running of all SQL release scripts, even if previously applied.")]
    [switch]$ForceSqlScripts,

    [Parameter(Mandatory = $false, HelpMessage = "Set the switch to ONLY Confirm the deployment environment and not run the script.")]
    [switch]$ForceConfirmEnvOnly, # Added to allow for Environment check without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY run the React build and not run the script.")]
    [switch]$ForceReactBuildOnly, # Added to allow for React build without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY run the backup and not run the script.")]
    [switch]$ForceBackupOnly, # Added to allow for backup without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY run the Flask deployment and not run the script.")]
    [switch]$ForceSyncFilesToServerOnly, # Added to allow for Flask deployment without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY run the Flask dependency update and not run the script.")]
    [switch]$ForceFlaskUpdateOnly, # Added to allow for Flask dependency update without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY run the database migration and not run the script.")]
    [switch]$ForceDBMigrationOnly, # Added to allow for database migration without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY run the SQL release scripts and not run the script.")]
    [switch]$ForceSqlScriptsOnly, # Added to allow for SQL release scripts without running the script

    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to ONLY restart the services and not run the script.")]
    [switch]$ForceRestartServicesOnly, # Added to allow for restarting services without running the script

    # -ForceConfirmation: Skips the "Proceed? (y/n)" prompt.
    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to skip the confirmation prompt.")]
    [switch]$ForceConfirmation, # Added to allow for skipping confirmation prompt when using the test harness

    # -AutoApproveMigration: Skips the "Have you reviewed..." prompt for DB migration, assuming 'y'. (Alternatively, test the 'n' path separately).
    [Parameter(Mandatory = $false, HelpMessage = "Set this switch to skip the DB migration review prompt.")]
    [switch]$AutoApproveMigration, # Added to allow for skipping DB migration review prompt when using the test harness

    # -AppendTestRun: accepts a string to append to the log file name for test runs.
    [Parameter(Mandatory = $false, HelpMessage = "Append a string to the log file name for test runs.")]
    [string]$AppendTestRun = '' # Default to empty string for no appending
)
######################################################################################
# -------------------------------- Global Variables ---------------------------------#
$Script:DeploymentVersion = $null

######################################################################################
#-------------------------------- Start of Functions --------------------------------#
Function Invoke-VersionBump {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("major", "minor", "patch", "dev", "test", "qas", "none")]
        [string]$BumpType,

        [Parameter(Mandatory = $false)] # MODIFIED: Made optional, will use BaseVersionOverride if provided
        [string]$BaseVersionOverride,

        [Parameter(Mandatory = $true)]
        [string]$VersionFilePath,

        [Parameter(Mandatory = $true)]
        [string]$PackageJsonPath,

        [Parameter(Mandatory = $true)]
        [string]$GitRepoPath, # Path to the root of the Git repository

        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    Write-Log -Message "`n--- Bumping Version ($BumpType) ---" -Level "INFO" -LogFilePath $BuildLog

    # Check if the Git repo has uncommitted changes before the script runs
    if ($null -ne $GitRepoPath) {
        Write-Log -Message "Checking for uncommitted changes in '$GitRepoPath'..." -Level "INFO" -LogFilePath $BuildLog
        Push-Location $GitRepoPath
        try {
            $statusOutput = (git status --porcelain | Out-String).Trim() 
            if ($statusOutput.Length -gt 0) { 
                Write-Log -Message "Git status reported changes:" -Level "DEBUG" -LogFilePath $BuildLog 
                Write-Log -Message $statusOutput -Level "DEBUG" -LogFilePath $BuildLog -NoConsole
                Write-Log -Message "FATAL: Uncommitted changes detected in the Git repository. Please commit or stash changes before running the script." -Level "FATAL" -LogFilePath $BuildLog
                throw "Uncommitted changes detected."
            }
            else {
                Write-Log -Message "Git status clean." -Level "INFO" -LogFilePath $BuildLog
            }
        }
        finally {
            Pop-Location
        }
    }

    # MODIFIED: Logic to determine the version string to parse
    $versionToParse = ""
    if ($null -ne $BaseVersionOverride -and $BaseVersionOverride -ne "") {
        Write-Log -Message "Using BaseVersionOverride for version calculation: $BaseVersionOverride" -Level "INFO" -LogFilePath $BuildLog
        $versionToParse = $BaseVersionOverride
    }
    else {
        if (-not (Test-Path $VersionFilePath)) { Write-Log -Message "FATAL: Version file not found: $VersionFilePath (and BaseVersionOverride not provided)" -Level "FATAL" -LogFilePath $BuildLog; throw "Version file missing or no override"; }
        $versionLine = Get-Content -Path $VersionFilePath
        $versionToParse = $versionLine.Trim()
        Write-Log -Message "Using version from '$VersionFilePath' for calculation: $versionToParse" -Level "INFO" -LogFilePath $BuildLog
    }

    # Ensure referenced files exist, especially if not using BaseVersionOverride where version.txt is essential
    if (-not (Test-Path $VersionFilePath)) { Write-Log -Message "FATAL: Version file not found: $VersionFilePath" -Level "FATAL" -LogFilePath $BuildLog; throw "Version file missing"; }
    if (-not (Test-Path $PackageJsonPath)) { Write-Log -Message "FATAL: package.json not found: $PackageJsonPath" -Level "FATAL" -LogFilePath $BuildLog; throw "package.json missing"; }

    $currentVersionTag = $versionToParse # This is the base for calculations

    # Extract SemVer components from the current tag ($versionToParse)
    if ($currentVersionTag -match '^v?(\d+)\.(\d+)\.(\d+)(?:-(dev|qas|test)\.(\d+))?$') {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        $patch = [int]$matches[3]
        $preType = $matches[4]
        $preNum = [int]($matches[5] ?? 0)
    }
    else {
        Write-Log -Message "FATAL: Invalid version format in calculated base '$currentVersionTag': Must be vX.Y.Z or vX.Y.Z-prerelease.N" -Level "FATAL" -LogFilePath $BuildLog
        throw "Invalid version format for '$currentVersionTag'"
    }

    Write-Log -Message "Base version for bump calculation: $currentVersionTag (Major: $major, Minor: $minor, Patch: $patch, PreType: $($preType ?? 'none'), PreNum: $preNum)" -Level "INFO" -LogFilePath $BuildLog

    # Calculate new version based on bump type
    $newVersionBase = "" 
    switch ($BumpType) {
        "major" { $major++; $minor = 0; $patch = 0; $newVersionBase = "$major.$minor.$patch" }
        "minor" { $minor++; $patch = 0; $newVersionBase = "$major.$minor.$patch" }
        "patch" { $patch++; $newVersionBase = "$major.$minor.$patch" }
        "dev" { if ($preType -ne "dev") { $preNum = 0 } else { $preNum++ }; $newVersionBase = "$major.$minor.$patch-dev.$preNum" }
        "qas" { if ($preType -ne "qas") { $preNum = 0 } else { $preNum++ }; $newVersionBase = "$major.$minor.$patch-qas.$preNum" }
        "test" { if ($preType -ne "test") { $preNum = 0 } else { $preNum++ }; $newVersionBase = "$major.$minor.$patch-test.$preNum" }
        default { throw "Invalid bump type '$BumpType'" }
    }

    $newVersionCore = $newVersionBase -replace '^[vV]', '' 
    $newVersionTag = "v$newVersionCore" 

    Write-Log -Message "New version calculated: $newVersionTag" -Level "INFO" -LogFilePath $BuildLog

    # --- Update Files ---
    Set-Content -Path $VersionFilePath -Value $newVersionTag
    Write-Log -Message "📝 Updated $VersionFilePath to $newVersionTag" -Level "INFO" -LogFilePath $BuildLog

    $packageJsonContent = Get-Content -Path $PackageJsonPath -Raw | ConvertFrom-Json
    $packageJsonContent.version = $newVersionCore
    $packageJsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $PackageJsonPath -Encoding UTF8
    Write-Log -Message "📝 Updated $PackageJsonPath version to $newVersionCore" -Level "INFO" -LogFilePath $BuildLog

    # --- Git Operations ---
    Write-Log -Message "Performing Git operations in '$GitRepoPath'..." -Level "INFO" -LogFilePath $BuildLog
    try {
        Push-Location $GitRepoPath
        git add $VersionFilePath | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Git add failed for $VersionFilePath." }
        
        git add $PackageJsonPath | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Git add failed for $PackageJsonPath." }
        
        git commit -m "Bump version to $newVersionTag" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Git commit failed." }
        
        # --- Corrected Git Tag Check ---
        git rev-parse --quiet --verify "refs/tags/$newVersionTag" 2>$null # Check if tag exists, suppress stderr from this check
        if ($LASTEXITCODE -eq 0) {
            # Exit code 0 means tag exists
            Write-Log -Message "FATAL: Git tag '$newVersionTag' already exists." -Level "FATAL" -LogFilePath $BuildLog
            throw "Git tag '$newVersionTag' already exists."
        }
        # If $LASTEXITCODE is not 0, the tag does not exist, so we can proceed to create it.
        Write-Log -Message "Tag '$newVersionTag' does not exist. Proceeding to create." -Level "INFO" -LogFilePath $BuildLog
        git tag $newVersionTag | Out-Null 
        if ($LASTEXITCODE -ne 0) { throw "Git tag creation for '$newVersionTag' failed." }
        # --- End Corrected Git Tag Check ---
        
        git push origin HEAD | Out-Null  
        if ($LASTEXITCODE -ne 0) { throw "Git push commit failed." }
        
        git push origin $newVersionTag | Out-Null  
        if ($LASTEXITCODE -ne 0) { throw "Git push tag '$newVersionTag' failed." }

        Write-Log -Message "✅ Version bumped, committed, tagged ($newVersionTag), and pushed successfully." -Level "SUCCESS" -LogFilePath $BuildLog
    }
    catch {
        Write-Log -Message "FATAL: Git operation failed during version bump. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $BuildLog; throw "Git operation failed: $($_.Exception.Message)"
    }
    finally { Pop-Location }

    return $newVersionTag
}

Function Import-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )
    if (-not (Test-Path $FilePath -PathType Leaf)) {
        throw "Environment file not found at '$FilePath'."
    }
    $settings = @{}
    try {
        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and !$line.StartsWith("#")) {
                $parts = $line.Split("=", 2)
                if ($parts.Length -eq 2) {
                    $settings[$parts[0].Trim()] = $parts[1].Trim()
                }
            }
        }
    }
    catch {
        Write-Log -Message "FATAL: Failed to read or parse '$FilePath'. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $buildLog
        throw "Halting due to critical configuration file error."
        
    }
    return $settings
}

Function Convert-WindowsPathToWslPath {
    param(
        [string]$WindowsPath
    )
    # Get the drive letter (e.g., 'C')
    $drive = $WindowsPath.Substring(0, 1).ToLower()
    # Get the rest of the path (e.g., \path\to\file)
    $pathWithoutDrive = $WindowsPath.Substring(2)
    # Convert backslashes to forward slashes
    $linuxStylePath = $pathWithoutDrive.Replace('\', '/')
    # Combine to form WSL path
    return "/mnt/$drive$linuxStylePath"
}

Function Initialize-DeploymentConfiguration {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        [Parameter(Mandatory = $true)]
        [string]$ScriptRoot,
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    Write-Log -Message "`n--- Initialising Deployment Configuration ---" -Level "INFO" -LogFilePath $BuildLog
    
    # --- Define Paths ---
    $depEnvPath = Join-Path $ScriptRoot ".deployment_env"
    
    # --- Load Settings Files ---
    $depEnvSettings = @{}
    $localEnvSettings = @{}
    try {
        # Load environment variables from .deployment_env
        Write-Log -Message "Loading variables from '$depEnvPath'..." -Level "INFO" -LogFilePath $BuildLog

        $depEnvSettings = Import-EnvFile -FilePath $depEnvPath -BuildLog $BuildLog

        # Define .env path (needs DEPLOYMENT_LOCAL_BASE_DIR from first file)
        $localBaseDir = $depEnvSettings['DEPLOYMENT_LOCAL_BASE_DIR']
        if (-not $localBaseDir) {
            throw "DEPLOYMENT_LOCAL_BASE_DIR key is missing from '$depEnvPath'."
        }
        $envPath = $depEnvSettings['DEPLOYMENT_ENV_FILE_DIR']

        # Load the environment variables from the .env
        Write-Log -Message "Loading variables from '$envPath'..." -Level "INFO" -LogFilePath $BuildLog
        
        $localEnvSettings = Import-EnvFile -FilePath $envPath -BuildLog $BuildLog
    }
    catch {
        # Use $_ directly as it contains the exception object from the throw/catch
        Write-Log -Message "FATAL: Configuration loading failed. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $BuildLog
        throw "Halting due to critical configuration loading error."
    }

    # --- Define BASE names of the keys that are ENVIRONMENT-SPECIFIC ---
    $requiredBaseKeys = @(
        'DEPLOYMENT_TARGET',
        'DEPLOYMENT_FLASK_ENV',
        'DEPLOYMENT_FLASK_SERVICE_NAME',
        'DEPLOYMENT_DB_NAME',
        'DEPLOYMENT_BACKUP_DIR',
        'DEPLOYMENT_SERVER_BASE_DIR'
    )

    # --- Dynamically construct and check required ENVIRONMENT-SPECIFIC keys ---
    $requiredEnvKeys = @{}
    $missingKeys = @()
    $envSuffix = $Environment.ToUpper() # e.g., "DEV", "QAS", "PROD", "TEST"

    Write-Log -Message "Constructing and checking for required environment-specific keys (Suffix: _$envSuffix)..." -Level "INFO" -LogFilePath $BuildLog

    foreach ($baseKey in $requiredBaseKeys) {
        $envKey = "${baseKey}_${envSuffix}" # Construct the full key name
        Write-Log -Message "Checking for key: $envKey" -Level "INFO" -LogFilePath $BuildLog

        if (-not $depEnvSettings.ContainsKey($envKey)) {
            $missingKeys += $envKey
        }
        else {
            $requiredEnvKeys[$baseKey] = $envKey
        }
    }

    if ($missingKeys.Count -gt 0) {
        $errorMessage = "FATAL: The following required environment dependent keys are missing from '$depEnvPath': $($missingKeys -join ', ')"
        Write-Log -Message $errorMessage -Level "FATAL" -LogFilePath $BuildLog
        throw "Halting due to missing required environment dependent configuration keys."
    }

    # --- Assign variables in the SCRIPT scope ---
    Write-Log -Message "Assigning variables in script scope..." -Level "INFO" -LogFilePath $BuildLog

    # Assign environment-specific variables dynamically
    foreach ($baseKey in $requiredBaseKeys) {
        $envKey = $requiredEnvKeys[$baseKey]
        $value = $depEnvSettings[$envKey]
        Write-Log -Message "Setting script variable: `$${baseKey} = '$value'" -Level "INFO" -LogFilePath $BuildLog

        # Use -Scope 1 or -Scope Script to set in the caller's scope
        Set-Variable -Name $baseKey -Value $value -Scope Script -ErrorAction Stop
    }

    # Assign non-environment-specific variables explicitly
    $commonKeys = @('DEPLOYMENT_SERVER_USER', 
        'DEPLOYMENT_SERVER_IP', 
        'DEPLOYMENT_LOCAL_BASE_DIR', 
        'DEPLOYMENT_VENV_DIR',
        'DEPLOYMENT_GLOBAL_DIR',
        'DEPLOYMENT_PIP_REQ_FILE_PATH',
        'DEPLOYMENT_ENV_FILE_PATH', 
        'DEPLOYMENT_DOMAIN',
        'DEPLOYMENT_WSL_SSH_USER',
        'DEPLOYMENT_WSL_SSH_KEY_PATH',
        'DEPLOYMENT_BACKUP_COUNT',
        'DEPLOYMENT_GIT_REPO_PATH',
        'DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_PATH',
        'DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_COMPLETED_PATH',
        'DEPLOYMENT_SERVER_RELEASE_SCRIPTS_DIR')
    foreach ($key in $commonKeys) {
        if ($depEnvSettings.ContainsKey($key)) {
            $value = $depEnvSettings[$key]
            Write-Log -Message "Setting script variable: `$${key} = '$value'" -Level "INFO" -LogFilePath $BuildLog

            Set-Variable -Name $key -Value $value -Scope Script -ErrorAction Stop
        }
        else {
            # Make missing common keys a fatal error
            Write-Log -Message "FATAL: Required common configuration key '$key' not found in '$depEnvPath'." -Level "FATAL" -LogFilePath $BuildLog
            throw "Halting due to missing required common configuration keys."
        }
    }

    Write-Log -Message "Configuration initialisation complete." -Level "INFO" -LogFilePath $BuildLog

    # Return the loaded settings hashtables
    return @{
        DepEnvSettings   = $depEnvSettings
        LocalEnvSettings = $localEnvSettings
    }
}

Function Confirm-DeploymentEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetEnv,
        [Parameter(Mandatory = $true)]
        [string]$RunMode,
        [Parameter(Mandatory = $true)]
        [string]$TargetFlaskEnv,
        [Parameter(Mandatory = $true)]
        [string]$FlaskEnv,
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    Write-Log -Message "`n--- Environment Check & Confirmation ---" -Level "INFO" -LogFilePath $BuildLog

    # 1.1: Check if the script is running in the correct environment
    # Note: Using .ToUpper() directly in the comparison
    if ($TargetEnv.ToUpper() -ne $RunMode.ToUpper() -or $TargetFlaskEnv.ToUpper() -ne $FlaskEnv.ToUpper()) {
        Write-Log -Message "FATAL: Local .env variables (RunMode='$RunMode', FlaskEnv='$FlaskEnv') do not match the target deployment environment (TargetEnv='$TargetEnv', TargetFlaskEnv='$TargetFlaskEnv')." -Level "FATAL" -LogFilePath $BuildLog
        
        # Exit is implicit due to -ErrorAction Stop
    }
    else {
        Write-Log -Message "Target environment ($TargetEnv) and Flask environment ($TargetFlaskEnv) match the local .env file settings." -Level "INFO" -LogFilePath $BuildLog
    }

    # 1.2: Add Explicit Confirmation
    # Check to see if the ForceConfirmation switch is set to skip the prompt, if not then prompt the user
    if ($ForceConfirmation) {
        Write-Log -Message "Skipping user confirmation prompt due to ForceConfirmation switch." -Level "INFO" -LogFilePath $BuildLog
        Write-Log -Message "Build version '$Script:DeploymentVersion' for '$RunMode' and DEPLOY to '$TargetEnv' on '$DEPLOYMENT_SERVER_IP'." -Level "INFO" -LogFilePath $BuildLog
        return # Skip the confirmation prompt
    }
    
    Write-Host "`n"
    $confirmation = Read-Host "You are about to BUILD version '$Script:DeploymentVersion' for '$RunMode' and DEPLOY to '$TargetEnv' on '$DEPLOYMENT_SERVER_IP'. Proceed? (y/n)"
    # Log the prompt and the answer separately for clarity
    Write-Log -Message "User confirmation prompt displayed." -Level "INFO" -LogFilePath $BuildLog
    
    Write-Log -Message "User response: '$confirmation'" -Level "INFO" -LogFilePath $BuildLog

    if ($confirmation -ne 'y') {
        Write-Log -Message "Deployment cancelled by user." -Level "WARNING" -LogFilePath $BuildLog
        exit 1 # Exit the entire script
    }

    Write-Log -Message "User confirmed. Proceeding with deployment to $TargetEnv..." -Level "INFO" -LogFilePath $BuildLog
}

Function Invoke-ReactBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunBuild,
        [Parameter(Mandatory = $true)]
        [string]$LocalFrontendDir,
        [Parameter(Mandatory = $true)]
        [string]$BuildLog,
        [Parameter(Mandatory = $false)]
        [string]$GitRepoPath = $null # Path to the root of the Git repository
    )

    
    if ($RunBuild -ne 'y') {
        Write-Log -Message "Skipping React build as per user request." -Level "WARNING" -LogFilePath $BuildLog
        return
    }
        
    #Checkout Specified Version ---
    Write-Log -Message "`n--- Checking out version $Script:DeploymentVersion ---" -Level "INFO" -LogFilePath $BuildLog

    try {
        Push-Location $GitRepoPath
        Write-Log -Message "Fetching latest tags from origin..." -Level "INFO" -LogFilePath $BuildLog

        git fetch --tags origin --force # --force helps overwrite existing tags if needed locally
        if ($LASTEXITCODE -ne 0) { throw "Git fetch failed." }

        Write-Log -Message "Checking out tag '$Script:DeploymentVersion'..." -Level "INFO" -LogFilePath $BuildLog
        
        git checkout $Script:DeploymentVersion
        if ($LASTEXITCODE -ne 0) { throw "Git checkout of tag '$Script:DeploymentVersion' failed. Does the tag exist locally and remotely?" }

        Write-Log -Message "Successfully checked out version $Script:DeploymentVersion." -Level "SUCCESS" -LogFilePath $BuildLog
    }
    catch {
        Write-Log -Message "FATAL: Failed to checkout version '$Script:DeploymentVersion'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }
    finally {
        Pop-Location
    }

    Write-Log -Message "`n--- Step 1: Run React Build Locally ---" -Level "INFO" -LogFilePath $BuildLog

    Write-Log -Message "Building React app locally in '$LocalFrontendDir'..." -Level "INFO" -LogFilePath $BuildLog

    # Define the specific log file for npm build errors within this step
    $npmErrorLog = Join-Path (Split-Path $BuildLog -Parent) "npm_build_errors${Script:DeployedVersion}_$timestamp.log" # Use timestamp for uniqueness

    # Change to the frontend directory to run the build command
    try {
        Push-Location -Path $LocalFrontendDir -ErrorAction Stop
    }
    catch {
        Write-Log -Message "FATAL: Failed to change directory to '$LocalFrontendDir'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }

    try {
        # Capture all combined StdOut and StdErr streams
        Write-Log -Message "Capturing npm build output..." -Level DEBUG -LogFilePath $BuildLog 
        $npmOutput = (npm run build 2>&1 | Out-String) 

        # Log full captured output to file(s) without spamming console
        Write-Log -Message "--- NPM Build Output Start ---" -LogFilePath $buildLog -NoConsole 
        Write-Log -Message $npmOutput -LogFilePath $buildLog -NoConsole 
        Write-Log -Message "--- NPM Build Output End ---" -LogFilePath $buildLog -NoConsole 

        Write-Log -Message "--- NPM Build Output Start ---" -LogFilePath $npmErrorLog -NoConsole # Log to specific npm error log too
        Write-Log -Message $npmOutput -LogFilePath $npmErrorLog -NoConsole 
        Write-Log -Message "--- NPM Build Output End ---" -LogFilePath $npmErrorLog -NoConsole         

        if ($LASTEXITCODE -ne 0) {
            Write-Log -Message "FATAL: React build failed! Check output above and details in '$npmErrorLog'. Exiting." -Level "ERROR" -LogFilePath $BuildLog
            throw "React build failed."
        }
        else {
            Write-Log -Message "React build successful." -Level "SUCCESS" -LogFilePath $BuildLog
        }
    }
    catch {
        Write-Log -Message "FATAL: An unexpected error occurred during the React build process. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }
    finally {
        Pop-Location
        Write-Log -Message "Returned to original directory." -Level "INFO" -LogFilePath $BuildLog
    }
}

Function Backup-ServerState {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('y', 'n')]
        [string]$RunBackup,
        [Parameter(Mandatory = $true)]
        [string]$BackupDirFlask,
        [Parameter(Mandatory = $true)]
        [string]$ServerFlaskDir,
        [Parameter(Mandatory = $true)]
        [string]$BackupDirFrontend,
        [Parameter(Mandatory = $true)]
        [string]$ServerFrontendBuildDir,
        [Parameter(Mandatory = $true)]
        [string]$BackupDirDB,
        [Parameter(Mandatory = $true)]
        [string]$DatabaseName,
        [Parameter(Mandatory = $true)]
        [string]$DeploymentBackupDir,
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    # Check if backup is requested
    if ($RunBackup -ne 'y') {
        Write-Log -Message "Skipping backup as per user request." -Level "WARNING" -LogFilePath $BuildLog
        return
    }
    Write-Log -Message "`n--- Step 2: Backup Existing Project Files ---" -Level "INFO" -LogFilePath $BuildLog
    # 3.1: Copy Existing Flask Files to Backup Directory
    Write-Log -Message "Backing up current Flask files ($ServerFlaskDir) on server..." -Level "INFO" -LogFilePath $BuildLog

    
    # Ensure backup dir exists, copy if source exists, then remove source if copy succeeded
    $flaskBackupCmd = "mkdir -p '$BackupDirFlask' && if [ -d '$ServerFlaskDir' ]; then cp -a '$ServerFlaskDir' '$BackupDirFlask/'; else echo 'Warning: Source Flask directory $ServerFlaskDir not found, skipping copy.'; fi"
    Invoke-SshCommand -Command $flaskBackupCmd `
        -ActionDescription "backup Flask files to '$BackupDirFlask'" `
        -BuildLog $BuildLog `
        -IsFatal $true
    
    # --- Call Cleanup for Flask Backups ---
    Remove-OldBackups  -ParentDir $DeploymentBackupDir `
        -Prefix "flask_" `
        -BuildLog $BuildLog

    # 3.2: Copy Existing React Build to Backup Directory
    Write-Log -Message "Backing up existing React build ($ServerFrontendBuildDir) on server..." -Level "INFO" -LogFilePath $BuildLog

    # Ensure backup dir exists, copy if source exists, then remove source if copy succeeded
    $frontendBackupCmd = "mkdir -p '$BackupDirFrontend' && if [ -d '$ServerFrontendBuildDir' ]; then cp -a '$ServerFrontendBuildDir' '$BackupDirFrontend/'; else echo 'Warning: Source Frontend directory $ServerFrontendBuildDir not found, skipping backup.'; fi"
    Invoke-SshCommand -Command $frontendBackupCmd `
        -ActionDescription "backup React build to '$BackupDirFrontend'" `
        -BuildLog $BuildLog `
        -IsFatal $true

    # --- Call Cleanup for Frontend Backups ---
    Remove-OldBackups  -ParentDir $DeploymentBackupDir `
        -Prefix "frontend_" `
        -BuildLog $BuildLog

    # 3.3: Backup Database
    Write-Log -Message "Backing up MySQL database '$DatabaseName' to '$BackupDirDB'..." -Level "INFO" -LogFilePath $BuildLog

    # Ensure parent directory exists before dumping
    $parentDirForDbBackup = $DeploymentBackupDir
    $dbBackupCmd = "mkdir -p '$parentDirForDbBackup' && mysqldump $DatabaseName > '$BackupDirDB'" # Assumes .my.cnf
    $dbCleanupCmd = "rm -f '$BackupDirDB'" # Cleanup command if dump fails
    Invoke-SshCommand -Command $dbBackupCmd `
        -ActionDescription "backup database '$DatabaseName'" `
        -BuildLog $BuildLog `
        -FailureCleanupCommand $dbCleanupCmd `
        -IsFatal $true

    # --- Call Cleanup for Database Backups ---
    Remove-OldBackups  -ParentDir $DeploymentBackupDir `
        -Prefix "db_backup_" `
        -Suffix ".sql" `
        -BuildLog $BuildLog


    Write-Log -Message "Server state backed up successfully." -Level "SUCCESS" -LogFilePath $BuildLog
}

Function Sync-FilesToServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WslLocalFrontendDirBuild, # WSL path to local React build
        [Parameter(Mandatory = $true)]
        [string]$ServerFrontendBuildDir, # Server path for React build destination
        [Parameter(Mandatory = $true)]
        [string]$ServerFrontendBaseDir, # Server path for React base directory
        [Parameter(Mandatory = $true)]
        [string]$WslLocalFrontendBaseDir, # Local path for React base directory
        [Parameter(Mandatory = $true)]
        [string]$WslLocalFlaskDirApp, # WSL path to local Flask app source
        [Parameter(Mandatory = $true)]
        [string]$ServerFlaskAppDir, # Server path for Flask app destination
        [Parameter(Mandatory = $true)]
        [string]$ServerFlaskBaseDir, # Server path for Flask base directory
        [Parameter(Mandatory = $true)]
        [string]$WslLocalFlaskBaseDir, # Local path for Flask base directory
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    Write-Log -Message "`n--- Step 3: Deploy Application Files using rsync ---" -Level "INFO" -LogFilePath $BuildLog

    # 4.1: Sync React build files
    Write-Log -Message "Syncing React build files ($WslLocalFrontendDirBuild --> $ServerFrontendBuildDir)..." -Level "INFO" -LogFilePath $BuildLog

    # --- Refactored Call 1 ---
    $reactMkdirCmd = "mkdir -p '$ServerFrontendBuildDir'" # Use quotes for safety
    Invoke-SshCommand -Command $reactMkdirCmd `
        -ActionDescription "ensure React build destination directory exists ('$ServerFrontendBuildDir')" `
        -BuildLog $BuildLog `
        -IsFatal $true # Keep original fatal behavior
    # Ensure trailing slashes to copy *contents* into the destination
    Invoke-WslRsync -SourcePath "$($WslLocalFrontendDirBuild)/" `
        -DestinationPath "$($ServerFrontendBuildDir)/" `
        -Purpose "React build files" `


    # 4.2: Sync Flask Application Files
    Write-Log -Message "Syncing Flask application files ($WslLocalFlaskDirApp --> $ServerFlaskAppDir)..." -Level "INFO" -LogFilePath $BuildLog

    # --- Refactored Call 2 ---
    $flaskMkdirCmd = "mkdir -p '$ServerFlaskAppDir'" # Use quotes for safety
    Invoke-SshCommand -Command $flaskMkdirCmd `
        -ActionDescription "ensure Flask app destination directory exists ('$ServerFlaskAppDir')" `
        -BuildLog $BuildLog `
        -IsFatal $true
    $flaskExcludes = @('__pycache__', 'logs', 'scripts', '*.pyc', '.git*', '.vscode') # Add more if needed
    # Ensure trailing slashes
    Invoke-WslRsync -SourcePath "$($WslLocalFlaskDirApp)/" `
        -DestinationPath "$($ServerFlaskAppDir)/" `
        -Purpose "Flask app files" `
        -ExcludePatterns $flaskExcludes

    # Copy the pip_requirements.txt file from the local flask_server dir to the flask base directory on the server
    $localPipReqFilePath = "$WslLocalFlaskBaseDir/$DEPLOYMENT_PIP_REQ_FILE_PATH" # Full path on local WSL
    $serverPipReqFilePath = "$ServerFlaskBaseDir/$DEPLOYMENT_PIP_REQ_FILE_PATH" # Full path on server
    Write-Log -Message "Copying pip requirements file from '$localPipReqFilePath' to '$serverPipReqFilePath'..." -Level "INFO" -LogFilePath $BuildLog
    Invoke-WslRsync -SourcePath "$($localPipReqFilePath)" `
        -DestinationPath "$($serverPipReqFilePath)" `
        -Purpose "Pip requirements file"
    
    # Copy the .env file from the local flask_server dir to the flask base directory on the server
    $localEnvFilePath = "$WslLocalFrontendBaseDir/$DEPLOYMENT_ENV_FILE_PATH" # Full path on local WSL
    $serverEnvFilePath = "$ServerFrontendBaseDir/$DEPLOYMENT_ENV_FILE_PATH" # Full path on server
    Write-Log -Message "Copying .env file from '$localEnvFilePath' to '$serverEnvFilePath'..." -Level "INFO" -LogFilePath $BuildLog
    Invoke-WslRsync -SourcePath "$($localEnvFilePath)" `
        -DestinationPath "$($serverEnvFilePath)" `
        -Purpose ".env file"

    Write-Log -Message "Application files deployed successfully via rsync." -Level "SUCCESS" -LogFilePath $BuildLog
}

Function Update-FlaskDependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string]$VenvDir, # Path to virtual env directory on server
        [Parameter(Mandatory = $true)]
        [string]$ServerFlaskBaseDir, # Path to Flask project base on server
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    # Install/Upgrade Flask dependencies
    Write-Log -Message "`n--- Step 4: Upgrading Flask dependencies..." -Level "INFO" -LogFilePath $BuildLog

    $upgradeFlaskCmd = "cd '$DEPLOYMENT_GLOBAL_DIR' && source '$VenvDir/bin/activate' && pip install -r '$ServerFlaskBaseDir/$DEPLOYMENT_PIP_REQ_FILE_PATH' --upgrade"

    Invoke-SshCommand -Command $upgradeFlaskCmd `
        -ActionDescription "upgrade Flask dependencies from $ServerFlaskBaseDir/$DEPLOYMENT_PIP_REQ_FILE_PATH" `
        -BuildLog $BuildLog `
        -IsFatal $true
    
    Write-Log -Message "Flask dependencies upgraded successfully." -Level "SUCCESS" -LogFilePath $BuildLog

}

Function Invoke-DatabaseMigration {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('y', 'n')]
        [string]$runDBMigration,
        [Parameter(Mandatory = $true)]
        [string]$VenvDir, # Path to virtual env directory on server
        [Parameter(Mandatory = $true)]
        [string]$ServerFlaskBaseDir, # Path to Flask project base on server
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    Write-Log -Message "`n--- Step 5: Database Migration ---" -Level "INFO" -LogFilePath $BuildLog

    if ($runDBMigration -ne 'y') {
        Write-Log -Message "Database migration not requested. Skipping..." -Level "INFO" -LogFilePath $BuildLog
        return # Exit the function early
    }

    Write-Log -Message "Database migration requested. Proceeding..." -Level "INFO" -LogFilePath $BuildLog

    # --- Check for migrations directory and initialise if needed ---
    $migrationDir = "$ServerFlaskBaseDir/migrations"
    $migrationMessage = "" # Initialise migration message variable

    Write-Log -Message "Checking for existing migrations directory ('$migrationDir') on server..." -Level "INFO" -LogFilePath $BuildLog

    # --- Refactored Directory Check ---
    $checkDirCmd = "test -d '$migrationDir'"
    $checkResult = Invoke-SshCommand -Command $checkDirCmd `
        -ActionDescription "check for migrations directory" `
        -BuildLog $BuildLog `
        -IsFatal $false `
        -CaptureOutput

    $migrationDirExists = ($checkResult.ExitCode -eq 0) # Check the exit code from the result object

    if (-not $migrationDirExists) {
        Write-Log -Message "Migrations directory not found. Initialising Flask-Migrate..." -Level "INFO" -LogFilePath $BuildLog
        # Redirect output to prevent potential hangs
        $initCmd = "cd '$ServerFlaskBaseDir' && source '$VenvDir/bin/activate' && flask db init 2>&1; exit `$?"
        $flaskInitResult = Invoke-SshCommand -Command $initCmd `
            -ActionDescription "initialise migrations (flask db init)" `
            -BuildLog $BuildLog `
            -IsFatal $true
        Write-Log -Message "Result: $flaskInitResult. Flask-Migrate initialised successfully." -Level "SUCCESS" -LogFilePath $BuildLog
        $migrationMessage = "Initial migration creating all tables."
    }
    else {
        Write-Log -Message "Migrations directory found. Proceeding with standard migration." -Level "INFO" -LogFilePath $BuildLog
        $migrationMessage = "Auto-migration after deployment $(Get-Date -Format 'yyyyMMdd_HHmmss')"
    }
    # --- End Check ---


    # 5.1: Generate Migration Script (using the determined message)
    Write-Log -Message "Generating database migration script with message: '$migrationMessage'" -Level "INFO" -LogFilePath $BuildLog
    $escapedMigrationMessageForCmd = $migrationMessage -replace "'", "'\''"
    # Redirect output to prevent potential hangs
    $migrateCmd = "cd '$ServerFlaskBaseDir' && source '$VenvDir/bin/activate' && flask db migrate -m '$escapedMigrationMessageForCmd' 2>&1; exit `$?"
    # Note: The command above captures both stdout and stderr, which is useful for debugging
    $flaskDBMigrateResult = Invoke-SshCommand -Command $migrateCmd `
        -ActionDescription "generate migration script" `
        -BuildLog $BuildLog `
        -IsFatal $true
    Write-Log -Message "Result $flaskDBMigrateResult. Script generated. Please review it on the server." -Level "WARNING" -LogFilePath $BuildLog

    # 5.2: Pause for User Review (unless AutoApproveMigration is set)
    $migrationScriptDir = "$ServerFlaskBaseDir/migrations/versions/" # This path should now exist
    Write-Log -Message "The migration script has been generated in '$migrationScriptDir' on the server." -Level "WARNING" -LogFilePath $BuildLog

    $reviewConfirmation = ''
    if ($AutoApproveMigration) {
        Write-Log -Message "Auto-approving migration script review due to -AutoApproveMigration switch." -Level "WARN" -LogFilePath $BuildLog
        $reviewConfirmation = 'y'
    }
    else {
        Write-Log -Message "Please SSH into the server ($DEPLOYMENT_SERVER_USER@$DEPLOYMENT_SERVER_IP) and review the latest script in that directory." -Level "WARNING" -LogFilePath $BuildLog
    }
    while ($reviewConfirmation -ne 'y' -and $reviewConfirmation -ne 'n') {
        $reviewConfirmation = Read-Host "Have you reviewed the migration script and want to apply it? (y/n)"
    }


    if ($reviewConfirmation -ne 'y') {
        # --- Handle Cancellation ---
        Write-Log -Message "Database upgrade cancelled by user." -Level "ERROR" -LogFilePath $BuildLog
        $revertChoice = ''
        while ($revertChoice -ne 'y' -and $revertChoice -ne 'n') {
            $revertChoice = Read-Host "Do you want to DELETE the generated (but unapplied) migration script file from '$migrationScriptDir'? (y/n)"
        }
    
        if ($revertChoice -eq 'y') {
            # Find and attempt to delete the script
            $findLatestScriptCmd = "ls -t '$migrationScriptDir' | head -n 1"
            $findResult = Invoke-SshCommand -Command $findLatestScriptCmd `
                -ActionDescription "find latest migration script" `
                -BuildLog $BuildLog `
                -IsFatal $false `
                -CaptureOutput
            
            if ($findResult.ExitCode -eq 0 -and $findResult.StdOut -match '\S') {
                $latestScript = $findResult.StdOut.Trim()
                if ($latestScript -match '\.py$') {
                    $deleteScriptCmd = "rm -f '$migrationScriptDir/$latestScript'"
                    Write-Log -Message "Attempting to delete generated script: $deleteScriptCmd" -Level "INFO" -LogFilePath $BuildLog

                    Invoke-SshCommand -Command $deleteScriptCmd `
                        -ActionDescription "delete generated migration script '$latestScript'" `
                        -BuildLog $BuildLog `
                        -IsFatal $false
                    # Note: Success/failure is logged by Invoke-SshCommand
                }
                else {
                    # Use $findResult.ExitCode here, not $sshExitCode which isn't defined in this scope
                    Write-Log -Message "Could not find a .py file in '$migrationScriptDir' or failed to list them (Exit Code: $($findResult.ExitCode)). Skipping deletion." -Level "WARNING" -LogFilePath $BuildLog
                }
            }
            else {
                # Handle case where find command failed
                Write-Log -Message "Failed to find latest migration script (Exit Code: $($findResult.ExitCode)). Skipping deletion." -Level "WARNING" -LogFilePath $BuildLog
            }
        }
        else {
            Write-Log -Message "Unapplied migration script retained for review." -Level "WARNING" -LogFilePath $BuildLog
        }
    
        # --- Halt the script since the user cancelled the upgrade ---
        Write-Log -Message "Deployment halted by user during migration review." -Level "ERROR" -LogFilePath $BuildLog
    
        # --- End Handle Cancellation ---
    
    }
    else {
        # $reviewConfirmation was 'y'
        # --- Apply Migration ---
        Write-Log -Message "Migration script review completed. Proceeding with upgrade..." -Level "INFO" -LogFilePath $BuildLog
        Write-Log -Message "Applying database migration (upgrade)..." -Level "INFO" -LogFilePath $BuildLog        
        # Redirect output and add exit to prevent potential hangs
        $upgradeCmd = "cd '$ServerFlaskBaseDir' && source '$VenvDir/bin/activate' && flask db upgrade 2>&1; exit `$?"
        $flaskUpgradeResult = Invoke-SshCommand -Command $upgradeCmd `
            -ActionDescription "apply database migration (upgrade)" `
            -BuildLog $BuildLog `
            -IsFatal $true
        Write-Log -Message "Result: $flaskUpgradeResult. Database migration applied successfully." -Level "SUCCESS" -LogFilePath $BuildLog
        # --- End Apply Migration ---
    }

    Write-Log -Message "Database migration process completed." -Level "SUCCESS" -LogFilePath $BuildLog
}

Function Invoke-SqlReleaseScripts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BuildLog,
        [Parameter(Mandatory = $false)]
        [switch]$ForceRerun # Add switch to force re-running scripts
    )

    Write-Log -Message "`n--- Step 6: Applying SQL Release Scripts ---" -Level "INFO" -LogFilePath $BuildLog

    $localSqlScriptDir = Join-Path $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_PATH $Environment.ToLower()
    $localSqlScriptCompletedBaseDir = $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_COMPLETED_PATH
    $serverSqlScriptArchiveBaseDir = "$DEPLOYMENT_BACKUP_DIR/$DEPLOYMENT_SERVER_RELEASE_SCRIPTS_DIR"

    if (-not (Test-Path $localSqlScriptDir -PathType Container)) {
        Write-Log -Message "No release script directory found for environment '$Environment' at '$localSqlScriptDir'. Skipping SQL scripts." -Level "INFO" -LogFilePath $BuildLog
        return
    }

    $sqlScripts = Get-ChildItem -Path $localSqlScriptDir -Filter *.sql | Sort-Object Name

    if ($sqlScripts.Count -eq 0) {
        Write-Log -Message "No .sql scripts found in '$localSqlScriptDir' for environment '$Environment'." -Level "INFO" -LogFilePath $BuildLog
        return
    }

    Write-Log -Message "Found $($sqlScripts.Count) SQL script(s) to apply for '$Environment'." -Level "INFO" -LogFilePath $BuildLog

    # Ensure base directories exist locally and on server for this version
    $localSqlScriptCompletedDirVersion = Join-Path $localSqlScriptCompletedBaseDir $Environment.ToLower() $Script:DeploymentVersion
    $serverSqlScriptArchiveDirVersion = "$serverSqlScriptArchiveBaseDir/$($Environment.ToLower())/$Script:DeploymentVersion"

    New-Item -Path $localSqlScriptCompletedDirVersion -ItemType Directory -Force -ErrorAction Stop | Out-Null
    Invoke-SshCommand -Command "mkdir -p '$serverSqlScriptArchiveDirVersion'" -ActionDescription "create server archive directory for SQL scripts" -BuildLog $BuildLog -IsFatal $true

    foreach ($scriptFile in $sqlScripts) {
        $localScriptPath = $scriptFile.FullName
        $scriptName = $scriptFile.Name
        $wslLocalScriptPath = Convert-WindowsPathToWslPath -WindowsPath $localScriptPath
        $serverTempScriptPath = "/tmp/$scriptName" # Simple temp path on server

        Write-Log -Message "Processing SQL script: $scriptName" -Level "INFO" -LogFilePath $BuildLog
        
        # --- Check if script already applied (unless -ForceRerun is specified) ---
        if (-not $ForceRerun) {
            # Use -N (skip column names) and -s (silent) for cleaner output check
            $checkSql = "SELECT COUNT(*) FROM applied_sql_scripts WHERE script_name = '$scriptName';"
            $checkCmd = "mysql $DEPLOYMENT_DB_NAME -N -s -e ""$checkSql""" # Execute SQL directly
            $checkResult = Invoke-SshCommand -Command $checkCmd -ActionDescription "check if SQL script '$scriptName' is already applied" -BuildLog $BuildLog -IsFatal $true -CaptureOutput

            # Check the standard output for the count
            if ($checkResult.StdOut.Trim() -ne '0') {
                Write-Log -Message "SQL script '$scriptName' already applied according to database. Skipping (use -ForceRerun to override)." -Level "INFO" -LogFilePath $BuildLog
                # Don't move the local script if skipped
                continue # Move to the next script
            }
        }
        else {
            Write-Log -Message "ForceRerun specified. Will execute '$scriptName' even if already applied." -Level "WARNING" -LogFilePath $BuildLog
        }

        # 1. Copy script to temp location on server
        Invoke-WslRsync -SourcePath $wslLocalScriptPath -DestinationPath $serverTempScriptPath -Purpose "copy SQL script '$scriptName' to temp server location"

        # 2. Execute script on server using mysql client
        $mysqlCmd = "mysql $DEPLOYMENT_DB_NAME < '$serverTempScriptPath'"
        $execResult = Invoke-SshCommand -Command $mysqlCmd -ActionDescription "execute SQL script '$scriptName'" -BuildLog $BuildLog -IsFatal $true -CaptureOutput

        Write-Log -Message "SQL script '$scriptName' executed with the following output: $($execResult.StdOut)" -Level "INFO" -LogFilePath $BuildLog
        
        # 3. Cleanup temp script on server (regardless of success/failure, though script halts on failure anyway)
        Invoke-SshCommand -Command "rm -f '$serverTempScriptPath'" -ActionDescription "remove temp SQL script '$scriptName'" -BuildLog $BuildLog -IsFatal $false # Don't halt if cleanup fails

        # 4. If execution succeeded log and archive/move the script
        $baseName = $scriptFile.BaseName # Name without extension
        $newScriptName = "${baseName}_${Environment.ToLower()}_${Script:DeployedVersion}.sql"
        $serverArchivePath = "$serverSqlScriptArchiveDirVersion/$newScriptName"
        $localCompletedPath = Join-Path $localSqlScriptCompletedDirVersion $newScriptName

        # --- Record script application in DB ---
        
        # Check again if the record exists to decide between INSERT and UPDATE
        $checkSqlAgain = "SELECT COUNT(*) FROM applied_sql_scripts WHERE script_name = '$scriptName';"
        $checkCmdAgain = "mysql $DEPLOYMENT_DB_NAME -N -s -e ""$checkSqlAgain"""
        $checkResultAgain = Invoke-SshCommand -Command $checkCmdAgain -ActionDescription "re-check if SQL script '$scriptName' exists before recording" -BuildLog $BuildLog -IsFatal $true -CaptureOutput
        $recordCmd = ""
        if ($checkResultAgain.StdOut.Trim() -eq '0') {
            # Record doesn't exist, perform INSERT
            Write-Log -Message "Recording new application of '$scriptName' in database." -Level "INFO" -LogFilePath $BuildLog
            $recordSql = "INSERT INTO applied_sql_scripts (script_name, app_version, created_at, updated_at) VALUES ('$scriptName', '$Script:DeploymentVersion', UTC_TIMESTAMP(), UTC_TIMESTAMP());"
            $recordCmd = "mysql $DEPLOYMENT_DB_NAME -e ""$recordSql"""
        }
        elseif ($ForceRerun) { 
            # Record exists, AND force was specified, perform UPDATE
            Write-Log -Message "Updating application record for '$scriptName' in database (re-run)." -Level "INFO" -LogFilePath $BuildLog
            $recordSql = "UPDATE applied_sql_scripts SET updated_at = UTC_TIMESTAMP(), app_version = '$Script:DeploymentVersion' WHERE script_name = '$scriptName';"
            $recordCmd = "mysql $DEPLOYMENT_DB_NAME -e ""$recordSql"""
        }
        else {
            # Record exists, but ForceRerun was *not* specified.
            # This state should only be reached if the first check passed (i.e. script not applied),
            # but the second check found it (unlikely race condition, but possible?).
            # Or, if the script logic reached here erroneously after skipping in the outer loop.
            # Better to log a warning or potentially error here, as it's an unexpected state if ForceRerun is false.
            Write-Log -Message "Warning: SQL script '$scriptName' record found unexpectedly before INSERT/UPDATE. Skipping DB record update." -Level "WARNING" -LogFilePath $BuildLog
            # Don't move the local script if skipped
            continue # Move to the next script
        }
         
        # Only invoke if recordCmd was actually set
        if ($recordCmd) {
            Write-Log -Message "Recording application of SQL script '$scriptName' in database." -Level "INFO" -LogFilePath $BuildLog
            Invoke-SshCommand -Command $recordCmd -ActionDescription "record SQL script '$newScriptName' application in database" -BuildLog $BuildLog -IsFatal $true # Fatal if we can't record it
        }
        

        # --- Archive the script locally and on server ---
        Write-Log -Message "Archiving successful script '$scriptName' to server: $serverArchivePath" -Level "INFO" -LogFilePath $BuildLog
        Invoke-WslRsync -SourcePath $wslLocalScriptPath -DestinationPath $serverArchivePath -Purpose "archive successful SQL script '$scriptName' to server"

        Write-Log -Message "Moving successful script '$scriptName' locally to: $localCompletedPath" -Level "INFO" -LogFilePath $BuildLog
        Move-Item -Path $localScriptPath -Destination $localCompletedPath -Force -ErrorAction Stop

        Write-Log -Message "Successfully applied and processed SQL script: $scriptName" -Level "SUCCESS" -LogFilePath $BuildLog
    }

    Write-Log -Message "Finished applying SQL release scripts." -Level "SUCCESS" -LogFilePath $BuildLog
}

Function Restart-Services {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FlaskServiceName, # The environment-specific service name
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    Write-Log -Message "`n--- Step 7: Restart Services ---" -Level "INFO" -LogFilePath $BuildLog

    $systemctlPath = "/bin/systemctl"

    # Restart Flask Service (Critical)
    Write-Log -Message "Restarting Flask service ('$FlaskServiceName')..." -Level "INFO" -LogFilePath $BuildLog

    $flaskRestartCmd = "$systemctlPath restart '$FlaskServiceName'"
    Invoke-SshCommand -Command $flaskRestartCmd `
        -UseSudo `
        -ActionDescription "restart Flask service '$FlaskServiceName'" `
        -BuildLog $BuildLog `
        -IsFatal $true

    # Restart Nginx (Non-Critical - Warning only)
    $nginxServiceName = "nginx" # Consider making this configurable via .deployment_env
    Write-Log -Message "Restarting Nginx service ('$nginxServiceName')..." -Level "INFO" -LogFilePath $BuildLog
    $nginxRestartCmd = "$systemctlPath restart '$nginxServiceName'"
    Invoke-SshCommand -Command $nginxRestartCmd `
        -UseSudo `
        -ActionDescription "restart Nginx service '$nginxServiceName'" `
        -BuildLog $BuildLog `
        -IsFatal $false

    Write-Log -Message "Service restarts attempted." -Level "SUCCESS" -LogFilePath $BuildLog
}

Function Remove-OldBackups {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ParentDir, # The directory containing the backups (e.g., /path/to/backups)
        [Parameter(Mandatory = $true)]
        [string]$Prefix, # The prefix of the backup items (e.g., "flask_", "db_backup_")
        [Parameter(Mandatory = $false)]
        [string]$Suffix = "", # Optional suffix (e.g., ".sql")
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    $maxKeep = [int]$DEPLOYMENT_BACKUP_COUNT # Ensure it's an integer
    Write-Log -Message "Checking for old backups in '$ParentDir' with prefix '$Prefix' (keeping $maxKeep)..." -Level "INFO" -LogFilePath $BuildLog

    # Use find to list items with Unix timestamp, sort numerically (oldest first)
    # -maxdepth 1: Don't go into subdirs
    # -name "$Prefix*$Suffix": Match the pattern
    # -printf '%T@ %p\n': Print Unix timestamp and path, separated by space
    # sort -n: Sort numerically by timestamp (oldest first)
    $listCommand = "find '$ParentDir' -maxdepth 1 -name '$Prefix*$Suffix' -printf '%T@ %p\n' | sort -n"

    $listResult = Invoke-SshCommand -Command $listCommand `
        -ActionDescription "list backups matching '$Prefix*$Suffix' in '$ParentDir'" `
        -BuildLog $BuildLog `
        -IsFatal $false `
        -CaptureOutput

    if ($listResult.ExitCode -ne 0) {
        Write-Log -Message "Could not list backups in '$ParentDir'. Skipping cleanup for '$Prefix'." -Level "WARNING" -LogFilePath $BuildLog
        return
    }

    # Split the output into lines, remove empty lines, and parse
    $backupItems = $listResult.StdOut.Split([Environment]::NewLine, [StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object {
        $path = $_.Substring($_.IndexOf(' ') + 1)
        $path
    }

    $count = $backupItems.Count
    Write-Log -Message "Found $count backups matching '$Prefix*$Suffix'." -Level "INFO" -LogFilePath $BuildLog

    if ($count -gt $maxKeep) {
        $toDeleteCount = $count - $maxKeep
        Write-Log -Message "Need to delete $toDeleteCount oldest backup(s)." -Level "INFO" -LogFilePath $BuildLog

        # Get the oldest items to delete (first $toDeleteCount items from the sorted list)
        $itemsToDelete = $backupItems | Select-Object -First $toDeleteCount

        foreach ($itemPath in $itemsToDelete) {
            $deleteCommand = "rm -rf '$itemPath'"

            write-Log -Message "Attempting to delete old backup: $itemPath" -Level "INFO" -LogFilePath $BuildLog
            Invoke-SshCommand -Command $deleteCommand `
                -ActionDescription "delete old backup '$itemPath'" `
                -BuildLog $BuildLog `
                -IsFatal $false
        }
        Write-Log -Message "Old backups deleted successfully." -Level "SUCCESS" -LogFilePath $BuildLog
    }
    else {
        Write-Log -Message "Backup count ($count) is within limit ($maxKeep). No cleanup needed for '$Prefix*$Suffix'." -Level "INFO" -LogFilePath $BuildLog
    }
}

Function Invoke-SshCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command, # The command or script block to execute
        [Parameter(Mandatory = $false)]
        [switch]$UseSudo, # If set, prepend 'sudo ' to the command
        [Parameter(Mandatory = $true)]
        [string]$BuildLog, # Path to the build log file
        [Parameter(Mandatory = $false)]
        [string]$ActionDescription = "execute remote command", # For logging/error messages
        [Parameter(Mandatory = $false)]
        [switch]$CaptureOutput, # If set, return the standard output
        [Parameter(Mandatory = $false)]
        [bool]$IsFatal = $true, # Treat non-zero exit code as fatal by default
        [Parameter(Mandatory = $false)]
        [string]$FailureCleanupCommand = "" # Optional command to run on failure        
    )

    $remoteCommand = $Command
    if ($UseSudo) {
        # Apply sudo within the command executed by SSH
        $remoteCommand = "sudo $remoteCommand"
    }

    # --- WSL Execution Setup ---
    $wslExe = "wsl.exe"
    # Base arguments for wsl.exe to run ssh
    $wslArgsList = @(
        "-u", $DEPLOYMENT_WSL_SSH_USER, # Run as the specified WSL user
        "ssh", # Command to run inside WSL
        "-i", $DEPLOYMENT_WSL_SSH_KEY_PATH, # SSH key path *within WSL*
        "-o", "BatchMode=yes", # Disable password prompts for non-interactive mode
        "${DEPLOYMENT_SERVER_USER}@${DEPLOYMENT_SERVER_IP}", # Target server
        $remoteCommand                  # The actual command to execute on the remote server
    )
    
    Write-Log -Message "Executing via WSL ($ActionDescription): $wslExe $($wslArgsList -join ' ')" -Level "INFO" -LogFilePath $BuildLog

    $sshOutput = ""
    $sshExitCode = -1
    $stdErrOutput = ""

    try {
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = $wslExe

        $wslArgsList | ForEach-Object { $processInfo.ArgumentList.Add($_) }
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null

        $sshOutput = $process.StandardOutput.ReadToEnd()
        $stdErrOutput = $process.StandardError.ReadToEnd()

        $process.WaitForExit()
        $sshExitCode = $process.ExitCode

        # Log output/error
        if ($sshOutput) {
            Write-Log -Message "WSL/SSH StdOut: $sshOutput" -Level "INFO" -LogFilePath $BuildLog
        }
        if ($stdErrOutput) {
            if ($sshExitCode -ne 0) {
                Write-Log -Message "WSL/SSH StdErr: $stdErrOutput" -Level "ERROR" -LogFilePath $BuildLog
            }
            else {
                Write-Log -Message "WSL/SSH StdErr: $stdErrOutput" -Level "INFO" -LogFilePath $BuildLog
            }
        }
    }
    catch {
        Write-Log -Message "FATAL: WSL/SSH command execution failed for '$ActionDescription'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }

    if ($sshExitCode -ne 0) {
        $errorMessage = "Failed to $ActionDescription via WSL. Exit Code: $sshExitCode."

        # Attempt cleanup if specified
        if ($FailureCleanupCommand) {
            Write-Log -Message "Attempting cleanup command via WSL after failure: $FailureCleanupCommand" -Level "WARNING" -LogFilePath $BuildLog

            # Construct WSL args for the cleanup command
            $cleanupRemoteCommand = $FailureCleanupCommand
            $cleanupWslArgsList = @(
                "-u", $DEPLOYMENT_WSL_SSH_USER,
                "ssh",
                "-i", $DEPLOYMENT_WSL_SSH_KEY_PATH,
                "-o", "BatchMode=yes",
                "${DEPLOYMENT_SERVER_USER}@${DEPLOYMENT_SERVER_IP}",
                $cleanupRemoteCommand
            )

            $cleanupExitCode = -1
            try {
                $cleanupProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
                $cleanupProcessInfo.FileName = $wslExe
                $cleanupWslArgsList | ForEach-Object { $cleanupProcessInfo.ArgumentList.Add($_) }
                $cleanupProcessInfo.UseShellExecute = $false
                $cleanupProcessInfo.CreateNoWindow = $true

                $cleanupProcess = New-Object System.Diagnostics.Process
                $cleanupProcess.StartInfo = $cleanupProcessInfo
                $cleanupProcess.Start() | Out-Null
                $cleanupProcess.WaitForExit()
                $cleanupExitCode = $cleanupProcess.ExitCode
            }
            catch {
                Write-Log -Message "Failed to start the WSL cleanup command. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
                $cleanupExitCode = -999
            }

            # Check the exit code from the cleanup process object
            if ($cleanupExitCode -ne 0) {
                Write-Log -Message "WSL cleanup command also failed (Exit Code: $cleanupExitCode)." -Level "ERROR" -LogFilePath $BuildLog
            }
            else {
                Write-Log -Message "WSL cleanup command executed successfully." -Level "SUCCESS" -LogFilePath $BuildLog
            }
        }

        if ($IsFatal) {
            Write-Log -Message "FATAL ($ActionDescription): $errorMessage Check WSL/SSH output above or logs on server. Exiting." -Level "FATAL" -LogFilePath $BuildLog # Changed Level to FATAL
            throw "Halting due to fatal error during '$ActionDescription'."
        }
        else {
            Write-Log -Message "Warning ($ActionDescription): $errorMessage Check WSL/SSH output above or logs on server. Continuing." -Level "WARNING" -LogFilePath $BuildLog
        }
    }
    else {
        Write-Log -Message "$ActionDescription via WSL completed successfully." -Level "SUCCESS" -LogFilePath $BuildLog
    }

    if ($CaptureOutput) {
        $outputObject = [PSCustomObject]@{
            StdOut   = $sshOutput
            StdErr   = $stdErrOutput
            ExitCode = $sshExitCode
        }
        return $outputObject
    }
    # Otherwise, return success/failure status.
    return ($sshExitCode -eq 0)
}

Function Invoke-WslRsync {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath, # WSL path, ensure trailing slash if copying contents
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath, # Server path, ensure trailing slash if copying contents
        [Parameter(Mandatory = $true)]
        [string]$Purpose, # e.g., "React build files"
        [Parameter(Mandatory = $false)]
        [string[]]$ExcludePatterns = @()
    )
    # Construct the SSH command for rsync's -e option using the specific key
    $rsyncSshOptionValue = "ssh -i $DEPLOYMENT_WSL_SSH_KEY_PATH"

    # Base rsync arguments
    $rsyncArgs = @("-avz", "--delete", "--checksum")
    $rsyncArgs += "-e", $rsyncSshOptionValue

    # Add excludes
    if ($ExcludePatterns.Count -gt 0) {
        $rsyncArgs += ($ExcludePatterns | ForEach-Object { "--exclude=$_" }) # Pass excludes directly
    }

    # Add source and destination paths
    $destinationSpec = "${DEPLOYMENT_SERVER_USER}@${DEPLOYMENT_SERVER_IP}:$($DestinationPath)"
    $rsyncArgs += $SourcePath, $destinationSpec

    # Construct the arguments for wsl.exe
    $wslArgs = @("-u", $DEPLOYMENT_WSL_SSH_USER, "rsync") + $rsyncArgs

    Write-Log -Message "Executing WSL command for ${Purpose}: wsl $($wslArgs -join ' ')" -Level "INFO" -LogFilePath $BuildLog

    $rsyncExitCode = -1
    try {
        # Use Start-Process with ArgumentList for wsl.exe
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "wsl.exe"
        foreach ($arg in $wslArgs) {
            $processInfo.ArgumentList.Add($arg)
        }
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null

        # Log output/error streams
        $stdOut = $process.StandardOutput.ReadToEnd()
        $stdErr = $process.StandardError.ReadToEnd()

        $process.WaitForExit()
        $rsyncExitCode = $process.ExitCode

        if ($stdOut) {
            Write-Log -Message "Rsync StdOut: $stdOut" -Level "INFO" -LogFilePath $BuildLog
        }
        if ($stdErr) {
            # Log stderr as warning or error depending on exit code
            if ($rsyncExitCode -ne 0) {
                Write-Log -Message "Rsync StdErr: $stdErr" -Level "ERROR" -LogFilePath $BuildLog
            }
            else {
                Write-Log -Message "Rsync StdErr: $stdErr" -Level "INFO" -LogFilePath $BuildLog
            }
        }

    }
    catch {
        Write-Log -Message "FATAL: Failed to start WSL rsync process for $Purpose. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
        # Exit code remains non-zero
    }

    if ($rsyncExitCode -ne 0) {
        Write-Log -Message "FATAL: Failed to sync $Purpose using rsync (Exit Code: $rsyncExitCode). Check WSL user '$DEPLOYMENT_WSL_SSH_USER', key '$DEPLOYMENT_WSL_SSH_KEY_PATH', rsync output above, SSH connectivity, and paths ($SourcePath -> $DestinationPath). Exiting.", -Level "FATAL" -LogFilePath $BuildLog
        throw "Halting due to fatal error during rsync for '$Purpose'."
    }
    else {
        Write-Log -Message "$Purpose synced successfully." -Level "SUCCESS" -LogFilePath $BuildLog
    }
}

Function Test-Logfile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptRoot, # Path to the script root directory
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    # Create a new log file or clear the existing one
    try {
        # Test if the log file can be created or updated
        Write-Host "Confirming Log File: $BuildLog"
        try {
            # Create a 0-byte file or update timestamp if it exists. Creates dirs if needed.
            New-Item -Path $BuildLog -ItemType File -Force -ErrorAction Stop | Out-Null 
            Write-Host "Log file Confirmed." -ForegroundColor Green
        }
        catch {
            Write-Error "FATAL: Failed to create log file '$BuildLog'. Check path and permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
        }

        # Test if the log file is writable
        Write-Host "Log file Permission Check: $BuildLog"
        try {
            Add-Content -Path $BuildLog -Value "Permission Check Write Test - $(Get-Date)" -ErrorAction Stop
            Write-Host "Log Write Test Passed" -ForegroundColor Green
        }
        catch {
            Write-Error "FATAL: Failed direct write test to '$BuildLog'. Check Permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
        }

        # Finally, test the Write-Log function itself
        Write-Host "Testing Write-Log Function: $BuildLog"
        try {
            # Test the Write-Log function with a sample message
            Write-Log -Message "Test Write-Log Function INFO: $BuildLog" -Level "INFO" -LogFilePath $BuildLog
        
            # Test with different log levels
            Write-Log -Message "Test Write-Log Function WARN: $BuildLog" -Level "WARN" -LogFilePath $BuildLog
            Write-Log -Message "Test Write-Log Function DEBUG: $BuildLog" -Level "DEBUG" -LogFilePath $BuildLog
            Write-Log -Message "Test Write-Log Function INFO, No Console: $BuildLog" -Level "INFO" -LogFilePath $BuildLog -NoConsole

            Write-Log -Message "Write-Log Function Test Passed: $BuildLog" -Level "SUCCESS" -LogFilePath $BuildLog
        }
        catch {
            # Handle any errors in the logging process itself
            Write-Host "FATAL: Write-Log function test failed. Error: $($_.Exception.Message)" -ErrorAction Stop
        }
            
    }
    catch {
        Write-Error "FATAL: Failed to open log file '$BuildLog'. Check path and permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
    }
}

Function Open-Logfile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BuildLog # Path to the script root directory
    )

    #--- Open Log File in Notepad++ ---
    if (Test-Path $BuildLog -PathType Leaf) {
        Write-Host "`nAttempting to open log file '$BuildLog' in Notepad++..." -ForegroundColor Gray
        try {
            # Try assuming notepad++.exe is in the system PATH first
            # Start-Process -FilePath "notepad++.exe" -ArgumentList $BuildLog -ErrorAction Stop 
                
            # Using custom ahk script to launch Notepad++ with monitoring mode on
            $launcherPath = Join-Path $ScriptRoot "LaunchNPP_Monitor.exe"
            if (-not (Test-Path $launcherPath)) {
                Write-Warning "Launcher script not found at '$launcherPath'. Not launching Notepad++."
                return
            }
            Start-Process "`"$launcherPath`"" -ArgumentList "`"$BuildLog`""

            Write-Host "-> Notepad++ launched." -ForegroundColor Gray
        } 
        catch {
            # Handle error if notepad++.exe is not found in Program Files (x86) or fails to launch
            Write-Warning "Could not automatically launch Notepad++."
        }
    }
            
    else {
        Write-Warning "Could not find log file at '$BuildLog' to open."
    }
}

Function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Message, # Allow any object, convert to string

        [Parameter(Mandatory = $false)]
        [ValidateSet("INFO", "SUCCESS", "WARN", "WARNING", "ERROR", "DEBUG", "FATAL")]
        [string]$Level = "INFO",

        [Parameter(Mandatory = $true)]
        [string]$LogFilePath,

        [Parameter(Mandatory = $false)]
        [switch]$NoConsole # Optionally suppress console output
    )

    # --- Prepare Log Entry ---
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Convert message object to string if needed
    if ($Message -isnot [string]) {
        $messageString = $Message | Out-String
    }
    else {
        $messageString = $Message
    }

    # Trim trailing whitespace often added by Out-String
    $messageString = $messageString.Trim() 

    $logEntry = "$timestamp [$($Level.ToUpper())] $messageString"

    # --- Write to Console (Conditional) ---
    if (-not $NoConsole) {
        switch ($Level.ToUpper()) {
            "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
            "WARN" { Write-Warning $logEntry }
            "WARNING" { Write-Warning $logEntry }
            "ERROR" { Write-Error $logEntry }
            "FATAL" { Write-Error $logEntry }
            "DEBUG" { Write-Host $logEntry -ForegroundColor DarkGray }
            default { Write-Host $logEntry -ForegroundColor Cyan }
        }
    }

    # --- Append to Log File ---
    try {
        $logEntry | Out-File -FilePath $LogFilePath -Append -Encoding UTF8 -ErrorAction Stop
    }
    catch {
        # Critical failure: Can't write to log file. Output to console error stream instead.
        Write-Error "CRITICAL LOGGING FAILURE: Could not write to '$LogFilePath'. Original message: [$Level] $messageString. Error: $($_.Exception.Message)"
        # Throwing here as the log is essential for tracking deployment issues
        throw "Logging failed. Halting execution." 
    }
}

Function Invoke-VersionManagement {
    param(
        [Parameter(Mandatory = $false)]
        [string]$InitialBumpType,

        [Parameter(Mandatory = $false)]
        [string]$InitialVersion,

        [Parameter(Mandatory = $true)]
        [hashtable]$BoundParams,

        [Parameter(Mandatory = $true)]
        [string]$BuildLog,

        [Parameter(Mandatory = $true)]
        [string]$ConfigGitRepoPath,

        [Parameter(Mandatory = $true)]
        [string]$LogDir,

        [Parameter(Mandatory = $true)]
        [string]$Timestamp
    )

    # This variable will hold the version to be deployed and will be returned
    $determinedVersion = $null

    # If the bump type = none, skip the bumping process
    if ($InitialBumpType -eq "none") {
        Write-Log -Message "Skipping version bumping process as BumpType is set to 'none'." -Level "INFO" -LogFilePath $BuildLog
        $determinedVersion = "test_deployment"
    }
    else {
        $baseVersionForBumpOverride = $null
        # Use InitialBumpType if it was actually passed to the script
        $effectiveBumpTypeForFunction = if ($BoundParams.ContainsKey('BumpType')) { $InitialBumpType } else { $null }

        if ($BoundParams.ContainsKey('BumpType')) {
            $gitRepoPath = $ConfigGitRepoPath

            $targetBranch = ""
            $sourceBranchForMerge = ""
        
            Write-Log -Message "Version bumping process started for BumpType '$InitialBumpType'." -Level "INFO" -LogFilePath $BuildLog

            Push-Location $gitRepoPath
            $initialGitBranch = (git rev-parse --abbrev-ref HEAD | Out-String -Stream).Trim()
            Write-Log -Message "Initial Git branch: $initialGitBranch. Current directory: $PWD" -Level "INFO" -LogFilePath $BuildLog

            try { 
                switch ($InitialBumpType) {
                    # Use $InitialBumpType as it's the one being processed
                    "major" { $targetBranch = "main"; $sourceBranchForMerge = "qas"; break }
                    "minor" { $targetBranch = "main"; $sourceBranchForMerge = "qas"; break }
                    "patch" { $targetBranch = "main"; $sourceBranchForMerge = "qas"; break }
                    "qas" { $targetBranch = "qas"; $sourceBranchForMerge = "dev"; break }                
                    "dev" { $targetBranch = "dev"; break }
                    "test" { $targetBranch = "test"; break }
                    default { throw "Unsupported BumpType '$InitialBumpType' for branch operations." }
                }

                if ($targetBranch) {
                    Write-Log -Message "Target branch for BumpType '$InitialBumpType' is '$targetBranch'." -Level "INFO" -LogFilePath $BuildLog

                    if ($initialGitBranch -ne $targetBranch) {
                        Write-Log -Message "Switching from '$initialGitBranch' to target branch '$targetBranch'." -Level "INFO" -LogFilePath $BuildLog
                        git checkout $targetBranch
                        if ($LASTEXITCODE -ne 0) { throw "Failed to checkout $targetBranch" }
                    }
                    Write-Log -Message "Ensuring branch '$targetBranch' is up-to-date with origin." -Level "INFO" -LogFilePath $BuildLog
                    git pull origin $targetBranch
                    if ($LASTEXITCODE -ne 0) { throw "Failed to pull $targetBranch" }

                    $versionFilePathOnTargetBranch = Join-Path $PWD "version.txt"

                    if ($InitialBumpType -eq "qas") {
                        $mainVersionGitPath = "main:version.txt" 
                        $mainVersionContent = git show $mainVersionGitPath 2>$null | Out-String -Stream
                        $mainBaseVersionCore = "" 
                        if ($LASTEXITCODE -eq 0 -and $mainVersionContent -and ($mainVersionContent.Trim() -match '^v?(\d+\.\d+\.\d+)')) {
                            $mainBaseVersionCore = $matches[1]
                        }
                        else {
                            throw "Could not determine base version (X.Y.Z) from '$mainVersionGitPath'"
                        }

                        if (Test-Path $versionFilePathOnTargetBranch) {
                            $currentVersionOnTarget = (Get-Content $versionFilePathOnTargetBranch).Trim()
                            if ($currentVersionOnTarget -match "^v?${mainBaseVersionCore}-${InitialBumpType}\.\d+$") {
                                $baseVersionForBumpOverride = $currentVersionOnTarget
                                Write-Log -Message "Using iterative base '$baseVersionForBumpOverride' from '$targetBranch/version.txt' for $InitialBumpType bump." -Level "INFO" -LogFilePath $BuildLog
                            }
                            else {
                                $baseVersionForBumpOverride = "v$mainBaseVersionCore"
                                Write-Log -Message "Resetting $InitialBumpType base to '$baseVersionForBumpOverride' (from $mainVersionGitPath) as current '$targetBranch/version.txt' ('$currentVersionOnTarget') is for a different base or not a '$InitialBumpType' pre-release." -Level "INFO" -LogFilePath $BuildLog
                            }
                        }
                        else {
                            $baseVersionForBumpOverride = "v$mainBaseVersionCore" 
                            Write-Log -Message "No '$versionFilePathOnTargetBranch' found on $targetBranch. Setting $InitialBumpType base to '$baseVersionForBumpOverride' (derived from $mainVersionGitPath)." -Level "INFO" -LogFilePath $BuildLog
                        }
                    }
                    elseif ($InitialBumpType -eq "major" -or $InitialBumpType -eq "minor" -or $InitialBumpType -eq "patch") {
                        if (Test-Path $versionFilePathOnTargetBranch) { 
                            $baseVersionForBumpOverride = (Get-Content $versionFilePathOnTargetBranch).Trim()
                            Write-Log -Message "Using base '$baseVersionForBumpOverride' from '$targetBranch/version.txt' (pre-merge) for $InitialBumpType bump." -Level "INFO" -LogFilePath $BuildLog
                        }
                        else {
                            throw "Version file '$versionFilePathOnTargetBranch' not found on $targetBranch for $InitialBumpType bump, and it's required."
                        }
                    }
                    elseif ($InitialBumpType -eq "dev" -or $InitialBumpType -eq "test") {
                        Write-Log -Message "For '$InitialBumpType' bump, BaseVersionOverride is not set; function will use '$targetBranch/version.txt'." -Level "INFO" -LogFilePath $BuildLog
                    }

                    if ($sourceBranchForMerge) {
                        Write-Log -Message "Merging '$sourceBranchForMerge' into '$targetBranch'." -Level "INFO" -LogFilePath $BuildLog
                        git merge --no-ff $sourceBranchForMerge -m "Merge branch '$sourceBranchForMerge' into '$targetBranch' for $InitialBumpType release prep"
                        if ($LASTEXITCODE -ne 0) {
                            Write-Log -Message "Merge conflict likely detected when merging '$sourceBranchForMerge' into '$targetBranch'. Attempting 'git merge --abort'." -Level "ERROR" -LogFilePath $BuildLog
                            git merge --abort
                            throw "Merge failed from '$sourceBranchForMerge' to '$targetBranch'. Resolve conflicts and retry."
                        }
                        Write-Log -Message "Merge of '$sourceBranchForMerge' into '$targetBranch' successful." -Level "INFO" -LogFilePath $BuildLog
                    }
                }
            
                $determinedVersion = Invoke-VersionBump -BumpType $effectiveBumpTypeForFunction `
                    -VersionFilePath $versionFilePathOnTargetBranch `
                    -PackageJsonPath (Join-Path $PWD "satisfactory_tracker/package.json") `
                    -GitRepoPath $PWD `
                    -BuildLog $BuildLog `
                    -BaseVersionOverride $baseVersionForBumpOverride

                # Sync dev and qas branches with main after a successful production release
                if ($effectiveBumpTypeForFunction -in ("major", "minor", "patch")) {
                    Write-Log -Message "`n--- Syncing Supporting Branches with Main ---" -Level "INFO" -LogFilePath $BuildLog
                    
                    $branchesToSyncWithMain = @("dev", "qas")
                    $currentBranchInLoop = "main"

                    foreach ($branchToSync in $branchesToSyncWithMain) {
                        Write-Log -Message "Attempting to sync branch '$branchToSync' with $currentBranchInLoop (new version: $determinedVersion)." -Level "INFO" -LogFilePath $BuildLog
                        try {
                            Write-Log -Message "Checking out '$branchToSync'..." -Level "INFO" -LogFilePath $BuildLog
                            git checkout $branchToSync
                            if ($LASTEXITCODE -ne 0) { throw "Failed to checkout branch '$branchToSync'." }
                            $currentBranchInLoop = $branchToSync

                            Write-Log -Message "Pulling latest for '$branchToSync' from origin..." -Level "INFO" -LogFilePath $BuildLog
                            git pull origin $branchToSync
                            if ($LASTEXITCODE -ne 0) { throw "Failed to pull 'origin/$branchToSync'." }
                        
                            Write-Log -Message "Merging 'main' into '$branchToSync'..." -Level "INFO" -LogFilePath $BuildLog
                            git merge main -m "Auto-merge main into $branchToSync after production release $determinedVersion"
                            if ($LASTEXITCODE -ne 0) {
                                Write-Log -Message "WARNING: Merge of 'main' into '$branchToSync' resulted in conflicts or failure. Attempting 'git merge --abort'. Manual sync required for '$branchToSync'." -Level "WARNING" -LogFilePath $BuildLog
                                git merge --abort
                                continue 
                            }
                        
                            Write-Log -Message "Pushing updated '$branchToSync' to origin..." -Level "INFO" -LogFilePath $BuildLog
                            git push origin $branchToSync
                            if ($LASTEXITCODE -ne 0) { throw "Failed to push '$branchToSync' to origin after merging main." }
                        
                            Write-Log -Message "Branch '$branchToSync' successfully synced with 'main' and pushed." -Level "SUCCESS" -LogFilePath $BuildLog
                        }
                        catch {
                            Write-Log -Message "ERROR during sync of branch '$branchToSync': $($_.Exception.Message). Manual sync will be required." -Level "ERROR" -LogFilePath $BuildLog
                            if ((git status --porcelain | Out-String).Trim().Length -gt 0) {
                                Write-Log -Message "Branch '$branchToSync' has uncommitted changes or is in a conflicted state after sync error. Manual cleanup needed." -Level "WARN" -LogFilePath $BuildLog
                            }
                        }
                    }
                
                    $finalLoopBranch = (git rev-parse --abbrev-ref HEAD | Out-String -Stream).Trim()
                    if ($finalLoopBranch -ne "main") {
                        Write-Log -Message "Switching back to 'main' branch after sync operations (current: $finalLoopBranch)." -Level "INFO" -LogFilePath $BuildLog
                        git checkout main
                        if ($LASTEXITCODE -ne 0) { Write-Log -Message "WARNING: Failed to checkout 'main' after branch sync loop." -Level "WARN" -LogFilePath $BuildLog }
                    }
                }
            }
            catch {
                Write-Log -Message "FATAL: Error during version bumping process or branch synchronisation. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $BuildLog
                if ($initialGitBranch -and (git rev-parse --abbrev-ref HEAD | Out-String -Stream).Trim() -ne $initialGitBranch) {
                    Write-Log -Message "Attempting to switch back to initial branch '$initialGitBranch' after error..." -Level "WARN" -LogFilePath $BuildLog
                    git checkout $initialGitBranch 
                }
                throw 
            }
            finally {
                $currentBranchAfterOps = (git rev-parse --abbrev-ref HEAD | Out-String -Stream).Trim()
                if ($initialGitBranch -and ($currentBranchAfterOps -ne $initialGitBranch)) {
                    Write-Log -Message "Switching back to original script-invoking branch '$initialGitBranch' from '$currentBranchAfterOps'." -Level "INFO" -LogFilePath $BuildLog
                    git checkout $initialGitBranch
                    if ($LASTEXITCODE -ne 0) {
                        Write-Log -Message "WARNING: Failed to switch back to original branch '$initialGitBranch'. You may need to manually run: git checkout $initialGitBranch" -Level "WARN" -LogFilePath $BuildLog
                    }
                }
                Pop-Location 
                Write-Log -Message "Version bumping and any post-sync operations finished. Current directory: $PWD" -Level "INFO" -LogFilePath $BuildLog
            }
        }
        elseif ($BoundParams.ContainsKey('Version')) {
            $determinedVersion = $InitialVersion
            Write-Log -Message "Using specified pre-existing version for deployment: $determinedVersion (no bump)" -Level "INFO" -LogFilePath $BuildLog
        }
        else {
            Write-Log -Message "FATAL: No version specified and no bump type selected. Cannot determine deployed version." -Level "FATAL" -LogFilePath $BuildLog
            throw "Cannot determine deployed version. Script logic error or missing parameters."
        }
    }
    # --- Rename Log File ---
    $finalLogPathValue = $BuildLog # Default to old path in case of renaming failure

    if ($determinedVersion) {
        $finalLogName = "build_${determinedVersion}_${Timestamp}.log"
        Write-Log -Message "Attempting to rename log file from '$BuildLog' to (new name based on version: '$finalLogName')..." -Level "INFO" -LogFilePath $BuildLog
        try {
            Rename-Item -Path $BuildLog -NewName $finalLogName -ErrorAction Stop
            $finalLogPathValue = Join-Path $LogDir $finalLogName # Construct the new full path
            # This log message is written to the file *before* its name is changed on disk by Rename-Item.
            Write-Log -Message "Log file renamed successfully to '$finalLogPathValue'." -Level "INFO" -LogFilePath $BuildLog
        }
        catch {
            Write-Log -Message "Warning: Failed to rename log file '$BuildLog' to '$finalLogName'. File might be locked. Log will continue using the temporary name '$BuildLog'. Error: $($_.Exception.Message)" -Level "WARNING" -LogFilePath $BuildLog
            # $finalLogPathValue remains $BuildLog (the original path)
        }
    }
    else {
        Write-Log -Message "Skipping log rename as version was not successfully determined." -Level "WARN" -LogFilePath $BuildLog
    }

    return @{ Version = $determinedVersion; FinalLogPath = $finalLogPathValue }
}
######################################################################################
#------------------------------ Start of Main Script --------------------------------#

# --- Obtain Version Parameters ---
if (-not ($PSBoundParameters.ContainsKey('Version') -or $PSBoundParameters.ContainsKey('BumpType'))) {
    Write-Host "`nDeployment Version:" -ForegroundColor Yellow
    $choice = ''
    while ($choice -ne 'v' -and $choice -ne 'b') {
        $choice = Read-Host "Deploy existing [V]ersion or [B]ump version? (v/b)"
    }

    if ($choice -eq 'v') {
        $validVersion = $false
        while (-not $validVersion) {
            $Version = Read-Host "Enter existing version tag to deploy (e.g., v1.2.3)"
            if ($Version -match '^v?(\d+)\.(\d+)\.(\d+)(?:-(dev|qas|test)\.(\d+))?$') {
                $validVersion = $true
            }
            else {
                Write-Warning "Invalid format. Please use 'vX.X.X' (e.g., v1.2.3)."
            }
        }
        # Update the PSBoundParameter Version
        $PSBoundParameters['Version'] = $Version
    }
    else {
        # $choice -eq 'b'
        $validBump = $false
        $allowedBumpTypes = @("major", "minor", "patch", "dev", "test", "qas", "none")
        while (-not $validBump) {
            $BumpType = Read-Host "Enter bump type ($($allowedBumpTypes -join ', '))"
            if ($allowedBumpTypes -contains $BumpType) {
                $validBump = $true
            }
            else {
                Write-Warning "Invalid bump type. Please choose from: $($allowedBumpTypes -join ', ')."
            }
        }
        # Update the PSBoundParameter BumpType
        $PSBoundParameters['BumpType'] = $BumpType
    }
}

# --- Define Script Root ---
$scriptRoot = $PSScriptRoot

# --- Define Timestamp ---
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# --- Define Logging ---
$logDir = Join-Path $scriptRoot "build_logs"
# Create the log directory if it doesn't exist
if (-not (Test-Path $logDir)) {
    Write-Host "Creating log directory: $logDir" # Add output
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    if (-not (Test-Path $logDir)) {
        Write-Error "FATAL: Failed to create log directory '$logDir'. Check permissions." -ErrorAction Stop
    }
}
# Create a log file name based on the version and timestamp
# Use a temporary name until version is determined
# Append $AppendTestRun if it's not empty
if ($AppendTestRun) {
    # Checks if the string is not null or empty
    $tempLogName = "build_pending_${timestamp}_${AppendTestRun}.log"
}
else {
    $tempLogName = "build_pending_$timestamp.log"
}

$buildLog = Join-Path $logDir $tempLogName

# Open the log file for writing (using the temporary name initially)
Test-Logfile -BuildLog $buildLog -ScriptRoot $scriptRoot

# --- Initialise Configuration ---
$configData = Initialize-DeploymentConfiguration -Environment $Environment `
    -ScriptRoot $scriptRoot `
    -BuildLog $buildLog

# --- Assign Local and Target Environment Variables ---
$localEnvSettings = $configData.LocalEnvSettings
$runMode = $localEnvSettings['REACT_APP_RUN_MODE'].ToUpper() # e.g., "DEV", "QAS", "PROD", "TEST"
$flaskEnv = $localEnvSettings['FLASK_ENV'].ToUpper() # e.g., "DEVELOPEMENT", "TESTING", "PRODUCTION"

# Target environment variables (using script-scoped variables set by Initialize-DeploymentConfiguration)
$targetEnv = $DEPLOYMENT_TARGET 
$targetFlaskEnv = $DEPLOYMENT_FLASK_ENV

# --- Construct Derived Variables ---
# Directories for the local machine
$localFlaskDir = Join-Path $DEPLOYMENT_LOCAL_BASE_DIR "flask_server"
$localFrontendDir = Join-Path $DEPLOYMENT_LOCAL_BASE_DIR "satisfactory_tracker"

# Directories for the server
$serverFlaskBaseDir = "$DEPLOYMENT_SERVER_BASE_DIR/flask_server"
$serverFlaskAppDir = "$serverFlaskBaseDir/app"
$serverFrontendBaseDir = "$DEPLOYMENT_SERVER_BASE_DIR/satisfactory_tracker"
$serverFrontendBuildDir = "$serverFrontendBaseDir/build"
$backupDirFlask = "$DEPLOYMENT_BACKUP_DIR/flask_$timestamp"
$backupDirFrontend = "$DEPLOYMENT_BACKUP_DIR/frontend_$timestamp"
$backupDirDataBase = "$DEPLOYMENT_BACKUP_DIR/db_backup_$timestamp.sql"

# --- Construct Server URL for Display ---
$displayUrl = ""
if ($Environment.ToUpper() -eq "PROD") {
    # For PROD, use the main domain directly
    $displayUrl = "https://$DEPLOYMENT_DOMAIN"
}
else {
    # For non-PROD, use the subdomain format
    $displayUrl = "https://$($Environment.ToLower()).$DEPLOYMENT_DOMAIN" 
}

# --- Path Translation for WSL ---
$wslLocalFlaskDir = Convert-WindowsPathToWslPath -WindowsPath $localFlaskDir
$wslLocalFrontendDir = Convert-WindowsPathToWslPath -WindowsPath $localFrontendDir
$wslLocalFlaskDirApp = "$wslLocalFlaskDir/app" # Source directory for local flask app files
$wslLocalFrontendDirBuild = "$wslLocalFrontendDir/build" # Source directory for local build files

######################################################################################
# --------------------- Environment Check and Version Control  --------------------- #

# --- Check Environment & Confirm Whether to Proceed with Deployment ---
Confirm-DeploymentEnvironment -TargetEnv $targetEnv `
    -RunMode $runMode `
    -TargetFlaskEnv $targetFlaskEnv `
    -FlaskEnv $flaskEnv `
    -BuildLog $buildLog

# --- Determine Version to Deploy & Finalise Log File Name ---
$versionManagementResult = Invoke-VersionManagement -InitialBumpType $BumpType `
    -InitialVersion $Version `
    -BoundParams $PSBoundParameters `
    -BuildLog $buildLog `
    -ConfigGitRepoPath $DEPLOYMENT_GIT_REPO_PATH `
    -LogDir $logDir `
    -Timestamp $timestamp

# --- Set Deployment Version and Final Log Path ---
$Script:DeploymentVersion = $versionManagementResult.Version
$buildLog = $versionManagementResult.FinalLogPath

if (-not $Script:DeploymentVersion) {
    Write-Log -Message "FATAL: Failed to determine deployment version from Invoke-VersionManagement." -Level "FATAL" -LogFilePath $buildLog # This log uses the potentially new $buildLog path
    throw "Version determination failed."
}
if (-not $buildLog) {
    Write-Log -Message "FATAL: Failed to determine log file path from Invoke-VersionManagement." -Level "FATAL" -LogFilePath $buildLog # This log uses the potentially new $buildLog path
    throw "Log file path determination failed."
}

# --- Open the log file in Notepad++ with monitoring on ---
Open-Logfile -BuildLog $buildLog

######################################################################################
#-------------------------------- Force ONLY Actions --------------------------------#

# Check if any key starting with 'Force' and ending with 'Only' was bound
$forceOnlySwitchUsed = $PSBoundParameters.Keys.Where({ $_ -like 'Force*Only' -and $PSBoundParameters[$_] })
if ($forceOnlySwitchUsed.Count -gt 0) {
    Write-Log -Message "Force*Only switch detected. Running only the specified step." -Level "WARN" -LogFilePath $buildLog

    if ($ForceReactBuildOnly) {
        Write-Log -Message "--- Running ONLY Step 1: Run React Build Locally ---" -Level "INFO" -LogFilePath $buildLog
        Invoke-ReactBuild -RunBuild 'y' `
            -LocalFrontendDir $localFrontendDir `
            -BuildLog $buildLog `
            -GitRepoPath $DEPLOYMENT_GIT_REPO_PATH
        Write-Log -Message "--- Finished ONLY Step 1 ---" -Level "INFO" -LogFilePath $buildLog
    }
    elseif ($ForceBackupOnly) {
        Write-Log -Message "--- Running ONLY Step 2: Backup Existing Project Files ---" -Level "INFO" -LogFilePath $buildLog
        Backup-ServerState -RunBackup 'y' `
            -BackupDirFlask $backupDirFlask `
            -ServerFlaskDir $serverFlaskBaseDir `
            -BackupDirFrontend $backupDirFrontend `
            -ServerFrontendBuildDir $serverFrontendBuildDir `
            -ServerFrontEndBaseDir $serverFrontendBaseDir `
            -BackupDirDB $backupDirDataBase `
            -DatabaseName $DEPLOYMENT_DB_NAME `
            -DeploymentBackupDir $DEPLOYMENT_BACKUP_DIR `
            -BuildLog $buildLog
        Write-Log -Message "--- Finished ONLY Step 2 ---" -Level "INFO" -LogFilePath $buildLog
    }
    elseif ($ForceSyncFilesToServerOnly) {
        Write-Log -Message "--- Running ONLY Step 3: Deploy Application Files using rsync ---" -Level "INFO" -LogFilePath $buildLog
        Sync-FilesToServer -WslLocalFrontendDirBuild $wslLocalFrontendDirBuild `
            -ServerFrontendBuildDir $serverFrontendBuildDir `
            -ServerFrontendBaseDir $serverFrontendBaseDir `
            -WslLocalFrontendBaseDir $wslLocalFrontendDir `
            -WslLocalFlaskDirApp $wslLocalFlaskDirApp `
            -ServerFlaskAppDir $serverFlaskAppDir `
            -ServerFlaskBaseDir $serverFlaskBaseDir `
            -WslLocalFlaskBaseDir $wslLocalFlaskDir `
            -BuildLog $buildLog
        Write-Log -Message "--- Finished ONLY Step 3 ---" -Level "INFO" -LogFilePath $buildLog
    }
    elseif ($ForceFlaskUpdateOnly) {
        Write-Log -Message "--- Running ONLY Step 4: Install/Upgrade Flask Dependencies ---" -Level "INFO" -LogFilePath $buildLog
        Update-FlaskDependencies -VenvDir $DEPLOYMENT_VENV_DIR `
            -ServerFlaskBaseDir $serverFlaskBaseDir `
            -BuildLog $buildLog
        Write-Log -Message "--- Finished ONLY Step 4 ---" -Level "INFO" -LogFilePath $buildLog
    }
    elseif ($ForceDBMigrationOnly) {
        Write-Log -Message "--- Running ONLY Step 5: Database Migration ---" -Level "INFO" -LogFilePath $buildLog
        Invoke-DatabaseMigration -runDBMigration 'y' `
            -VenvDir $DEPLOYMENT_VENV_DIR `
            -ServerFlaskBaseDir $serverFlaskBaseDir `
            -BuildLog $buildLog
        Write-Log -Message "--- Finished ONLY Step 5 ---" -Level "INFO" -LogFilePath $buildLog
    }
    elseif ($ForceSqlScriptsOnly) {
        Write-Log -Message "--- Running ONLY Step 6: Apply SQL Release Scripts ---" -Level "INFO" -LogFilePath $buildLog
        Invoke-SqlReleaseScripts -BuildLog $buildLog -ForceRerun:$ForceSqlScripts
        Write-Log -Message "--- Finished ONLY Step 6 ---" -Level "INFO" -LogFilePath $buildLog
    }
    elseif ($ForceRestartServicesOnly) {
        Write-Log -Message "--- Running ONLY Step 7: Restart Services ---" -Level "INFO" -LogFilePath $buildLog
        Restart-Services -FlaskServiceName $DEPLOYMENT_FLASK_SERVICE_NAME `
            -BuildLog $buildLog
        Write-Log -Message "--- Finished ONLY Step 7 ---" -Level "INFO" -LogFilePath $buildLog
    }

    Write-Log -Message "Specified single step completed. Exiting script." -Level "INFO" -LogFilePath $buildLog
    return # Exit the script after the forced step is done

} 
######################################################################################
#---------------------------- Normal Full Deployment Flow ---------------------------#
else { 
    Write-Log -Message "No Force*Only switch detected. Running full deployment." -Level "INFO" -LogFilePath $buildLog

    # Step 1: Run React build locally
    Invoke-ReactBuild -RunBuild $runBuild `
        -LocalFrontendDir $localFrontendDir `
        -BuildLog $buildLog `
        -GitRepoPath $DEPLOYMENT_GIT_REPO_PATH

    # Step 2: Backup Existing Project Files
    Backup-ServerState -RunBackup $runBackup `
        -BackupDirFlask $backupDirFlask `
        -ServerFlaskDir $serverFlaskBaseDir `
        -BackupDirFrontend $backupDirFrontend `
        -ServerFrontendBuildDir $serverFrontendBuildDir `
        -BackupDirDB $backupDirDataBase `
        -DatabaseName $DEPLOYMENT_DB_NAME `
        -DeploymentBackupDir $DEPLOYMENT_BACKUP_DIR `
        -BuildLog $buildLog

    # Step 3: Deploy Application Files using rsync
    Sync-FilesToServer -WslLocalFrontendDirBuild $wslLocalFrontendDirBuild `
        -ServerFrontendBuildDir $serverFrontendBuildDir `
        -ServerFrontendBaseDir $serverFrontendBaseDir `
        -WslLocalFrontendBaseDir $wslLocalFrontendDir `
        -WslLocalFlaskDirApp $wslLocalFlaskDirApp `
        -ServerFlaskAppDir $serverFlaskAppDir `
        -ServerFlaskBaseDir $serverFlaskBaseDir `
        -WslLocalFlaskBaseDir $wslLocalFlaskDir `
        -BuildLog $buildLog

    # Step 4: Install/Upgrade Flask Dependencies
    Update-FlaskDependencies -VenvDir $DEPLOYMENT_VENV_DIR `
        -ServerFlaskBaseDir $serverFlaskBaseDir `
        -BuildLog $buildLog

    # Step 5: Database Migration (Optional)
    Invoke-DatabaseMigration -runDBMigration $runDBMigration `
        -VenvDir $DEPLOYMENT_VENV_DIR `
        -ServerFlaskBaseDir $serverFlaskBaseDir `
        -BuildLog $buildLog

    # Step 6: Apply SQL Release Scripts
    Invoke-SqlReleaseScripts -BuildLog $buildLog -ForceRerun:$ForceSqlScripts

    # Step 7: Restart Services
    Restart-Services -FlaskServiceName $DEPLOYMENT_FLASK_SERVICE_NAME `
        -BuildLog $buildLog

    ##################################################################################
    # -------------------------- Final Success Message ------------------------------#

    Write-Log -Message "`nDeployment to $targetEnv for version $Script:DeploymentVersion completed successfully!" -Level "SUCCESS" -LogFilePath $buildLog
    Write-Log -Message "Deployment log saved to '$buildLog'." -Level "INFO" -LogFilePath $buildLog
    Write-Log -Message "Please check the application at $displayUrl" -Level "INFO" -LogFilePath $buildLog
}

# --------------------------------- End of Script ---------------------------------- #
######################################################################################