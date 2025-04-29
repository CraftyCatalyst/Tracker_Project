###########################################################################
#                            DEPLOYMENT SCRIPT                            #
###########################################################################


###########################################################################
#                                                                         #
#                    --------------------------------                     #
#                    !! BEFORE RUNNING THIS SCRIPT !!                     #
#                    --------------------------------                     #
#                                                                         #
# 1. Tag the git repo with the version to be deployed e.g:                #
#    - git tag -a vX.X.X -m "Release version X.X.X"                       #
#    - git push origin main                                               #
#    - git push origin vX.X.X                                             #
# 2. Version standards:                                                   #
#    - Version in SemVer format (e.g., v1.3.0)                            #
#    - See USEFUL_STUFF\Versioning_Control_Standards.md for details.      #
# 2. Please ensure that:                                                  #
#    - The following files are in the same directory as this script:      #
#       - .deployment_env                                                 #                 
#       - LaunchNPP_Monitor.exe                                           #
#      (TODO: Make these paths configurable in the .env file)             #
#    - .env file is in satisfactory_tracker directory so it gets          #
#      picked up by the build process.                                    #
#                                                                         #
###########################################################################

<#
.SYNOPSIS
Deploys the Flask Server and React App to the server for the specified environment.
The script performs the following tasks:
1. Loads environment variables from .deployment_env and .env files.
   - The .deployment_env file contains environment-specific settings.
   - The .env file contains local settings for the React app.    
2. Confirms the deployment environment and user confirmation.
   - Ensures the script is running in the correct environment and prompts for confirmation before proceeding.
3. Backs up existing project files (Flask, React, and database).
4. Builds the React app locally and deploys it to the server.
   - Uses npm to build the React app and rsync to transfer files to the server.
   - The script uses WSL (Windows Subsystem for Linux) for rsync operations.
5. Deploys the Flask app to the server.
   - Uses rsync to transfer Flask app files to the server.
   - Excludes certain directories and files from the transfer (e.g., __pycache__, logs, scripts, etc.).
6. Optionally runs database migrations if specified.
    - Uses Flask-Migrate to handle database migrations.
    - The script checks if the migration is needed based on the specified environment.
7. Cleans up old backups based on the specified retention policy.
   - The script keeps a specified number of backups for each type (Flask, React, and database).   - 
8. Restarts the Flask service and Nginx server on the target server.
    - Uses WSL/SSH to restart the services on the server.

.DESCRIPTION
This script is designed to automate the deployment process of a Flask server and React app to a remote server using rsync and SSH.
PREREQUISITES
    - This script is designed to be run in PowerShell, and it uses WSL (Windows Subsystem for Linux) for rsync operations.
    - It requires SSH access to the target server and passwordless authentication set up for the specified user.
    - It also requires the following tools to be installed on the server:
        - rsync
        - MySQL (for database backup and migration)
        - Flask (backend)
        - React (frontend)
        - Flask-Migrate (for database migrations)
        - Nginx (for web server) including configurations for PROD domain and DEV & QAS subdomains
        - Gunicorn (for serving Flask app) including configurations for PROD domain and DEV & QAS subdomains 

.PARAMETER Environment
Environment - The target environment (PROD, QAS, DEV). Mandatory. 
    - This is used to specify the target environment for deployment.
runDBMigration - The run migration parameter (y/n). Mandatory. 
    - This is used to determine if the database migration should be run as part of the deployment.
Version - The Git tag/version to deploy (e.g., v1.3.0). Mandatory.
    - This is used to specify the version of the code to be deployed.

.EXAMPLE
In PowerShell, run the script with the following command:
    C:/repos/Tracker_Project/deploy_to_droplet.ps1 -Environment PROD -runDBMigration y -Version v1.3.0
or, if you're in the same directory as the script:
    ./deploy_to_droplet.ps1 -Environment PROD -runDBMigration y -Version v1.3.0
If you don't specify any parameters, you will be prompted as follows:
    (prompt)    Supply values for the following parameters:
                Environment: PROD
                runDBMigration: y
                Version: v1.3.0
#>

param(
    [Parameter(Mandatory = $true, HelpMessage = "Specify the target environment. Valid values are: PROD, QAS, DEV")]
    [ValidateSet('PROD', 'QAS', 'DEV')]
    [string]$Environment,

    [Parameter(Mandatory = $true, HelpMessage = "Specify if database migration should run. Valid values are: y, n")]
    [ValidateSet('y', 'n')]
    [string]$runDBMigration,

    [Parameter(Mandatory = $true, HelpMessage = "Specify the Git tag/version to deploy (e.g., v1.3.0)")]
    [ValidatePattern('^v\d+\.\d+\.\d+$', Options = 'IgnoreCase')]
    [string]$Version,

    [Parameter(Mandatory = $true, HelpMessage = "Set to 'n' for new environment creation. Valid values are: y, n")]
    [ValidateSet('y', 'n')]
    [string]$runBackup = 'y', # Default to 'y' for backup unless specified otherwise

    [Parameter(Mandatory = $false, HelpMessage = "Set to 'n' if you've already run npm build.")]
    [ValidateSet('y', 'n')]
    [string]$runBuild = 'y' # Default to 'y' for build unless specified otherwise
)

#------------------------------ Start of Functions ------------------------------ 

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

    # Write-Host "`n--- Initializing Deployment Configuration ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Initializing Deployment Configuration ---" -Level "INFO" -LogFilePath $BuildLog
    
    # --- Define Paths ---
    $depEnvPath = Join-Path $ScriptRoot ".deployment_env"
    
    # --- Load Settings Files ---
    $depEnvSettings = @{}
    $localEnvSettings = @{}
    try {
        # Load environment variables from .deployment_env
        # Write-Host "Loading variables from '$depEnvPath'..." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Loading variables from '$depEnvPath'..." -Level "INFO" -LogFilePath $BuildLog

        $depEnvSettings = Import-EnvFile -FilePath $depEnvPath -BuildLog $BuildLog

        # Define .env path (needs DEPLOYMENT_LOCAL_BASE_DIR from first file)
        $localBaseDir = $depEnvSettings['DEPLOYMENT_LOCAL_BASE_DIR']
        if (-not $localBaseDir) {
            throw "DEPLOYMENT_LOCAL_BASE_DIR key is missing from '$depEnvPath'."
        }
        $localFrontendDir = Join-Path $localBaseDir "satisfactory_tracker"
        $envPath = Join-Path $localFrontendDir ".env"

        # Load the environment variables from the .env
        # Write-Host "Loading variables from '$envPath'..." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Loading variables from '$envPath'..." -Level "INFO" -LogFilePath $BuildLog
        
        $localEnvSettings = Import-EnvFile -FilePath $envPath -BuildLog $BuildLog
    }
    catch {
        # Use $_ directly as it contains the exception object from the throw/catch
        # Write-Error "FATAL: Configuration loading failed. Error: $($_.Exception.Message)" -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
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
    $envSuffix = $Environment.ToUpper() # e.g., "DEV", "QAS", "PROD"

    # Write-Host "Constructing and checking for required environment-specific keys (Suffix: _$envSuffix)..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Constructing and checking for required environment-specific keys (Suffix: _$envSuffix)..." -Level "INFO" -LogFilePath $BuildLog

    foreach ($baseKey in $requiredBaseKeys) {
        $envKey = "${baseKey}_${envSuffix}" # Construct the full key name
        # Write-Host " Checking for key: $envKey" | Tee-Object -FilePath $BuildLog -Append
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
    # Write-Host "Assigning variables in script scope..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Assigning variables in script scope..." -Level "INFO" -LogFilePath $BuildLog

    # Assign environment-specific variables dynamically
    foreach ($baseKey in $requiredBaseKeys) {
        $envKey = $requiredEnvKeys[$baseKey]
        $value = $depEnvSettings[$envKey]
        # Write-Host " Setting script variable: `$${baseKey} = '$value'" | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Setting script variable: `$${baseKey} = '$value'" -Level "INFO" -LogFilePath $BuildLog

        # Use -Scope 1 or -Scope Script to set in the caller's scope
        Set-Variable -Name $baseKey -Value $value -Scope Script -ErrorAction Stop
    }

    # Assign non-environment-specific variables explicitly
    $commonKeys = @('DEPLOYMENT_SERVER_USER', 
        'DEPLOYMENT_SERVER_IP', 
        'DEPLOYMENT_LOCAL_BASE_DIR', 
        'DEPLOYMENT_VENV_DIR', 
        'DEPLOYMENT_DOMAIN',
        'DEPLOYMENT_WSL_SSH_USER',
        'DEPLOYMENT_WSL_SSH_KEY_PATH',
        'DEPLOYMENT_BACKUP_COUNT')
    foreach ($key in $commonKeys) {
        if ($depEnvSettings.ContainsKey($key)) {
            $value = $depEnvSettings[$key]
            # Write-Host " Setting script variable: `$${key} = '$value'" | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "Setting script variable: `$${key} = '$value'" -Level "INFO" -LogFilePath $BuildLog

            Set-Variable -Name $key -Value $value -Scope Script -ErrorAction Stop
        }
        else {
            # Make missing common keys a fatal error
            # Write-Error "FATAL: Required common configuration key '$key' not found in '$depEnvPath'." -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "FATAL: Required common configuration key '$key' not found in '$depEnvPath'." -Level "ERROR" -LogFilePath $BuildLog
            throw "Halting due to missing required common configuration keys."
        }
    }

    # Write-Host "Configuration initialization complete." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Configuration initialization complete." -Level "INFO" -LogFilePath $BuildLog

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

    # Write-Host "`n--- Step 1: Environment Check & Confirmation ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Step 1: Environment Check & Confirmation ---" -Level "INFO" -LogFilePath $BuildLog

    # 1.1: Check if the script is running in the correct environment
    # Note: Using .ToUpper() directly in the comparison
    if ($TargetEnv.ToUpper() -ne $RunMode.ToUpper() -or $TargetFlaskEnv.ToUpper() -ne $FlaskEnv.ToUpper()) {
        # Write-Error "FATAL: Local .env variables (RunMode='$RunMode', FlaskEnv='$FlaskEnv') do not match the target deployment environment (TargetEnv='$TargetEnv', TargetFlaskEnv='$TargetFlaskEnv')." -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: Local .env variables (RunMode='$RunMode', FlaskEnv='$FlaskEnv') do not match the target deployment environment (TargetEnv='$TargetEnv', TargetFlaskEnv='$TargetFlaskEnv')." -Level "ERROR" -LogFilePath $BuildLog
        
        # Exit is implicit due to -ErrorAction Stop
    }
    else {
        # Write-Host "Target environment ($TargetEnv) and Flask environment ($TargetFlaskEnv) match the local .env file settings." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Target environment ($TargetEnv) and Flask environment ($TargetFlaskEnv) match the local .env file settings." -Level "INFO" -LogFilePath $BuildLog
    }

    # 1.2: Add Explicit Confirmation
    Write-Host "`n"
    $confirmation = Read-Host "You are about to BUILD version '$Version' for '$RunMode' and DEPLOY to '$TargetEnv' on '$DEPLOYMENT_SERVER_IP'. Proceed? (y/n)"
    # Log the prompt and the answer separately for clarity
    # Write-Host "User confirmation prompt displayed." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "User confirmation prompt displayed." -Level "INFO" -LogFilePath $BuildLog
    
    # Write-Host "User response: '$confirmation'" | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "User response: '$confirmation'" -Level "INFO" -LogFilePath $BuildLog

    if ($confirmation -ne 'y') {
        # Write-Host "Deployment cancelled by user." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Deployment cancelled by user." -Level "WARNING" -LogFilePath $BuildLog
        exit 1 # Exit the entire script
    }

    # Write-Host "`nUser confirmed. Proceeding with deployment to $TargetEnv..." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "User confirmed. Proceeding with deployment to $TargetEnv..." -Level "INFO" -LogFilePath $BuildLog
}

Function Remove-OldBackups {
    # This function is a refactored version of the original Remove-OldBackups function. Now named Remove-OldBackups_old for reference.
    # It simplifies the logic and is easier to read, while maintaining the same functionality.
    # In practice this function will only be removing 1 backup at a time, so the logic is simplified.
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
    # Write-Host "Checking for old backups in '$ParentDir' with prefix '$Prefix' (keeping $maxKeep)..." | Tee-Object -FilePath $BuildLog -Append
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
        -IsFatal $false ` # Don't stop if listing fails (e.g., dir doesn't exist yet)
    -CaptureOutput

    if ($listResult.ExitCode -ne 0) {
        # Write-Warning "Could not list backups in '$ParentDir'. Skipping cleanup for '$Prefix'." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Could not list backups in '$ParentDir'. Skipping cleanup for '$Prefix'." -Level "WARNING" -LogFilePath $BuildLog
        return
    }

    # Split the output into lines, remove empty lines, and parse
    $backupItems = $listResult.StdOut.Split([Environment]::NewLine, [StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object {
        # Extract the full path after the first space (timestamp)
        $path = $_.Substring($_.IndexOf(' ') + 1)
        # Return the path
        $path
    }

    $count = $backupItems.Count
    # Write-Host "Found $count backups matching '$Prefix*$Suffix'." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Found $count backups matching '$Prefix*$Suffix'." -Level "INFO" -LogFilePath $BuildLog

    if ($count -gt $maxKeep) {
        $toDeleteCount = $count - $maxKeep
        # Write-Host "Need to delete $toDeleteCount oldest backup(s)." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Need to delete $toDeleteCount oldest backup(s)." -Level "INFO" -LogFilePath $BuildLog

        # Get the oldest items to delete (first $toDeleteCount items from the sorted list)
        $itemsToDelete = $backupItems | Select-Object -First $toDeleteCount

        foreach ($itemPath in $itemsToDelete) {
            # Determine if it's likely a file or directory based on suffix (simple check)
            # A more robust check would involve another SSH call with 'test -d' or 'test -f'
            # but rm -rf handles both anyway.
            $deleteCommand = "rm -rf '$itemPath'" # Use rm -rf for simplicity, works on files and dirs

            # Write-Host "Attempting to delete old backup: $itemPath" | Tee-Object -FilePath $BuildLog -Append
            write-Log -Message "Attempting to delete old backup: $itemPath" -Level "INFO" -LogFilePath $BuildLog
            Invoke-SshCommand -Command $deleteCommand `
                -ActionDescription "delete old backup '$itemPath'" `
                -BuildLog $BuildLog `
                -IsFatal $false # Log error but don't stop deployment if a single delete fails
        }
        # Write-Host "Old backups deleted successfully." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Old backups deleted successfully." -Level "SUCCESS" -LogFilePath $BuildLog
    }
    else {
        # Write-Host "Backup count ($count) is within limit ($maxKeep). No cleanup needed for '$Prefix*$Suffix'." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Backup count ($count) is within limit ($maxKeep). No cleanup needed for '$Prefix*$Suffix'." -Level "INFO" -LogFilePath $BuildLog
    }
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
        [string]$GitRepoPath = $null
    )

    
    if ($RunBuild -ne 'y') {
        # Write-Host "Skipping React build as per user request." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Skipping React build as per user request." -Level "WARNING" -LogFilePath $BuildLog
        return
    }
    #Checkout Specified Version ---
    # Write-Host "`n--- Checking out version $Version ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Checking out version $Version ---" -Level "INFO" -LogFilePath $BuildLog

    try {
        Push-Location $GitRepoPath
        # Write-Host "Fetching latest tags from origin..." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Fetching latest tags from origin..." -Level "INFO" -LogFilePath $BuildLog

        git fetch --tags origin --force # --force helps overwrite existing tags if needed locally
        if ($LASTEXITCODE -ne 0) { throw "Git fetch failed." }

        # Write-Host "Checking out tag '$Version'..." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Checking out tag '$Version'..." -Level "INFO" -LogFilePath $BuildLog
        
        git checkout $Version
        if ($LASTEXITCODE -ne 0) { throw "Git checkout of tag '$Version' failed. Does the tag exist locally and remotely?" }

        # Write-Host "Successfully checked out version $Version." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Successfully checked out version $Version." -Level "SUCCESS" -LogFilePath $BuildLog
    }
    catch {
        # Write-Error "FATAL: Failed to checkout version '$Version'. Error: $($_.Exception.Message)" -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: Failed to checkout version '$Version'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }
    finally {
        Pop-Location
    }

    # Write-Host "`n--- Step 2: Run React Build Locally ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Step 2: Run React Build Locally ---" -Level "INFO" -LogFilePath $BuildLog

    # Write-Host "Building React app locally in '$LocalFrontendDir'..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Building React app locally in '$LocalFrontendDir'..." -Level "INFO" -LogFilePath $BuildLog

    # Define the specific log file for npm build errors within this step
    $npmErrorLog = Join-Path (Split-Path $BuildLog -Parent) "npm_build_errors${Version}_$timestamp.log" # Use timestamp for uniqueness

    # Change to the frontend directory to run the build command
    try {
        Push-Location -Path $LocalFrontendDir -ErrorAction Stop
    }
    catch {
        # Write-Error "FATAL: Failed to change directory to '$LocalFrontendDir'. Error: $($_.Exception.Message)" -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: Failed to change directory to '$LocalFrontendDir'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }

    try {
        # Execute npm build, redirecting stderr (2) to stdout (1) and teeing to both the main log and a specific npm error log
        # Write-Host "Executing 'npm run build'..." | Tee-Object -FilePath $BuildLog -Append
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
            # Write-Error "FATAL: React build failed! Check output above and details in '$npmErrorLog'. Exiting." -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "FATAL: React build failed! Check output above and details in '$npmErrorLog'. Exiting." -Level "ERROR" -LogFilePath $BuildLog
            throw "React build failed."
        }
        else {
            # Write-Host "React build successful." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "React build successful." -Level "SUCCESS" -LogFilePath $BuildLog
        }
    }
    catch {
        # Write-Error "FATAL: An unexpected error occurred during the React build process. Error: $($_.Exception.Message)" -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: An unexpected error occurred during the React build process. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }
    finally {
        # Always return to the original directory
        Pop-Location
        # Write-Host "Returned to original directory." | Tee-Object -FilePath $BuildLog -Append
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
        # Write-Host "Skipping backup as per user request." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Skipping backup as per user request." -Level "WARNING" -LogFilePath $BuildLog
        return
    }
    # Write-Host "`n--- Step 3: Backup Existing Project Files ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Step 3: Backup Existing Project Files ---" -Level "INFO" -LogFilePath $BuildLog
    # 3.1: Copy Existing Flask Files to Backup Directory
    # Write-Host "Backing up current Flask files ($ServerFlaskDir) on server..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Backing up current Flask files ($ServerFlaskDir) on server..." -Level "INFO" -LogFilePath $BuildLog

    # Ensure backup dir exists, then copy. Handle case where source might not exist gracefully.
    $flaskBackupCmd = "mkdir -p '$(Split-Path -Path $BackupDirFlask -Parent)' && if [ -d '$ServerFlaskDir' ]; then cp -a '$ServerFlaskDir' '$BackupDirFlask/'; else echo 'Warning: Source Flask directory $ServerFlaskDir not found, skipping copy.'; fi"
    # Refactored Call 1
    Invoke-SshCommand -Command $flaskBackupCmd `
        -ActionDescription "backup Flask files to '$BackupDirFlask'" `
        -BuildLog $BuildLog `
        -IsFatal $true # Keep original fatal behavior
    # --- Call Cleanup for Flask Backups ---
    Remove-OldBackups  -ParentDir $DeploymentBackupDir ` # Parent directory
    -Prefix "flask_" `                # Prefix for flask backups
    -BuildLog $BuildLog

    # 3.2: Copy Existing React Build to Backup Directory
    # Write-Host "Backing up existing React build ($ServerFrontendBuildDir) on server..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Backing up existing React build ($ServerFrontendBuildDir) on server..." -Level "INFO" -LogFilePath $BuildLog

    # Ensure backup dir exists, copy if source exists, then remove source if copy succeeded
    $frontendBackupCmd = "mkdir -p '$BackupDirFrontend' && if [ -d '$ServerFrontendBuildDir' ]; then cp -a '$ServerFrontendBuildDir' '$BackupDirFrontend/'; else echo 'Warning: Source Frontend directory $ServerFrontendBuildDir not found, skipping backup.'; fi"
    # Refactored Call 2
    Invoke-SshCommand -Command $frontendBackupCmd `
        -ActionDescription "backup React build to '$BackupDirFrontend'" `
        -BuildLog $BuildLog `
        -IsFatal $true # Keep original fatal behavior

    # --- Call Cleanup for Frontend Backups ---
    Remove-OldBackups  -ParentDir $DeploymentBackupDir `  # Parent directory
    -Prefix "frontend_" `             # Prefix for frontend backups
    -BuildLog $BuildLog

    # 3.3: Backup Database
    # Write-Host "Backing up MySQL database '$DatabaseName' to '$BackupDirDB'..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Backing up MySQL database '$DatabaseName' to '$BackupDirDB'..." -Level "INFO" -LogFilePath $BuildLog

    # Ensure parent directory exists before dumping
    $dbBackupCmd = "mkdir -p '$(dirname $BackupDirDB)' && mysqldump $DatabaseName > '$BackupDirDB'" # Assumes .my.cnf
    $dbCleanupCmd = "rm -f '$BackupDirDB'" # Cleanup command if dump fails
    # Refactored Call 3
    Invoke-SshCommand -Command $dbBackupCmd `
        -ActionDescription "backup database '$DatabaseName'" `
        -BuildLog $BuildLog `
        -FailureCleanupCommand $dbCleanupCmd ` # Pass the cleanup command
    -IsFatal $true # Keep original fatal behavior
    # --- Call Cleanup for Database Backups ---
    Remove-OldBackups  -ParentDir $DeploymentBackupDir ` # Parent directory
    -Prefix "db_backup_" `         # Prefix for DB backups
    -Suffix ".sql" `               # Suffix for DB backups
    -BuildLog $BuildLog


    # Write-Host "Server state backed up successfully." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Server state backed up successfully." -Level "SUCCESS" -LogFilePath $BuildLog
}

Function Sync-FilesToServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WslLocalFrontendDirBuild, # WSL path to local React build
        [Parameter(Mandatory = $true)]
        [string]$ServerFrontendBuildDir, # Server path for React build destination
        [Parameter(Mandatory = $true)]
        [string]$WslLocalFlaskDirApp, # WSL path to local Flask app source
        [Parameter(Mandatory = $true)]
        [string]$ServerFlaskAppDir, # Server path for Flask app destination
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    # Write-Host "`n--- Step 4: Deploy Application Files using rsync ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Step 4: Deploy Application Files using rsync ---" -Level "INFO" -LogFilePath $BuildLog

    # 4.1: Sync React build files
    # Write-Host "Syncing React build files ($WslLocalFrontendDirBuild --> $ServerFrontendBuildDir)..." | Tee-Object -FilePath $BuildLog -Append
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
    # Write-Host "Syncing Flask application files ($WslLocalFlaskDirApp --> $ServerFlaskAppDir)..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Syncing Flask application files ($WslLocalFlaskDirApp --> $ServerFlaskAppDir)..." -Level "INFO" -LogFilePath $BuildLog

    # --- Refactored Call 2 ---
    $flaskMkdirCmd = "mkdir -p '$ServerFlaskAppDir'" # Use quotes for safety
    Invoke-SshCommand -Command $flaskMkdirCmd `
        -ActionDescription "ensure Flask app destination directory exists ('$ServerFlaskAppDir')" `
        -BuildLog $BuildLog `
        -IsFatal $true # Keep original fatal behavior
    $flaskExcludes = @('__pycache__', 'logs', 'scripts', '*.pyc', '.git*', '.vscode') # Add more if needed
    # Ensure trailing slashes
    Invoke-WslRsync -SourcePath "$($WslLocalFlaskDirApp)/" `
        -DestinationPath "$($ServerFlaskAppDir)/" `
        -Purpose "Flask app files" `
        -ExcludePatterns $flaskExcludes `

    # Write-Host "Application files deployed successfully via rsync." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Application files deployed successfully via rsync." -Level "SUCCESS" -LogFilePath $BuildLog
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

    # Write-Host "Executing WSL command for ${Purpose}: wsl $($wslArgs -join ' ')" | Tee-Object -FilePath $BuildLog -Append
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
        $processInfo.RedirectStandardOutput = $true # Capture output for logging
        $processInfo.RedirectStandardError = $true  # Capture errors for logging
        $processInfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null

        # Log output/error streams (optional but good practice)
        $stdOut = $process.StandardOutput.ReadToEnd()
        $stdErr = $process.StandardError.ReadToEnd()

        $process.WaitForExit()
        $rsyncExitCode = $process.ExitCode

        if ($stdOut) {
            # Write-Host "Rsync StdOut:" | Tee-Object -FilePath $BuildLog -Append
            # $stdOut | Out-String | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "Rsync StdOut: $stdOut" -Level "INFO" -LogFilePath $BuildLog
        }
        if ($stdErr) {
            # Log stderr as warning or error depending on exit code
            if ($rsyncExitCode -ne 0) {
                # Write-Warning "Rsync StdErr:" | Tee-Object -FilePath $BuildLog -Append
                # $stdErr | Out-String | Tee-Object -FilePath $BuildLog -Append                
                Write-Log -Message "Rsync StdErr: $stdErr" -Level "ERROR" -LogFilePath $BuildLog
            }
            else {
                # Write-Host "Rsync StdErr:" | Tee-Object -FilePath $BuildLog -Append
                # $stdErr | Out-String | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "Rsync StdErr: $stdErr" -Level "INFO" -LogFilePath $BuildLog
            }
        }

    }
    catch {
        Write-Error "FATAL: Failed to start WSL rsync process for $Purpose. Error: $($_.Exception.Message)" -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: Failed to start WSL rsync process for $Purpose. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
        # Exit code remains non-zero
    }

    if ($rsyncExitCode -ne 0) {
        # Write-Error "FATAL: Failed to sync $Purpose using rsync (Exit Code: $rsyncExitCode). Check WSL user '$DEPLOYMENT_WSL_SSH_USER', key '$DEPLOYMENT_WSL_SSH_KEY_PATH', rsync output above, SSH connectivity, and paths ($SourcePath -> $DestinationPath). Exiting." -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: Failed to sync $Purpose using rsync (Exit Code: $rsyncExitCode). Check WSL user '$DEPLOYMENT_WSL_SSH_USER', key '$DEPLOYMENT_WSL_SSH_KEY_PATH', rsync output above, SSH connectivity, and paths ($SourcePath -> $DestinationPath). Exiting.", -Level "FATAL" -LogFilePath $BuildLog
        throw "Halting due to fatal error during rsync for '$Purpose'."
    }
    else {
        # Write-Host "$Purpose synced successfully." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "$Purpose synced successfully." -Level "SUCCESS" -LogFilePath $BuildLog
    }
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

    # Write-Host "`n--- Step 5: Database Migration (Optional) ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Step 5: Database Migration (Optional) ---" -Level "INFO" -LogFilePath $BuildLog

    if ($runDBMigration -ne 'y') {
        # Write-Host "Database migration not requested. Skipping..." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Database migration not requested. Skipping..." -Level "INFO" -LogFilePath $BuildLog
        return # Exit the function early
    }

    # Write-Host "Database migration requested. Proceeding..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Database migration requested. Proceeding..." -Level "INFO" -LogFilePath $BuildLog

    # --- Check for migrations directory and initialize if needed ---
    $migrationDir = "$ServerFlaskBaseDir/migrations"
    $migrationMessage = "" # Initialize migration message variable

    # Write-Host "Checking for existing migrations directory ('$migrationDir') on server..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Checking for existing migrations directory ('$migrationDir') on server..." -Level "INFO" -LogFilePath $BuildLog

    # --- Refactored Directory Check ---
    $checkDirCmd = "test -d '$migrationDir'"
    $checkResult = Invoke-SshCommand -Command $checkDirCmd `
        -ActionDescription "check for migrations directory" `
        -BuildLog $BuildLog `
        -IsFatal $false `
        -CaptureOutput # Capture status

    $migrationDirExists = ($checkResult.ExitCode -eq 0) # Check the exit code from the result object

    if (-not $migrationDirExists) {
        # Write-Host "Migrations directory not found. Initializing Flask-Migrate..." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Migrations directory not found. Initializing Flask-Migrate..." -Level "INFO" -LogFilePath $BuildLog

        $initCmd = "cd '$ServerFlaskBaseDir' && source '$VenvDir/bin/activate' && flask db init"
        # --- Refactored Call 1 ---
        Invoke-SshCommand -Command $initCmd `
            -ActionDescription "initialize migrations (flask db init)" `
            -BuildLog $BuildLog `
            -IsFatal $true
        # Write-Host "Flask-Migrate initialized successfully." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Flask-Migrate initialized successfully." -Level "SUCCESS" -LogFilePath $BuildLog
        $migrationMessage = "Initial migration creating all tables."
    }
    else {
        # Write-Host "Migrations directory found. Proceeding with standard migration." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Migrations directory found. Proceeding with standard migration." -Level "INFO" -LogFilePath $BuildLog
        $migrationMessage = "Auto-migration after deployment $(Get-Date -Format 'yyyyMMdd_HHmmss')"
    }
    # --- End Check ---


    # 5.1: Generate Migration Script (using the determined message)
    # Write-Host "Generating database migration script with message: '$migrationMessage'" | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Generating database migration script with message: '$migrationMessage'" -Level "INFO" -LogFilePath $BuildLog
    $escapedMigrationMessageForCmd = $migrationMessage -replace "'", "'\''"
    $migrateCmd = "cd '$ServerFlaskBaseDir' && source '$VenvDir/bin/activate' && flask db migrate -m '$escapedMigrationMessageForCmd'"
    # --- Refactored Call 2 ---
    Invoke-SshCommand -Command $migrateCmd `
        -ActionDescription "generate migration script" `
        -BuildLog $BuildLog `
        -IsFatal $true # Keep original fatal behavior
    # Write-Host "Migration script generated. Please review it on the server." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Migration script generated. Please review it on the server." -Level "WARNING" -LogFilePath $BuildLog

    # 5.2: Pause for User Review
    $migrationScriptDir = "$ServerFlaskBaseDir/migrations/versions/" # This path should now exist
    # Write-Host "The migration script has been generated in '$migrationScriptDir' on the server." -ForegroundColor Yellow
    Write-Log -Message "The migration script has been generated in '$migrationScriptDir' on the server." -Level "WARNING" -LogFilePath $BuildLog
    # Write-Host "Please SSH into the server ($DEPLOYMENT_SERVER_USER@$DEPLOYMENT_SERVER_IP) and review the latest script in that directory." -ForegroundColor Yellow
    Write-Log -Message "Please SSH into the server ($DEPLOYMENT_SERVER_USER@$DEPLOYMENT_SERVER_IP) and review the latest script in that directory." -Level "WARNING" -LogFilePath $BuildLog
    $reviewConfirmation = ''
    while ($reviewConfirmation -ne 'y' -and $reviewConfirmation -ne 'n') {
        $reviewConfirmation = Read-Host "Have you reviewed the migration script and want to apply it? (y/n)"
    }

    if ($reviewConfirmation -ne 'y') {
        # --- Handle Cancellation ---
        # Write-Host "Database upgrade cancelled by user." -ForegroundColor Red | Tee-Object -FilePath $BuildLog -Append
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
                    # Write-Host "Attempting to delete generated script: $deleteScriptCmd" | Tee-Object -FilePath $BuildLog -Append
                    Write-Log -Message "Attempting to delete generated script: $deleteScriptCmd" -Level "INFO" -LogFilePath $BuildLog

                    Invoke-SshCommand -Command $deleteScriptCmd `
                        -ActionDescription "delete generated migration script '$latestScript'" `
                        -BuildLog $BuildLog `
                        -IsFatal $false # Don't fail deployment if delete fails
                    # Note: Success/failure is logged by Invoke-SshCommand
                }
                else {
                    # Use $findResult.ExitCode here, not $sshExitCode which isn't defined in this scope
                    # Write-Warning "Could not find a .py file in '$migrationScriptDir' or failed to list them (Exit Code: $($findResult.ExitCode)). Skipping deletion." | Tee-Object -FilePath $BuildLog -Append
                    Write-Log -Message "Could not find a .py file in '$migrationScriptDir' or failed to list them (Exit Code: $($findResult.ExitCode)). Skipping deletion." -Level "WARNING" -LogFilePath $BuildLog
                }
            }
            else {
                # Handle case where find command failed
                # Write-Warning "Failed to find latest migration script (Exit Code: $($findResult.ExitCode)). Skipping deletion." | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "Failed to find latest migration script (Exit Code: $($findResult.ExitCode)). Skipping deletion." -Level "WARNING" -LogFilePath $BuildLog
            }
        }
        else {
            # Write-Host "Unapplied migration script retained for review." -ForegroundColor Yellow | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "Unapplied migration script retained for review." -Level "WARNING" -LogFilePath $BuildLog
        }
    
        # --- Halt the script since the user cancelled the upgrade ---
        # Write-Error "Deployment halted by user during migration review." -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Deployment halted by user during migration review." -Level "ERROR" -LogFilePath $BuildLog
    
        # --- End Handle Cancellation ---
    
    }
    else {
        # $reviewConfirmation was 'y'
        # --- Apply Migration ---
        # Write-Host "Migration script review completed. Proceeding with upgrade..." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Migration script review completed. Proceeding with upgrade..." -Level "INFO" -LogFilePath $BuildLog
        # Write-Host "Applying database migration (upgrade)..." | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Applying database migration (upgrade)..." -Level "INFO" -LogFilePath $BuildLog        
        $upgradeCmd = "cd '$ServerFlaskBaseDir' && source '$VenvDir/bin/activate' && flask db upgrade"
        Invoke-SshCommand -Command $upgradeCmd `
            -ActionDescription "apply database migration (upgrade)" `
            -BuildLog $BuildLog `
            -IsFatal $true
        # Write-Host "Database migration applied successfully." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "Database migration applied successfully." -Level "SUCCESS" -LogFilePath $BuildLog
        # --- End Apply Migration ---
    }    
}

Function Restart-Services {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FlaskServiceName, # The environment-specific service name
        [Parameter(Mandatory = $true)]
        [string]$BuildLog
    )

    # Write-Host "`n--- Step 6: Restart Services ---" -ForegroundColor Cyan | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "`n--- Step 6: Restart Services ---" -Level "INFO" -LogFilePath $BuildLog

    # Consider making '/bin/systemctl' configurable via .deployment_env if needed
    $systemctlPath = "/bin/systemctl" # Or just "systemctl" if it's always in PATH

    # 6.1: Restart Flask Service (Critical)
    # Write-Host "Restarting Flask service ('$FlaskServiceName')..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Restarting Flask service ('$FlaskServiceName')..." -Level "INFO" -LogFilePath $BuildLog

    $flaskRestartCmd = "$systemctlPath restart '$FlaskServiceName'"
    # --- Refactored Call 1 ---
    Invoke-SshCommand -Command $flaskRestartCmd `
        -UseSudo # Add sudo prefix
    -ActionDescription "restart Flask service '$FlaskServiceName'" `
        -BuildLog $BuildLog `
        -IsFatal $true # Map IsCritical=true to IsFatal=true

    # 6.2: Restart Nginx (Non-Critical - Warning only)
    $nginxServiceName = "nginx" # Consider making this configurable via .deployment_env
    # Write-Host "Restarting Nginx service ('$nginxServiceName')..." | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Restarting Nginx service ('$nginxServiceName')..." -Level "INFO" -LogFilePath $BuildLog
    $nginxRestartCmd = "$systemctlPath restart '$nginxServiceName'"
    Invoke-SshCommand -Command $nginxRestartCmd `
        -UseSudo # Add sudo prefix
    -ActionDescription "restart Nginx service '$nginxServiceName'" `
        -BuildLog $BuildLog `
        -IsFatal $false # Map IsCritical=false to IsFatal=false

    # Write-Host "Service restarts attempted." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Service restarts attempted." -Level "SUCCESS" -LogFilePath $BuildLog
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
    # Add common SSH options if needed (e.g., -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null for non-interactive, but use with caution)
    # Example: Insert before target server: "-o", "StrictHostKeyChecking=no",
    
    # Write-Host "Executing via WSL ($ActionDescription): $wslExe $($wslArgsList -join ' ')" | Tee-Object -FilePath $BuildLog -Append
    Write-Log -Message "Executing via WSL ($ActionDescription): $wslExe $($wslArgsList -join ' ')" -Level "INFO" -LogFilePath $BuildLog

    $sshOutput = ""
    $sshExitCode = -1 # Initialize with a non-zero value
    $stdErrOutput = "" # To capture stderr separately

    try {
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = $wslExe
        # Add arguments using ArgumentList
        $wslArgsList | ForEach-Object { $processInfo.ArgumentList.Add($_) }
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null

        # Read output streams
        $sshOutput = $process.StandardOutput.ReadToEnd()
        $stdErrOutput = $process.StandardError.ReadToEnd()

        $process.WaitForExit() # Wait for the process to complete
        $sshExitCode = $process.ExitCode

        # Log output/error
        if ($sshOutput) {
            # Write-Host "WSL/SSH StdOut:" | Tee-Object -FilePath $BuildLog -Append
            # $sshOutput | Out-String | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "WSL/SSH StdOut: $sshOutput" -Level "INFO" -LogFilePath $BuildLog
        }
        if ($stdErrOutput) {
            if ($sshExitCode -ne 0) {
                # Write-Warning "WSL/SSH StdErr:" | Tee-Object -FilePath $BuildLog -Append
                # $stdErrOutput | Out-String | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "WSL/SSH StdErr: $stdErrOutput" -Level "ERROR" -LogFilePath $BuildLog
            }
            else {
                # Write-Host "WSL/SSH StdErr:" | Tee-Object -FilePath $BuildLog -Append
                # $stdErrOutput | Out-String | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "WSL/SSH StdErr: $stdErrOutput" -Level "INFO" -LogFilePath $BuildLog
            }
        }
    }
    catch {
        # Write-Error "FATAL: WSL/SSH command execution failed for '$ActionDescription'. Error: $($_.Exception.Message)" -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
        Write-Log -Message "FATAL: WSL/SSH command execution failed for '$ActionDescription'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
    }

    if ($sshExitCode -ne 0) {
        $errorMessage = "Failed to $ActionDescription via WSL. Exit Code: $sshExitCode."

        # Attempt cleanup if specified
        if ($FailureCleanupCommand) {
            # Write-Warning "Attempting cleanup command via WSL after failure: $FailureCleanupCommand" | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "Attempting cleanup command via WSL after failure: $FailureCleanupCommand" -Level "WARNING" -LogFilePath $BuildLog

            # Construct WSL args for the cleanup command
            $cleanupRemoteCommand = $FailureCleanupCommand # Assuming cleanup doesn't need sudo unless specified in the string itself
            $cleanupWslArgsList = @(
                "-u", $DEPLOYMENT_WSL_SSH_USER,
                "ssh",
                "-i", $DEPLOYMENT_WSL_SSH_KEY_PATH,
                "-o", "BatchMode=yes",
                "${DEPLOYMENT_SERVER_USER}@${DEPLOYMENT_SERVER_IP}",
                $cleanupRemoteCommand
            )

            $cleanupExitCode = -1 # Initialize cleanup exit code
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
                # Write-Warning "Failed to start the WSL cleanup command. Error: $($_.Exception.Message)" | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "Failed to start the WSL cleanup command. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $BuildLog
                $cleanupExitCode = -999
            }

            # Check the exit code from the cleanup process object
            if ($cleanupExitCode -ne 0) {
                # Write-Warning "WSL cleanup command also failed (Exit Code: $cleanupExitCode)." | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "WSL cleanup command also failed (Exit Code: $cleanupExitCode)." -Level "ERROR" -LogFilePath $BuildLog
            }
            else {
                # Write-Host "WSL cleanup command executed successfully." | Tee-Object -FilePath $BuildLog -Append
                Write-Log -Message "WSL cleanup command executed successfully." -Level "SUCCESS" -LogFilePath $BuildLog
            }
        }

        if ($IsFatal) {
            # Write-Error "FATAL: $errorMessage Check WSL/SSH output above or logs on server. Exiting." -ErrorAction Stop | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "FATAL ($ActionDescription): $errorMessage Check WSL/SSH output above or logs on server. Exiting." -Level "FATAL" -LogFilePath $BuildLog # Changed Level to FATAL
            throw "Halting due to fatal error during '$ActionDescription'."
        }
        else {
            # Write-Warning "Warning: $errorMessage Check WSL/SSH output above or logs on server. Continuing." | Tee-Object -FilePath $BuildLog -Append
            Write-Log -Message "Warning ($ActionDescription): $errorMessage Check WSL/SSH output above or logs on server. Continuing." -Level "WARNING" -LogFilePath $BuildLog
        }
    }
    else {
        # Write-Host "$ActionDescription via WSL completed successfully." -ForegroundColor Green | Tee-Object -FilePath $BuildLog -Append
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
            "WARN" { Write-Warning $logEntry } # Write-Warning implicitly adds "WARNING: " prefix
            "WARNING" { Write-Warning $logEntry } # Write-Warning implicitly adds "WARNING: " prefix
            "ERROR" { Write-Error $logEntry }   # Write-Error implicitly handles error stream formatting
            "FATAL" { Write-Error $logEntry }   # Treat FATAL like ERROR for console output, but signal severity
            "DEBUG" { Write-Host $logEntry -ForegroundColor DarkGray } # Optional: Dim debug messages
            default { Write-Host $logEntry -ForegroundColor Cyan } # INFO and any others default to plain Write-Host
        }
    }

    # --- Append to Log File ---
    try {
        $logEntry | Out-File -FilePath $LogFilePath -Append -Encoding UTF8 -ErrorAction Stop
    }
    catch {
        # Critical failure: Can't write to log file. Output to console error stream instead.
        Write-Error "CRITICAL LOGGING FAILURE: Could not write to '$LogFilePath'. Original message: [$Level] $messageString. Error: $($_.Exception.Message)"
        # Throwing here as the log essential for tracking deployment issues
        throw "Logging failed. Halting execution." 
    }
}

Function Test_and_Open_Logfile {
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
    catch {
        Write-Error "FATAL: Failed to open log file '$BuildLog'. Check path and permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
    }
}


##################################################################################
#--------------------------- Start of Main Script -------------------------------#
##################################################################################

# --- Define Paths ---
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
$buildLog = Join-Path $logDir "build_${Version}_$timestamp.log"

# Open the log file for writing
Test_and_Open_Logfile -BuildLog $buildLog -ScriptRoot $scriptRoot

# --- Initialize Configuration ---
$configData = Initialize-DeploymentConfiguration -Environment $Environment `
    -ScriptRoot $scriptRoot `
    -BuildLog $buildLog

# --- Assign Local and Target Environment Variables ---
$localEnvSettings = $configData.LocalEnvSettings
$runMode = $localEnvSettings['REACT_APP_RUN_MODE'].ToUpper() # e.g., "DEV", "QAS", "PROD"
$flaskEnv = $localEnvSettings['FLASK_ENV'].ToUpper() # e.g., "DEVELOPEMENT", "TESTING", "PRODUCTION"

# Target environment variables (using script-scoped variables set by the function)
$targetEnv = $DEPLOYMENT_TARGET # Already set by Initialize-DeploymentConfiguration
$targetFlaskEnv = $DEPLOYMENT_FLASK_ENV # Already set by Initialize-DeploymentConfiguration

# --- Construct Derived Variables ---
# These now use the script-scoped variables set by Initialize-DeploymentConfiguration

# Backup directories
$backupDirFlask = "$DEPLOYMENT_BACKUP_DIR/flask_$timestamp"
$backupDirFrontend = "$DEPLOYMENT_BACKUP_DIR/frontend_$timestamp"
$backupDirDB = "$DEPLOYMENT_BACKUP_DIR/db_backup_$timestamp.sql"

# Directories for the local machine
$localFlaskDir = Join-Path $DEPLOYMENT_LOCAL_BASE_DIR "flask_server"
$localFrontendDir = Join-Path $DEPLOYMENT_LOCAL_BASE_DIR "satisfactory_tracker"

# Directories for the server
$serverFlaskBaseDir = "$DEPLOYMENT_SERVER_BASE_DIR/flask_server"
$serverFlaskAppDir = "$serverFlaskBaseDir/app"
$serverFrontendBaseDir = "$DEPLOYMENT_SERVER_BASE_DIR/satisfactory_tracker"
$serverFrontendBuildDir = "$serverFrontendBaseDir/build"

$displayUrl = ""
if ($Environment.ToUpper() -eq "PROD") {
    # For PROD, assume it's the main domain
    $displayUrl = "https://$DEPLOYMENT_DOMAIN" # Or https://www.domain... if you use www
}
else {
    # For non-PROD, assume subdomain format
    $displayUrl = "https://$($Environment.ToLower()).$DEPLOYMENT_DOMAIN" 
}

# --- Path Translation for WSL ---
# Use script-scoped variables
$wslLocalFlaskDir = Convert-WindowsPathToWslPath -WindowsPath $localFlaskDir
$wslLocalFrontendDir = Convert-WindowsPathToWslPath -WindowsPath $localFrontendDir
$wslLocalFlaskDirApp = "$wslLocalFlaskDir/app" # Source directory for local flask app files
$wslLocalFrontendDirBuild = "$wslLocalFrontendDir/build" # Source directory for local build files

##################################################################################
#--------------------------- Start of Deployment Steps --------------------------#
##################################################################################

# Step 1: Check Environment & Confirm
Confirm-DeploymentEnvironment -TargetEnv $targetEnv `
    -RunMode $runMode `
    -TargetFlaskEnv $targetFlaskEnv `
    -FlaskEnv $flaskEnv `
    -BuildLog $buildLog

# Step 2: Run React build locally
Invoke-ReactBuild -RunBuild $runBuild `
    -LocalFrontendDir $localFrontendDir `
    -BuildLog $buildLog `
    -GitRepoPath $DEPLOYMENT_LOCAL_BASE_DIR

# Step 3: Backup Existing Project Files
Backup-ServerState -RunBackup $runBackup `
    -BackupDirFlask $backupDirFlask `
    -ServerFlaskDir $serverFlaskBaseDir `
    -BackupDirFrontend $backupDirFrontend `
    -ServerFrontendBuildDir $serverFrontendBuildDir `
    -BackupDirDB $backupDirDB `
    -DatabaseName $DEPLOYMENT_DB_NAME `
    -DeploymentBackupDir $DEPLOYMENT_BACKUP_DIR `
    -BuildLog $buildLog

# Step 4: Deploy Application Files using rsync
Sync-FilesToServer -WslLocalFrontendDirBuild $wslLocalFrontendDirBuild `
    -ServerFrontendBuildDir $serverFrontendBuildDir `
    -WslLocalFlaskDirApp $wslLocalFlaskDirApp `
    -ServerFlaskAppDir $serverFlaskAppDir `
    -BuildLog $buildLog

# Step 5: Database Migration (Optional)
Invoke-DatabaseMigration -runDBMigration $runDBMigration `
    -VenvDir $DEPLOYMENT_VENV_DIR `
    -ServerFlaskBaseDir $serverFlaskBaseDir `
    -BuildLog $buildLog

# Step 6: Restart Services
Restart-Services -FlaskServiceName $DEPLOYMENT_FLASK_SERVICE_NAME `
    -BuildLog $buildLog

##################################################################################
# -------------------------- Final Success Message ------------------------------#
##################################################################################

# Write-Host "`nDeployment to $targetEnv for version $Version completed successfully!" -ForegroundColor Green | Tee-Object -FilePath "$buildLog" -Append
Write-Log -Message "`nDeployment to $targetEnv for version $Version completed successfully!" -Level "SUCCESS" -LogFilePath $buildLog
# Write-Host "Deployment log saved to '$buildLog'." -ForegroundColor Green | Tee-Object -FilePath "$buildLog" -Append
Write-Log -Message "Deployment log saved to '$buildLog'." -Level "INFO" -LogFilePath $buildLog
# Write-Host "Please check the application at https://www.$domainName" -ForegroundColor Green | Tee-Object -FilePath "$buildLog" -Append
Write-Log -Message "Please check the application at $displayUrl" -Level "INFO" -LogFilePath $buildLog
