###########################################################################
#                      DEPLOYMENT SCRIPT TEST HARNESS                     #
###########################################################################

<# --- Script Header ---
-------------------------------------------------------------------------------------------------------------------------
.NOTES
TODO: DONE - Create standalone environment to test the deployment script without affecting the main environments (DEV, QAS, PROD).                     
        - Create a test plan with scenarios. 
            - Each detailing:
                - specific test description (e.g., "Happy Path: Successful deployment with no errors.").    
                - specific tags (e.g., Slow, DB).            
                - specific conditions (e.g., Environment, RunMigration, Version, RunBackup etc...).
                - specific setup steps (e.g., Reset-LocalEnvironment, Reset-ServerEnvironment, Set-LocalEnvironment, Set-ServerEnvironment, Invoke-LocalCommand, Invoke-RemoteCommand).
                - specific validation steps (e.g., log checks, file existence, service status, etc).
                - specific teardown steps (e.g., cleanup, reset).
                - specific test IDs (e.g., HP-1, ERR-12, EC-9).
                - expected outcomes (e.g., success, failure).
        - Create corresponding test scenarios in the $testScenarios array.
-------------------------------------------------------------------------------------------------------------------------
.SYNOPSIS
This script is the test harness for the deploy_to_droplet.ps1 script.
It is designed to automate the testing of the deployment process for the Satisfactory Tracker application.
.DESCRIPTION
Core Goals of the Test Script:
    - Execute Scenarios: Run deploy_to_droplet.ps1 with different parameter combinations corresponding to the test plan scenarios.
    - Environment Control: Automatically set up the necessary pre-conditions for each test (e.g., clean server directory, specific Git tag checked out, certain permissions set for failure tests).
    - Result Validation: Automatically check the outcome of each deployment run (e.g., check exit code, scan log file for errors/success, verify files on server, check service status).
    - Cleanup: Restore the environment (local and server) to a known baseline state after each test (or group of tests) to ensure test independence.
    - Reporting: Provide a clear summary of which tests passed and failed.
Main Test Loop:
    - Create a $RunList by applying any filtering (-RunOnly, -SkipTags) to the $testScenarios.
    - Iterate through $RunList:
        - For each test:
            - Log Starting Test [TestID]: Description.
            - Run Reset-LocalEnvironment and Reset-ServerEnvironment (Standard Teardown).
            - Execute SetupSteps scriptblock.
            - Call Invoke-DeploymentScript with Parameters hashtable.
            - Execute ValidationSteps scriptblock, passing the deployment result.
            - Log PASS/FAIL. Accumulate results.
            - Run standard Teardown again if -NoCleanup is NOT specified.
- Summary Report:
    - Print the final status of the deployment
    - Print the total time taken for the test run
    - Read the log file and count the number of passed/failed/skipped tests
    - List the IDs of failed tests
    - Print the location of the log file
Key Considerations & Tradeoffs:
    - Complexity: Building this harness is complex. Start simple and build up. Maybe tackle happy paths first.
    - State Management: Getting the Reset-* functions right is critical and potentially difficult (especially DB resets). Restoring from a known good DB backup might be easier than dropping/creating tables/re-running migrations constantly.
    - Validation Robustness: How deep should validation go? Checking log files and exit codes is easiest. Checking remote file contents or exact DB states is harder but more thorough. Find a balance.
    - Speed: Running all scenarios can take significant time. Tagging tests ('Slow', 'DB', 'Quick') can help run subsets. Parallel execution is much harder.
    - Idempotency: Design setup/teardown and tests to be as repeatable as possible.
        - Use git clean -fdx to ensure no local changes.
        - Use git reset --hard to ensure no uncommitted changes.
        - Use rm -rf on server to ensure no old files remain.
        - Use a known good DB backup for resets.
        - Ensure all tests are independent (no shared state).
        - Use unique directories for each test run (e.g., temp directories).

-------------------------------------------------------------------------------------------------------------------------
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('QAS', 'DEV', 'TEST')]
    [string]$TestEnvironment, # Environment to test against (e.g., 'DEV', 'QAS', 'TEST')
    
    [Parameter(Mandatory = $true)]
    [string]$GitSourceRef, # Git branch/tag to use as the base for the test run (e.g., 'main', 'dev', 'v1.2.3')
    
    [Parameter(Mandatory = $true)]
    [string]$ServerAppSourceRef, # The server directory to base the test folder on (e.g., 'Tracker_Project', 'Tracker_Project_QAS', 'Tracker_Project_DEV')
    
    [Parameter(Mandatory = $true)]
    [string]$ServerBackupSourceRef, # The server backup directory to base the test folder on (e.g., 'backup', 'backup_QAS', 'backup_DEV')
    
    [Parameter(Mandatory = $false)]
    [ValidateSet('full', 'normal')]
    [string]$ResetType = 'normal', # Type of reset to perform (e.g., 'full', 'normal')
    
    [Parameter(Mandatory = $false)]
    [string]$RunOnly = $null, # Comma-separated list of test IDs to run (e.g., 'HP-1,ERR-12')
    
    [Parameter(Mandatory = $false)]
    [string]$SkipTags = $null, # Comma-separated list of tags to skip (e.g., 'Slow,DB')
    
    [Parameter(Mandatory = $false)]
    [switch]$NoCleanup, # Skip Reset functions after tests
    
    [Parameter(Mandatory = $false)]
    [switch]$ResetOnly, # Reset Everything (local and server) - if this is set it will igonore all other parameters and just run the reset functions
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipSetup, # Skip setup steps (useful for debugging)
    
    [Parameter(Mandatory = $false)]
    [switch]$Verbose # Verbose output for the test script itself
)

#--- Global Variables (if any)---
$Script:TestHarnessExecutionBranch = "test-harness-execution-branch" # Name of the branch where tests will actually run
$Script:TestHarnessExecutionFolder = "Tracker_Project_TEST" # Name of the server folder the tests will target
$Script:TestHarnessBackupFolder = "backup_TEST" # Name of the server backup folder to use for tests
$Script:TestHarnessExecutionSqlDB = "satisfactorytracker_test" # Name of the server database to use for tests
##################################################################################
#---------------------------- Test Harness Functions ----------------------------#
##################################################################################

Function Initialize-TestHarnessConfig {
    #Error Loading: It correctly logs/throws if Import-EnvFile fails for the test env file, but it should likely also be fatal if the main .deployment_env or the local .env cannot be loaded within this initialization. The try/catch seems to cover this.
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        [Parameter(Mandatory = $true)]
        [string]$ScriptRoot,
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog
    )
    
    Write-Log -Message "`n--- Initializing Deployment Configuration ---" -Level "INFO" -LogFilePath $TestRunLog
    
    # Load the deployment_test_env file to get the necessary variables
    $deploymentTestEnvFilePath = Join-Path $ScriptRoot ".deployment_test_env"
    if (Test-Path $deploymentTestEnvFilePath) {
        . $deploymentTestEnvFilePath
    }
    else {
        Write-Error "Deployment test environment file not found: $deploymentTestEnvFilePath"
        return
    }

    # --- Load Settings Files ---
    $depTestEnvSettings = @{}
    $depEnvSettings = @{}
    $localEnvSettings = @{}

    try {
        # --- Load Environment Variables ---    
        
        # Load environment variables from .deployment_test_env
        Write-Log -Message "Loading variables from '$deploymentTestEnvFilePath'...." -Level "INFO" -LogFilePath $TestRunLog
        $depTestEnvSettings = Import-EnvFile -FilePath $deploymentTestEnvFilePath
        
        # Load the environment variables from the .deployment_env
        $depEnvPath = $depTestEnvSettings['DEPLOYMENT_TEST_DEP_ENV_FILE_PATH']
        Write-Log -Message "Loading variables from '$depEnvPath'...." -Level "INFO" -LogFilePath $TestRunLog
        $depEnvSettings = Import-EnvFile -FilePath $depEnvPath

        # Load the environment variables from the .env
        $localEnvPath = $depTestEnvSettings['DEPLOYMENT_TEST_LOCAL_ENV_FILE_PATH']
        Write-Log -Message "Loading variables from '$localEnvPath'..." -Level "INFO" -LogFilePath $TestRunLog
        $localEnvSettings = Import-EnvFile -FilePath $localEnvPath -TestRunLog $TestRunLog

        # ---Assign Variables---
        
        # Assign test variables from .deployment_test_env
        $requiredTestEnvKeys = @('DEPLOYMENT_TEST_BASE_DIR', 
            'DEPLOYMENT_TEST_DEP_BASE_DIR',
            'DEPLOYMENT_TEST_LOG_DIR',
            'DEPLOYMENT_TEST_DEPLOY_TO_DROPLET_PATH',
            'DEPLOYMENT_TEST_DEPLOY_TO_DROPLET_LOG_PATH'
        )
        foreach ($key in $requiredTestEnvKeys) {
            if ($depTestEnvSettings.ContainsKey($key)) {
                $value = $depTestEnvSettings[$key]
                Write-Log -Message "Setting script variable: `$${key} = '$value'" -Level "INFO" -LogFilePath $TestRunLog
                Set-Variable -Name $key -Value $value -Scope Script -ErrorAction Stop
            }
            else {
                # Make missing common keys a fatal error
                Write-Log -Message "FATAL: Required common configuration key '$key' not found in '$depEnvPath'." -Level "FATAL" -LogFilePath $TestRunLog
                throw "Halting due to missing required common configuration keys."
            }
        }

        # Assign test variables from .deployment_env
        
        # --- Define BASE names of the keys that are ENVIRONMENT-SPECIFIC ---
        $requiredBaseKeys = @(
            'DEPLOYMENT_TARGET',
            'DEPLOYMENT_FLASK_ENV',
            'DEPLOYMENT_FLASK_SERVICE_NAME',
            'DEPLOYMENT_DB_NAME',
            'DEPLOYMENT_BACKUP_DIR',
            'DEPLOYMENT_SERVER_BASE_DIR',
            'DEPLOYMENT_URL'            
        )

        # --- Dynamically construct and check required ENVIRONMENT-SPECIFIC keys ---
        $requiredEnvKeys = @{}
        $missingKeys = @()
        $envSuffix = $Environment.ToUpper() # e.g., "DEV", "QAS", "PROD"

        Write-Log -Message "Constructing and checking for required environment-specific keys (Suffix: _$envSuffix)..." -Level "INFO" -LogFilePath $TestRunLog

        foreach ($baseKey in $requiredBaseKeys) {
            $envKey = "${baseKey}_${envSuffix}" # Construct the full key name
            Write-Log -Message "Checking for key: $envKey" -Level "INFO" -LogFilePath $TestRunLog

            if (-not $depEnvSettings.ContainsKey($envKey)) {
                $missingKeys += $envKey
            }
            else {
                $requiredEnvKeys[$baseKey] = $envKey
            }
        }

        if ($missingKeys.Count -gt 0) {
            $errorMessage = "FATAL: The following required environment dependent keys are missing from '$depEnvPath': $($missingKeys -join ', ')"
            Write-Log -Message $errorMessage -Level "FATAL" -LogFilePath $TestRunLog
            throw "Halting due to missing required environment dependent configuration keys."
        }

        # --- Assign variables in the SCRIPT scope ---
        Write-Log -Message "Assigning variables in script scope..." -Level "INFO" -LogFilePath $TestRunLog

        # Assign environment-specific variables dynamically
        foreach ($baseKey in $requiredBaseKeys) {
            $envKey = $requiredEnvKeys[$baseKey]
            $value = $depEnvSettings[$envKey]
            Write-Log -Message "Setting script variable: `$${baseKey} = '$value'" -Level "INFO" -LogFilePath $TestRunLog

            Set-Variable -Name $baseKey -Value $value -Scope Script -ErrorAction Stop
        }

        # Assign NON-environment-specific variables explicitly
        $commonKeys = @('DEPLOYMENT_SERVER_USER', 
            'DEPLOYMENT_SERVER_IP', 
            'DEPLOYMENT_LOCAL_BASE_DIR', 
            'DEPLOYMENT_VENV_DIR',
            'DEPLOYMENT_GLOBAL_DIR',
            'DEPLOYMENT_PIP_REQ_FILE_PATH', 
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
                Write-Log -Message "Setting script variable: `$${key} = '$value'" -Level "INFO" -LogFilePath $TestRunLog

                Set-Variable -Name $key -Value $value -Scope Script -ErrorAction Stop
            }
            else {
                # Make missing common keys a fatal error
                Write-Log -Message "FATAL: Required common configuration key '$key' not found in '$depEnvPath'." -Level "FATAL" -LogFilePath $TestRunLog
                throw "Halting due to missing required common configuration keys."
            }
        }
        
        # Assign app variables from .env
        $requiredAppEnvKeys = @('REACT_APP_RUN_MODE', 'FLASK_ENV')
        foreach ($key in $requiredAppEnvKeys) {
            if ($localEnvSettings.ContainsKey($key)) {
                $value = $localEnvSettings[$key]
                Write-Log -Message "Setting script variable: `$${key} = '$value'" -Level "INFO" -LogFilePath $TestRunLog
                Set-Variable -Name $key -Value $value -Scope Script -ErrorAction Stop
            }
            else {
                # Make missing common keys a fatal error
                Write-Log -Message "FATAL: Required common configuration key '$key' not found in '$depEnvPath'." -Level "FATAL" -LogFilePath $TestRunLog
                throw "Halting due to missing required common configuration keys."
            }
        }
    }
    catch {
        Write-Log -Message "FATAL: Configuration loading failed. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to critical configuration loading error."
    }
}

Function Get-TestDefinitions {
    # Assuming $script:testScenarios is accessible
    $filteredList = $script:testScenarios 

    if ($RunOnly) {
        $runOnlyList = $RunOnly -split ',' | ForEach-Object { $_.Trim() }
        $filteredList = $filteredList | Where-Object { $runOnlyList -contains $_.TestID }
    }

    if ($SkipTags) {
        $skipTagsList = $SkipTags -split ',' | ForEach-Object { $_.Trim() }
        # Keep only tests where NO tag matches any tag in the skip list
        $filteredList = $filteredList | Where-Object {
            $testTags = $_.Tags # Get tags for the current test
            if ($null -eq $testTags -or $testTags.Count -eq 0) { return $true } # Keep if no tags
            $shouldSkip = $false
            foreach ($tagToSkip in $skipTagsList) {
                if ($testTags -contains $tagToSkip) {
                    $shouldSkip = $true
                    break # Found a tag to skip
                }
            }
            -not $shouldSkip # Include if not skipped
        }
    }
    return $filteredList
}
Function Invoke-DeploymentScript {
    # PRIORITY 1 - Done
    # PRIORITY 1
    # This is a core function. It needs to:
    #   - Accept the $Parameters hashtable.
    #   - Define the path to deploy_to_droplet.ps1.
    #   - Add the bypass parameters: $Parameters['-ForceConfirmation'] = $true (use $Parameters.Add() carefully if key might exist), $Parameters['-AutoApproveMigration'] = $true (if adding that parameter).
    #   - Build the argument list string or array from the hashtable.
    #   - Last line of defense to ensure the deploy_to_droplet.ps1 is executed in the $GitSourceRef branch. Especially if -NoCleanup is specified which bypasses the Reset Functions.
    #       - The Invoke-VersionBump function will now modify files (version.txt, package.json) on the $GitSourceRef branch.
    #       - It will git add, git commit, git tag, and git push origin test, git push origin <new_tag> (or whatever remote/branch strategy you settle on for the test outputs). Crucially, it only affects the test branch history.
    #   - Use Start-Process -Wait or & with Wait-Process or simply capture $LASTEXITCODE after using & to run deploy_to_droplet.ps1.
    #   - Capture stdout/stderr streams. - DONE
    #   - Determine the log file path used by that run of the deployment script:
    #      - Add a new parameter to the deployment script to accept $BuildLogTestRef (combination of the TestID and Timestamp parameters). - DONE
    #          - current log file name format: build_version_buildRunTimestamp.log. - DONE
    #          - new log file name format: build_version_buildRunTimestamp_TestID_TestRuntimestamp.log). - DONE
    #      - Look in $deployLogPath for the log file that ends with $BuildLogTestRef - DONE
    #   - Return the result object. - DONE
    #       - (e.g., $result.StdOut, $result.StdErr, $result.ExitCode).    

    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Parameters, # Parameters for deploy_to_droplet.ps1
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog, # Path to the log file
        [Parameter(Mandatory = $false)]
        [string]$TestID, # Test ID to identify the deployment run
        [Parameter(Mandatory = $false)]
        [string]$Timestamp # Timestamp for the deployment run
    )

    # Define the path to deploy_to_droplet.ps1.
    $deployScriptPath = $DEPLOYMENT_TEST_DEPLOY_TO_DROPLET_PATH
    if (-not (Test-Path $deployScriptPath)) {
        Write-Log -Message "FATAL: Deployment script not found at '$deployScriptPath'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to missing deployment script."
    }

    $deployLogPath = $DEPLOYMENT_TEST_DEPLOY_TO_DROPLET_LOG_PATH
    if (-not (Test-Path $deployLogPath)) {
        Write-Log -Message "FATAL: Deployment log path not found at '$deployLogPath'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to missing deployment log path."
    }

    
    # Clone the incoming parameters hashtable to avoid modifying the original object passed by the caller.
    $localParameters = $Parameters.Clone()

    # Add the bypass parameters: $localParameters['-ForceConfirmation'] = $true, $localParameters['-AutoApproveMigration'] = $true (if adding that parameter).
    # Check if the parameters already exist in the hashtable and add them if they don't.
    if (-not $localParameters.ContainsKey('ForceConfirmation')) {
        $localParameters.Add('ForceConfirmation', $true)
    }
    if (-not $localParameters.ContainsKey('AutoApproveMigration')) {
        $localParameters.Add('AutoApproveMigration', $true)
    }

    # Add the combination of the TestID and Timestamp parameters to the argument so they can be appended to the BuildLog file name.
    $BuildLogTestRef = $TestID + "_" + $Timestamp
    if (-not $localParameters.ContainsKey('AppendTestRun')) {
        $localParameters.Add('AppendTestRun', $BuildLogTestRef)
    }

    # Build the argument list string or array from the hashtable.
    $argList = @()
    foreach ($entry in $localParameters.GetEnumerator()) {
        $paramName = "-$($entry.Key)"
        $paramValue = $entry.Value

        # Handle switch parameters (only add the name if value is $true)
        if ($paramValue -is [bool] -and $paramValue -eq $true) {
            $argList += $paramName
        }
        elseif ($paramValue -isnot [bool]) {
            # Add others as key-value pairs
            $argList += $paramName, $paramValue # Start-Process ArgumentList handles quoting reasonably well
        }
    }
   
    # Inside Invoke-DeploymentScript, before calling Start-Process
    Confirm-ActiveTestBranch -ExpectedBranch $Script:TestHarnessExecutionBranch -RepoPath $DEPLOYMENT_GIT_REPO_PATH -LogPath $TestRunLog


    # Use Start-Process -Wait or & with Wait-Process or simply capture $LASTEXITCODE after using & to run deploy_to_droplet.ps1.
    Write-Log -Message "Executing deployment script: & '$deployScriptPath' $($argList -join ' ')" -Level "INFO" -LogFilePath $TestRunLog

    try {
        # Create temporary files for output streams
        $tempOutFile = [System.IO.Path]::GetTempFileName()
        $tempErrFile = [System.IO.Path]::GetTempFileName()

        $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-File", "`"$deployScriptPath`"", $argList -Wait -NoNewWindow -PassThru -RedirectStandardOutput $tempOutFile -RedirectStandardError $tempErrFile

        # Read captured output
        $stdOutContent = Get-Content $tempOutFile -Raw -ErrorAction SilentlyContinue
        $stdErrContent = Get-Content $tempErrFile -Raw -ErrorAction SilentlyContinue

        # Get Exit Code
        $exitCode = $process.ExitCode

        # Clean up temp files
        Remove-Item $tempOutFile -ErrorAction SilentlyContinue
        Remove-Item $tempErrFile -ErrorAction SilentlyContinue

        if ($exitCode -eq 0) {
            Write-Log -Message "Deployment script executed successfully. Exit Code: $exitCode" -Level "SUCCESS" -LogFilePath $TestRunLog
        }
        else {
            Write-Log -Message "Deployment script finished with errors. Exit Code: $exitCode" -Level "ERROR" -LogFilePath $TestRunLog
            # Optionally log StdErr content here if it exists and exit code is non-zero
            if ($stdErrContent) {
                Write-Log -Message "Deployment Script StdErr: $stdErrContent" -Level "ERROR" -LogFilePath $TestRunLog -NoConsole # Avoid double console output if Write-Error was used in child
            }
        }

        # Determine the log file path used by that run of the deployment script
        $deploymentLogFilePath = $null
        try {
            # Look in $deployLogPath for the log file containing $BuildLogTestRef, get the newest one
            $logFile = Get-ChildItem -Path $deployLogPath -Filter "*$BuildLogTestRef*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ErrorAction Stop

            if ($logFile) {
                $deploymentLogFilePath = $logFile.FullName
                Write-Log -Message "Deployment Script log file for this run: $deploymentLogFilePath" -Level "INFO" -LogFilePath $TestRunLog
            }
            else {
                Write-Log -Message "WARNING: Could not find a specific deployment log file matching '*$BuildLogTestRef*.log' in '$deployLogPath'." -Level "WARN" -LogFilePath $TestRunLog
            }
        }
        catch {
            Write-Log -Message "ERROR: Failed to search for deployment log file. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $TestRunLog
        }

        # Capture stdout/stderr streams.
        $result = [PSCustomObject]@{
            StdOut        = $stdOutContent
            StdErr        = $stdErrContent
            ExitCode      = $exitCode
            DeploymentLog = $deploymentLogFilePath
        }
         
        # Return the result object.
        return $result
    }
    catch {
        Write-Log -Message "FATAL: Failed to start or monitor deployment script process. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $TestRunLog
        # Clean up temp files even on failure to start
        if (Test-Path $tempOutFile -PathType Leaf) { Remove-Item $tempOutFile -ErrorAction SilentlyContinue }
        if (Test-Path $tempErrFile -PathType Leaf) { Remove-Item $tempErrFile -ErrorAction SilentlyContinue }

        throw "Halting due to deployment script execution error."
    }

}

Function Reset-LocalEnvironment {
    # PRIORITY 2 - Done
    # PRIORITY 2
    # 1. Identify Base Reference for code: Use the $BaseRef parameter (e.g., 'main', 'dev', 'v1.2.3').
    # 2. Fetch latest from origin.
    # 3. Checkout $BaseRef and ensure it's up-to-date with origin if it's a branch.
    # 4. Delete any existing local $TestExecutionBranchName.
    # 5. Create a fresh $TestExecutionBranchName from $BaseRef. This is the branch tests will run on.
    # 6. Clean the working directory (git clean -fdx).
    # 7. Moves SQL scripts from the test-specific 'completed' back to the test-specific 'environment' folders.

    param(
        [Parameter(Mandatory = $true)]
        [string]$BaseRef, # The Git branch/tag to base the test execution branch on (e.g., 'main', 'v1.0.0')
        [Parameter(Mandatory = $true)]
        [string]$TestExecutionBranchName, # The name of the branch to create/reset for the test run (e.g., 'test-harness-execution-branch')
        [Parameter(Mandatory = $true)]
        [string]$LocalRepoPath, # Path to the local Git repository
        [Parameter(Mandatory = $true)]
        [string]$TestEnvironment, # For SQL script paths (e.g., 'QAS', 'DEV')
        [Parameter(Mandatory = $true)]
        [string]$LocalSqlCompletedDir, # Base path for completed SQL scripts for tests
        [Parameter(Mandatory = $true)]
        [string]$LocalSqlSourceDir, # Base path for source SQL scripts for tests
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog # Path to the log file
    )

    Write-Log -Message "--- Resetting Local Environment: TestExecutionBranch '$TestExecutionBranchName' from BaseRef '$BaseRef' ---" -Level "INFO" -LogFilePath $TestRunLog
    try {
        Push-Location -Path $LocalRepoPath -ErrorAction Stop

        Write-Log -Message "Fetching latest from origin (git fetch origin --tags --prune)..." -Level "INFO" -LogFilePath $TestRunLog
        git fetch origin --tags --prune
        if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }

        Write-Log -Message "Checking out BaseRef '$BaseRef'..." -Level "INFO" -LogFilePath $TestRunLog
        git checkout $BaseRef
        if ($LASTEXITCODE -ne 0) { throw "Failed to checkout BaseRef '$BaseRef'. Ensure it exists locally/remotely." }

        # If BaseRef is a branch (not a tag), ensure it's up to date with its remote counterpart
        if (-not (git show-ref --quiet --verify "refs/tags/$BaseRef")) {
            # Check if it's NOT a tag
            if ($BaseRef -match "^origin/") {
                Write-Log -Message "BaseRef '$BaseRef' is a remote-tracking branch, already up-to-date locally after fetch." -Level "INFO" -LogFilePath $TestRunLog
            }
            else {
                Write-Log -Message "Updating local BaseRef branch '$BaseRef' to match 'origin/$BaseRef' (git reset --hard origin/$BaseRef)..." -Level "INFO" -LogFilePath $TestRunLog
                git reset --hard "origin/$BaseRef" # Or git pull origin $BaseRef
                if ($LASTEXITCODE -ne 0) { throw "Failed to update BaseRef branch '$BaseRef' from its origin." }
            }
        }

        Write-Log -Message "Deleting local test execution branch '$TestExecutionBranchName' if it exists (git branch -D $TestExecutionBranchName)..." -Level "INFO" -LogFilePath $TestRunLog
        git branch -D $TestExecutionBranchName # Ignores error if not found, which is fine

        Write-Log -Message "Creating fresh local test execution branch '$TestExecutionBranchName' from '$BaseRef' (git checkout -b $TestExecutionBranchName $BaseRef)..." -Level "INFO" -LogFilePath $TestRunLog
        git checkout -b $TestExecutionBranchName $BaseRef
        if ($LASTEXITCODE -ne 0) { throw "Failed to create or checkout test execution branch '$TestExecutionBranchName' from '$BaseRef'." }

        Write-Log -Message "Cleaning working directory (git clean -fdx)..." -Level "INFO" -LogFilePath $TestRunLog
        git clean -fdx
        # git clean can have non-zero exit if nothing to clean. Consider this if it causes issues.

        # Reset SQL scripts for the specific test environment
        # These paths are specific to the test harness's SQL script management, not the deployment script's.
        $envSpecificTestCompletedSqlDir = Join-Path $LocalSqlCompletedDir $TestEnvironment.ToLower()
        $envSpecificTestSourceSqlDir = Join-Path $LocalSqlSourceDir $TestEnvironment.ToLower()

        Write-Log -Message "Resetting SQL scripts for test harness from '$envSpecificTestCompletedSqlDir' to '$envSpecificTestSourceSqlDir'..." -Level "INFO" -LogFilePath $TestRunLog
        if (Test-Path $envSpecificTestCompletedSqlDir -PathType Container) {
            if (-not (Test-Path $envSpecificTestSourceSqlDir -PathType Container)) {
                New-Item -Path $envSpecificTestSourceSqlDir -ItemType Directory -Force | Out-Null
            }
            Get-ChildItem -Path $envSpecificTestCompletedSqlDir -Filter *.sql | ForEach-Object {
                $destinationPath = Join-Path $envSpecificTestSourceSqlDir $_.Name
                Write-Log -Message "Moving SQL script '$($_.FullName)' back to '$destinationPath' for test setup." -Level "DEBUG" -LogFilePath $TestRunLog
                try {
                    Move-Item -Path $_.FullName -Destination $destinationPath -Force -ErrorAction Stop
                }
                catch {
                    Write-Log -Message "WARNING: Failed to move SQL script '$($_.Name)' for test setup. Error: $($_.Exception.Message)" -Level "WARN" -LogFilePath $TestRunLog
                }
            }
        }
        else {
            Write-Log -Message "No completed SQL scripts directory found for test harness at '$envSpecificTestCompletedSqlDir', or no scripts to move." -Level "INFO" -LogFilePath $TestRunLog
        }

        Write-Log -Message "Local environment reset complete. Active branch is '$TestExecutionBranchName'." -Level "SUCCESS" -LogFilePath $TestRunLog
    }
    catch {
        Write-Log -Message "FATAL: Failed to reset local environment. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $TestRunLog
        throw # Re-throw the exception to halt the test if critical
    }
    finally {
        Pop-Location -ErrorAction SilentlyContinue
    }
}

Function Reset-ServerEnvironment {
    # PRIORITY 3
    # The purpose of this function is to reset the server environment to a known state before running tests. There are two main scenarios:
    # 1. $ResetType = "full" - to test new environment deployments and database initialisation.
    #   - Deletes all files in the $DEPLOYMENT_GLOBAL_DIR/$Script:TestHarnessExecutionFolder directory.
    #   - Deletes all files in the $DEPLOYMENT_USER_DIR/$Script:TestHarnessBackupFolder directory.
    #   - Drops the $Script:TestHarnessExecutionSqlDB database and recreates it.
    # 2. $ResetType = "normal" - to test existing deployments and migrations.
    #   - Does a full reset and then:
    #       - Copies $DEPLOYMENT_GLOBAL_DIR/$ServerAppSourceRef to $DEPLOYMENT_GLOBAL_DIR/$Script:TestHarnessExecutionFolder directory.
    #       - Copies $DEPLOYMENT_USER_DIR/$ServerBackupSourceRef directory to $DEPLOYMENT_USER_DIR/$Script:TestHarnessBackupFolder directory.
    #       - Restores the latest sql backup from $DEPLOYMENT_USER_DIR/$ServerBackupSourceRef $Script:TestHarnessExecutionSqlDB database.

    param(
        
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog,

        [Parameter(Mandatory = $true)]
        [ValidateSet('full', 'normal')]
        [string]$ResetType, # Determines the extent of the reset

        [Parameter(Mandatory = $true)]
        [string]$TestEnvironmentName, # For logging and context (e.g., 'QAS', 'DEV', 'TEST')

        # Parameters for 'normal' reset, referencing source materials
        [Parameter()]
        [string]$SourceAppRefNameForNormalReset, # Name of the source application folder (e.g., 'Tracker_Project_QAS')
        [string]$SourceBackupRefNameForNormalReset # Name of the source backup folder (e.g., 'backup_QAS')
    )

    Write-Log -Message "--- Resetting Server Environment (Type: $ResetType, Env: $TestEnvironmentName) ---" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "--- Resetting Server Environment (Type: $ResetType, Env: $TestEnvironmentName) ---" -Level "INFO" -LogFilePath $TestRunLog

    # Validate parameters for 'normal' reset
    if ($ResetType -eq 'normal' -and (-not $SourceAppRefNameForNormalReset -or -not $SourceBackupRefNameForNormalReset)) {
        Write-Log -Message "FATAL: For 'normal' reset, SourceAppRefNameForNormalReset and SourceBackupRefNameForNormalReset parameters are required." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Missing source references for normal reset."
    }
    # Define target paths on the server using global script variables
    $targetAppDir = "$DEPLOYMENT_GLOBAL_DIR/$Script:TestHarnessExecutionFolder"
    $targetBackupDir = "$DEPLOYMENT_USER_DIR/$Script:TestHarnessBackupFolder" # As per plan: $DEPLOYMENT_USER_DIR
    $targetDbName = $Script:TestHarnessExecutionSqlDB

    # --- Step 1: Full Cleanup (Common for both 'full' and 'normal' reset types initially) ---
    Write-Log -Message "Performing full cleanup of test directories and database..." -Level "INFO" -LogFilePath $TestRunLog

    # 1.1: Delete and recreate the target application directory
    $cleanAppDirCmd = "rm -rf '$targetAppDir' && mkdir -p '$targetAppDir'"
    Invoke-SshCommand -Command $cleanAppDirCmd -ActionDescription "clean and recreate target app directory '$targetAppDir'" -TestRunLog $TestRunLog -IsFatal $true

    # 1.2: Delete and recreate the target backup directory
    $cleanBackupDirCmd = "rm -rf '$targetBackupDir' && mkdir -p '$targetBackupDir'"
    Invoke-SshCommand -Command $cleanBackupDirCmd -ActionDescription "clean and recreate target backup directory '$targetBackupDir'" -TestRunLog $TestRunLog -IsFatal $true

    # 1.3: Drop the target database and recreate it
    $dropCreateDbCmd = "mysql -e ""DROP DATABASE IF EXISTS \`"$targetDbName\`"; CREATE DATABASE \`"$targetDbName\`";"""
    Invoke-SshCommand -Command $dropCreateDbCmd -ActionDescription "drop and recreate database '$targetDbName'" -TestRunLog $TestRunLog -IsFatal $true

    Write-Log -Message "Full cleanup phase complete." -Level "SUCCESS" -LogFilePath $TestRunLog

    # --- Step 2: If 'normal' reset, restore from source ---
    if ($ResetType -eq 'normal') {
        Write-Log -Message "Performing 'normal' reset: restoring application and database from sources..." -Level "INFO" -LogFilePath $TestRunLog

        if (-not $SourceAppRefNameForNormalReset -or -not $SourceBackupRefNameForNormalReset) {
            Write-Log -Message "FATAL: For 'normal' reset, SourceAppRefNameForNormalReset and SourceBackupRefNameForNormalReset parameters are required." -Level "FATAL" -LogFilePath $TestRunLog
            throw "Missing source references for normal reset."
        }

        $sourceAppDirFullPath = "$DEPLOYMENT_GLOBAL_DIR/$SourceAppRefNameForNormalReset"
        $sourceBackupDirFullPath = "$DEPLOYMENT_USER_DIR/$SourceBackupRefNameForNormalReset" # As per plan

        # 2.1: Copy source application files to target application directory
        Write-Log -Message "Copying source application from '$sourceAppDirFullPath' to '$targetAppDir'..." -Level "INFO" -LogFilePath $TestRunLog
        $copyAppCmd = "if [ -d '$sourceAppDirFullPath' ]; then cp -a '$sourceAppDirFullPath/.' '$targetAppDir/'; echo 'App copy complete.'; else echo 'Warning: Source app directory $sourceAppDirFullPath not found. Skipping copy.'; fi"
        Invoke-SshCommand -Command $copyAppCmd -ActionDescription "copy source application files" -TestRunLog $TestRunLog -IsFatal $true

        # 2.2: Copy source backup files to target backup directory
        Write-Log -Message "Copying source backups from '$sourceBackupDirFullPath' to '$targetBackupDir'..." -Level "INFO" -LogFilePath $TestRunLog
        $copyBackupCmd = "if [ -d '$sourceBackupDirFullPath' ]; then cp -a '$sourceBackupDirFullPath/.' '$targetBackupDir/'; echo 'Backup copy complete.'; else echo 'Warning: Source backup directory $sourceBackupDirFullPath not found. Skipping copy.'; fi"
        Invoke-SshCommand -Command $copyBackupCmd -ActionDescription "copy source backup files" -TestRunLog $TestRunLog -IsFatal $true

        # 2.3: Restore the latest SQL backup from the *source* backup directory to the target database
        Write-Log -Message "Restoring latest SQL backup from '$sourceBackupDirFullPath' to database '$targetDbName'..." -Level "INFO" -LogFilePath $TestRunLog
        # Find the latest .sql file (lexicographical sort might be okay if timestamps are in names, otherwise use find with -printf '%T@')
        $findLatestBackupCmd = "find '$sourceBackupDirFullPath' -maxdepth 1 -name '*.sql' -type f -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-"
        $latestBackupResult = Invoke-SshCommand -Command $findLatestBackupCmd -ActionDescription "find latest SQL backup in '$sourceBackupDirFullPath'" -TestRunLog $TestRunLog -CaptureOutput -IsFatal $false

        if ($latestBackupResult.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($latestBackupResult.StdOut)) {
            $latestBackupPath = $latestBackupResult.StdOut.Trim()
            Write-Log -Message "Found latest backup: $latestBackupPath" -Level "INFO" -LogFilePath $TestRunLog
            $restoreDbCmd = "mysql '$targetDbName' < '$latestBackupPath'"
            Invoke-SshCommand -Command $restoreDbCmd -ActionDescription "restore database '$targetDbName' from '$latestBackupPath'" -TestRunLog $TestRunLog -IsFatal $true
            Write-Log -Message "Database '$targetDbName' restored successfully from '$latestBackupPath'." -Level "SUCCESS" -LogFilePath $TestRunLog
        }
        else {
            Write-Log -Message "Warning: No SQL backup file found in '$sourceBackupDirFullPath' or failed to list them (ExitCode: $($latestBackupResult.ExitCode)). Database '$targetDbName' might be empty or in its post-table-drop state." -Level "WARN" -LogFilePath $TestRunLog
        }
        Write-Log -Message "'Normal' reset phase complete." -Level "SUCCESS" -LogFilePath $TestRunLog
    }
    elseif ($ResetType -eq 'full') {
        Write-Log -Message "'Full' reset complete. Server is in a clean state." -Level "SUCCESS" -LogFilePath $TestRunLog
    }

    Write-Log -Message "Server Environment Reset finished." -Level "SUCCESS" -LogFilePath $TestRunLog
}

Function Set-LocalEnvironment {
    # PRIORITY 4
    # PRIORITY 4
    # - Specific Setups: Functions to create specific conditions, e.g., Set-LocalRunMode (to set the run mode to 'test' for ERR-1/2), Remove-LocalKey (modify authorized_keys).
    param(
        [Parameter(Mandatory = $true)]
        [string]$Scenario, # The scenario to set up (e.g., 'HP-1', 'ERR-12')
        [string]$Environment, # The environment to set up (e.g., 'DEV', 'QAS')
        [string]$TestRunLog # Path to the log file        
        
    )

    Write-Log -Message "Starting Test: [$($testScenario.TestID)] - $($testScenario.Description)" -Level "INFO" -LogFilePath $TestRunLog
}
Function Set-ServerEnvironment {
    # PRIORITY 5
    # PRIORITY 5
    #Server: rm -rf deployed code/backups, dropping/creating DB (or restoring from backup), maybe restarting clean services.
    # - Specific Setups: Functions to create specific conditions, e.g., Set-DirectoryPermissions (to make a dir unwritable for ERR-12/13), Ensure-FileExists (place dummy migration script), Remove-ServerKey (modify authorized_keys).
    param(
        [Parameter(Mandatory = $true)]
        [string]$Scenario, # The scenario to set up (e.g., 'HP-1', 'ERR-12')
        [string]$Environment, # The environment to set up (e.g., 'DEV', 'QAS')
        [switch]$Database, # Whether to set up the database as well
        [string]$TestRunLog # Path to the log file

        
    )
}

Function Invoke-TestLoop {
    # PRIORITY 6
    # PRIORITY 6
    # Need to accumulate pass/fail results.
    param(
        [Parameter(Mandatory = $true)]
        [array]$TestScenarios, # The list of test scenarios to run
        [Parameter(Mandatory = $true)]
        [string]$TestEnvironment, # The environment to test against (e.g., 'DEV', 'QAS')
        [switch]$NoCleanup, # Skip cleanup after tests
        [switch]$SkipSetup, # Skip setup steps (useful for debugging)
        [switch]$Verbose, # Verbose output for the test script itself
        [string]$TestRunLog # Path to the log file
    )

    # Main Test Loop:
    foreach ($testScenario in $TestScenarios) {
        Write-Log -Message "Starting Test: [$($testScenario.TestID)] - $($testScenario.Description)" -Level "INFO" -LogFilePath $TestRunLog

        # Determine reset parameters for the current test
        # Use test-specific value if provided, otherwise fall back to global script parameter
        $effectiveResetType = $testScenario.ResetType                                 # Test scenarios should ideally define this
        if (-not $effectiveResetType) { $effectiveResetType = $ResetType }            # Fallback to global $ResetType if not in test def

        $effectiveSourceAppRef = $testScenario.SourceAppRefNameForNormalReset         # Can be $null if not defined in test
        if (-not $effectiveSourceAppRef) { $effectiveSourceAppRef = $ServerAppSourceRef } # Fallback to global

        $effectiveSourceBackupRef = $testScenario.SourceBackupRefNameForNormalReset   # Can be $null if not defined in test
        if (-not $effectiveSourceBackupRef) { $effectiveSourceBackupRef = $ServerBackupSourceRef } # Fallback to global

        # Run Reset-LocalEnvironment and Reset-ServerEnvironment (Standard Teardown).
        Reset-LocalEnvironment -BaseRef $GitSourceRef `
            -TestExecutionBranchName $Script:TestHarnessExecutionBranch `
            -LocalRepoPath $DEPLOYMENT_GIT_REPO_PATH `
            -TestEnvironment $TestEnvironment `
            -LocalSqlCompletedDir $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_COMPLETED_PATH `
            -LocalSqlSourceDir $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_PATH `
            -TestRunLog $TestRunLog

        # Call Reset-ServerEnvironment with the new parameters
        # $ResetType, $ServerAppSourceRef, $ServerBackupSourceRef are main script parameters
        Reset-ServerEnvironment -TestRunLog $TestRunLog `
            -ResetType $effectiveResetType ` # Use the same effective reset type for cleanup, or define a specific cleanup strategy in the test scenario
            -TestEnvironmentName $TestEnvironment `
            -SourceAppRefNameForNormalReset $effectiveSourceAppRef `
            -SourceBackupRefNameForNormalReset $effectiveSourceBackupRef

        if (-not $SkipSetup) {
            Write-Log -Message "Running Setup Steps..." -Level "INFO" -LogFilePath $TestRunLog
            # Check if SetupSteps is a ScriptBlock or a string and invoke it accordingly
            if ($testScenario.SetupSteps -is [ScriptBlock]) {
                & $testScenario.SetupSteps.Invoke()
            }
            elseif ($testScenario.SetupSteps) {
                Write-Log -Message "Warning: SetupSteps for $($testScenario.TestID) is not a ScriptBlock. Skipping." -Level "WARN" -LogFilePath $TestRunLog
            }
        }
        else {
            Write-Log -Message "Skipping Setup Steps for $($testScenario.TestID) as per -SkipSetup flag." -Level "INFO" -LogFilePath $TestRunLog
        }

        Write-Log -Message "Invoking Deployment Script..." -Level "INFO" -LogFilePath $TestRunLog
        $DeployResult = Invoke-DeploymentScript -Parameters $testScenario.Parameters

        # Accumulate results from the deployment script
        if ($DeployResult.ExitCode -ne 0) {
            Write-Log -Message "Deployment failed for $($testScenario.TestID). Exit Code: $($DeployResult.ExitCode)" -Level "ERROR" -LogFilePath $TestRunLog
            # Optionally log StdErr content here if it exists and exit code is non-zero
            if ($DeployResult.StdErr) {
                Write-Log -Message "Deployment Script StdErr: $($DeployResult.StdErr)" -Level "ERROR" -LogFilePath $TestRunLog -NoConsole # Avoid double console output if Write-Error was used in child
            }
            
        }
        else {
            Write-Log -Message "Deployment succeeded for $($testScenario.TestID). Exit Code: $($DeployResult.ExitCode)" -Level "SUCCESS" -LogFilePath $TestRunLog
        }

        $TestResults += [PSCustomObject]@{
            TestID   = $testScenario.TestID
            Status   = "FAIL"
            ExitCode = $DeployResult.ExitCode
            StdOut   = $DeployResult.StdOut
            StdErr   = $DeployResult.StdErr
            LogFile  = $DeployResult.DeploymentLog
        }

        # Run Validation Steps if provided
        Write-Log -Message "Running Validation Steps..." -Level "INFO" -LogFilePath $TestRunLog
        # Check if ValidationSteps is a ScriptBlock or a string and invoke it accordingly
        if ($testScenario.ValidationSteps -is [ScriptBlock]) {
            & $testScenario.ValidationSteps.Invoke($DeployResult)
        }
        elseif ($testScenario.ValidationSteps) {
            Write-Log -Message "Warning: ValidationSteps for $($testScenario.TestID) is not a ScriptBlock. Skipping." -Level "WARN" -LogFilePath $TestRunLog
        }
    
        # Run standard Teardown again if -NoCleanup is not specified.
        if (-not $NoCleanup) {
            Write-Log -Message "Running Cleanup Steps..." -Level "INFO" -LogFilePath $TestRunLog
            Reset-LocalEnvironment -BaseRef $GitSourceRef `
                -TestExecutionBranchName $Script:TestHarnessExecutionBranch `
                -LocalRepoPath $DEPLOYMENT_GIT_REPO_PATH `
                -TestEnvironment $TestEnvironment `
                -LocalSqlCompletedDir $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_COMPLETED_PATH `
                -LocalSqlSourceDir $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_PATH `
                -TestRunLog $TestRunLog

            Reset-ServerEnvironment -TestRunLog $TestRunLog `
                -ResetType $effectiveResetType ` # Use the same effective reset type for cleanup, or define a specific cleanup strategy in the test scenario
                -ServerAppSourceRef $ServerAppSourceRef `
                -ServerBackupSourceRef $ServerBackupSourceRef `
                -TestEnvironmentName $TestEnvironment `
                -SourceAppRefNameForNormalReset $effectiveSourceAppRef `
                -SourceBackupRefNameForNormalReset $effectiveSourceBackupRef
        }
       
    }
    catch {
        Write-Log -Message "FATAL: Test loop failed. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $TestRunLog
        Write-Log -Message "Last test scenario: $($testScenario.TestID)" -Level "ERROR" -LogFilePath $TestRunLog
        throw "Halting due to test loop failure."
    }
    return $TestResults
}


Function Invoke-AutomatedSystemTests {
    # - Validate backend and frontend (run Automated System Tests tests which include API and Page Load tests):
    #   - Using Invoke-RestMethod or Invoke-WebRequest call the following endpoints:
    #       - /api/system_test_list
    #       - Loop through the list of tests and run them by calling: 
    #           - /api/run_system_test

    param(
        [Parameter(Mandatory = $true)]
        [string]$TestEnvironment, # The environment to validate against (e.g., 'DEV', 'QAS')
        [string]$TestRunLog # Path to the log file
    )
    
    try {

        $systemTestList = Invoke-RestMethod -Uri "$DEPLOYMENT_URL/api/system_test_list" -Method Get
        # Filter the test list to include only deployment tests
        $systemTestList = $systemTestList | Where-Object { $_.Type -eq "deployment_test" }
        $failedTests = 0
        $passedTests = 0
        $skippedTests = 0
        $testIDs = @()
    
        foreach ($test in $systemTestList) {
            $testID = $test.id
            $testIDs += $testID
            Write-Log -Message "Running Automated System Test: [$testID] - $($test.Description)" -Level "INFO" -LogFilePath $TestRunLog

            # Run the test using Invoke-RestMethod or Invoke-WebRequest
            $result = Invoke-RestMethod -Uri "$DEPLOYMENT_URL/api/run_system_test/$testID" -Method Post

            if ($result.Status -eq "PASS") {
                Write-Log -Message "Automated System Test [$testID] passed." -Level "SUCCESS" -LogFilePath $TestRunLog
                $passedTests++
            }
            elseif ($result.Status -eq "FAIL") {
                Write-Log -Message "Automated System Test [$testID] failed." -Level "ERROR" -LogFilePath $TestRunLog
                $failedTests++
            }
            else {
                Write-Log -Message "Automated System Test [$testID] skipped." -Level "WARN" -LogFilePath $TestRunLog
                $skippedTests++
            }
        }

    }
    catch {
        Write-Log -Message "FATAL: Automated System Tests failed. Error: $($_.Exception.Message)" -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to automated system test failure."
    }

    # Print the summary of the automated system tests
    Write-Log -Message "Automated System Tests Summary:" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "Passed: $passedTests, Failed: $failedTests, Skipped: $skippedTests" -Level "INFO" -LogFilePath $TestRunLog

    return $testIDs # Return the list of test IDs for further processing if needed
   
}

Function Show-TestSummary {
    #Needs variables like $passedTests, $failedTests passed in or calculated globally. Logic for calculating duration is fine. Log parsing for pass/fail counts might be fragile; better to accumulate counts during the Invoke-TestLoop.
    #Result Accumulation: Modify Invoke-TestLoop to store pass/fail status for each test, perhaps in the original hashtable within the $Runlist, so Show-TestSummary can read counts and failed IDs accurately.

    # - Summary Report:
    #   - Print counts of Passed/Failed/Skipped tests.
    #   - List the IDs of failed tests and maybe link to logs.
    #   - Print the final status of the deployment (e.g., "Deployment completed successfully" or "Deployment failed").
    #   - Print the total time taken for the test run.
    #   - Print the location of the log file.

    param(
        [Parameter(Mandatory = $true)]
        [array]$Results, # The results from the test run
        [Parameter(Mandatory = $true)]
        [string]$StartTime, # Start time of the test run
        [Parameter(Mandatory = $true)]
        [string]$EndTime, # End time of the test run
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog # Path to the log file
    )
    
    Write-Log -Message "#############################################################################" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "-------------------------- Test Run Summary Report --------------------------" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "#############################################################################" -Level "INFO" -LogFilePath $TestRunLog

    #Determine the number of passed, failed, and skipped tests
    $passedTests = ($Results | Where-Object { $_.Status -eq "PASS" }).Count
    $failedTests = ($Results | Where-Object { $_.Status -eq "FAIL" }).Count
    $skippedTests = ($Results | Where-Object { $_.Status -eq "SKIP" }).Count



    # Add summary report logic here
    # Print the final status of the deployment
    if ($failedTests -eq 0) {
        Write-Log -Message "Deployment completed successfully." -Level "SUCCESS" -LogFilePath $TestRunLog
    }
    else {
        Write-Log -Message "Deployment failed with $failedTests errors." -Level "ERROR" -LogFilePath $TestRunLog
    }
    
    # Calculate the total time taken for the test run
    $startTime = [datetime]::ParseExact($StartTime, 'yyyyMMdd_HHmmss', $null)
    $endTime = [datetime]::ParseExact($EndTime, 'yyyyMMdd_HHmmss', $null)
    $totalTime = $endTime - $startTime
    
    Write-Log -Message "Total time taken for the test run: $($totalTime.TotalMinutes) minutes" -Level "INFO" -LogFilePath $TestRunLog
    
    Write-Log -Message "Start time: $StartTime" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "End time: $EndTime" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "Passed tests: $passedTests" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "Failed tests: $failedTests" -Level "INFO" -LogFilePath $TestRunLog
    Write-Log -Message "Skipped tests: $skippedTests" -Level "INFO" -LogFilePath $TestRunLog

    # List the IDs of failed tests and the log file location
    if ($failedTests -gt 0) {
        Write-Log -Message "Failed tests:" -Level "ERROR" -LogFilePath $TestRunLog
        foreach ($result in $Results | Where-Object { $_.Status -eq "FAIL" }) {
            Write-Log -Message "Test ID: $($result.TestID), Log File: $($result.LogFile)" -Level "ERROR" -LogFilePath $TestRunLog
        }
    }
    
    # Print the location of the log file
    Write-Log -Message "Log file location: $TestRunLog" -Level "INFO" -LogFilePath $TestRunLog    
    Write-Log -Message "Test run completed. Log file: $TestRunLog" -Level "INFO" -LogFilePath $TestRunLog
}

##################################################################################
#-------------------------------- Assert Functions WIP --------------------------#
##################################################################################

Function Assert-ZeroExitCode {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Result # The result object from Invoke-DeploymentScript
    )
    if ($Result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Deployment failed with exit code $($Result.ExitCode)" -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to deployment failure."
    }
}

Function Assert-NonZeroExitCode {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Result # The result object from Invoke-DeploymentScript
    )
    if ($Result.ExitCode -eq 0) {
        Write-Log -Message "FATAL: Deployment succeeded when it was expected to fail." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to unexpected deployment success."
    }
}
Function Assert-LogContains {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogFile, # The log file to check
        [Parameter(Mandatory = $true)]
        [string]$Pattern, # The pattern to search for in the log file
        [switch]$IsError # Whether the pattern is an error message
    )
    if (-not (Get-Content $LogFile | Select-String -Pattern $Pattern)) {
        Write-Log -Message "FATAL: Log file '$LogFile' does not contain expected pattern '$Pattern'" -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to missing expected log pattern."
    }
}
Function Assert-LogDoesNotContain {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogFile, # The log file to check
        [Parameter(Mandatory = $true)]
        [string]$Pattern # The pattern to search for in the log file
    )
    if (Get-Content $LogFile | Select-String -Pattern $Pattern) {
        Write-Log -Message "FATAL: Log file '$LogFile' contains unexpected pattern '$Pattern'" -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to unexpected log pattern."
    }
}

Function Assert-RemotePathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path # The remote path to check
    )
    $result = Invoke-RemoteCommand -Command "test -d $Path" -Environment $TestEnvironment
    if ($result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Remote path '$Path' does not exist." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to missing remote path."
    }
}

Function Assert-RemoteServiceActive {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServiceName # The name of the remote service to check
    )
    $result = Invoke-RemoteCommand -Command "systemctl is-active $ServiceName" -Environment $TestEnvironment
    if ($result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Remote service '$ServiceName' is not active." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to inactive remote service."
    }
}

Function Assert-RemoteDbTableExists {
    # Example Revision
    # $sql = "USE `$Database`; SHOW TABLES LIKE '$Table';" # Use backticks for DB name
    # $result = Invoke-SshCommand -Command "mysql -N -s -e `"$sql`"" -CaptureOutput -TestRunLog $TestRunLog -IsFatal $false
    # if ($result.ExitCode -ne 0 -or $result.StdOut.Trim() -ne $Table) {
    #     Write-Log ... -Level "FATAL"
    #     throw ...
    # }
    
    param(
        [Parameter(Mandatory = $true)]
        [string]$Database, # The name of the database to check
        [Parameter(Mandatory = $true)]
        [string]$Table # The name of the table to check
    )
    $result = Invoke-RemoteCommand -Command "mysql -N -s -e 'SHOW TABLES LIKE \"$Table\"'" -Environment $TestEnvironment
    if ($result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Remote database table '$Table' does not exist in database '$Database'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to missing remote database table."
    }
}
Function Assert-RemoteDirectoryPermissions {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path, # The remote path to check
        [Parameter(Mandatory = $true)]
        [string]$Permissions # The expected permissions (e.g., '000')
    )
    $result = Invoke-RemoteCommand -Command "stat -c '%a' $Path" -Environment $TestEnvironment
    if ($result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Unable to check permissions for remote path '$Path'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to permission check failure."
    }
    if ($result.Output -ne $Permissions) {
        Write-Log -Message "FATAL: Remote path '$Path' does not have expected permissions '$Permissions'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to unexpected remote path permissions."
    }
}

Function Assert-RemoteFileTimestamp {
    #Assert-RemoteFileTimestamp: Need to parse the output of stat -c %Y correctly. Use [System.DateTimeOffset]::FromUnixTimeSeconds($unixTimestamp).LocalDateTime or similar. The comparison needs care.
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path, # The remote path to check
        [Parameter(Mandatory = $true)]
        [datetime]$ExpectedTimestamp # The expected timestamp (e.g., '2023-10-01 12:00:00')
    )
    $result = Invoke-RemoteCommand -Command "stat -c '%Y' $Path" -Environment $TestEnvironment
    if ($result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Unable to check timestamp for remote path '$Path'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to timestamp check failure."
    }
    if ([datetime]::ParseExact($result.Output, 'yyyyMMdd_HHmmss', $null) -ne $ExpectedTimestamp) {
        Write-Log -Message "FATAL: Remote path '$Path' does not have expected timestamp '$ExpectedTimestamp'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to unexpected remote path timestamp."
    }
}
Function Assert-RemoteFileLineCount {
    #Assert-RemoteFileLineCount: Command should be wc -l < '$Path' | awk '{print $1}' to get just the number reliably. Parse the output as [int].
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path, # The remote path to check
        [Parameter(Mandatory = $true)]
        [int]$ExpectedLineCount # The expected line count (e.g., 100)
    )
    $result = Invoke-RemoteCommand -Command "wc -l < $Path" -Environment $TestEnvironment
    if ($result.ExitCode -ne 0) {
        Write-Log -Message "FATAL: Unable to check line count for remote path '$Path'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to line count check failure."
    }
    if ($result.Output -ne $ExpectedLineCount) {
        Write-Log -Message "FATAL: Remote path '$Path' does not have expected line count '$ExpectedLineCount'." -Level "FATAL" -LogFilePath $TestRunLog
        throw "Halting due to unexpected remote path line count."
    }
}

##################################################################################
#-------------------------------- Helper Functions ------------------------------#
##################################################################################

Function Test-Logfile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog
    )

    # Create a new log file or clear the existing one
    try {
        # Test if the log file can be created or updated
        Write-Host "Confirming Log File: $TestRunLog"
        try {
            # Create a 0-byte file or update timestamp if it exists. Creates dirs if needed.
            New-Item -Path $TestRunLog -ItemType File -Force -ErrorAction Stop | Out-Null 
            Write-Host "Log file Confirmed." -ForegroundColor Green
        }
        catch {
            Write-Error "FATAL: Failed to create log file '$TestRunLog'. Check path and permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
        }

        # Test if the log file is writable
        Write-Host "Log file Permission Check: $TestRunLog"
        try {
            Add-Content -Path $TestRunLog -Value "Permission Check Write Test - $(Get-Date)" -ErrorAction Stop
            Write-Host "Log Write Test Passed" -ForegroundColor Green
        }
        catch {
            Write-Error "FATAL: Failed direct write test to '$TestRunLog'. Check Permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
        }

        # Finally, test the Write-Log function itself
        Write-Host "Testing Write-Log Function: $TestRunLog"
        try {
            # Test the Write-Log function with a sample message
            Write-Log -Message "Test Write-Log Function INFO: $TestRunLog" -Level "INFO" -LogFilePath $TestRunLog
        
            # Test with different log levels
            Write-Log -Message "Test Write-Log Function WARN: $TestRunLog" -Level "WARN" -LogFilePath $TestRunLog
            Write-Log -Message "Test Write-Log Function DEBUG: $TestRunLog" -Level "DEBUG" -LogFilePath $TestRunLog
            Write-Log -Message "Test Write-Log Function INFO, No Console: $TestRunLog" -Level "INFO" -LogFilePath $TestRunLog -NoConsole

            Write-Log -Message "Write-Log Function Test Passed: $TestRunLog" -Level "SUCCESS" -LogFilePath $TestRunLog
        }
        catch {
            # Handle any errors in the logging process itself
            Write-Host "FATAL: Write-Log function test failed. Error: $($_.Exception.Message)" -ErrorAction Stop
        }
            
    }
    catch {
        Write-Error "FATAL: Failed to open log file '$TestRunLog'. Check path and permissions. Error: $($_.Exception.Message)" -ErrorAction Stop
    }
}

Function Open-Logfile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog # Path to the script root directory
    )

    #--- Open Log File in Notepad++ ---
    if (Test-Path $TestRunLog -PathType Leaf) {
        Write-Host "`nAttempting to open log file '$TestRunLog' in Notepad++..." -ForegroundColor Gray
        try {
            # Try assuming notepad++.exe is in the system PATH first
            # Start-Process -FilePath "notepad++.exe" -ArgumentList $TestRunLog -ErrorAction Stop 
                
            # Using custom ahk script to launch Notepad++ with monitoring mode on
            $launcherPath = Join-Path $ScriptRoot "LaunchNPP_Monitor.exe"
            if (-not (Test-Path $launcherPath)) {
                Write-Warning "Launcher script not found at '$launcherPath'. Not launching Notepad++."
                return
            }
            Start-Process "`"$launcherPath`"" -ArgumentList "`"$TestRunLog`""

            Write-Host "-> Notepad++ launched." -ForegroundColor Gray
        } 
        catch {
            # Handle error if notepad++.exe is not found in Program Files (x86) or fails to launch
            Write-Warning "Could not automatically launch Notepad++."
        }
    }
            
    else {
        Write-Warning "Could not find log file at '$TestRunLog' to open."
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

Function Invoke-LocalCommand {
    # - Executes arbitrary commands locally....
    # (e.g., git checkout, npm install, etc.)
    # - Needs to return exit code and capture output for validation checks.

    param(
        [Parameter(Mandatory = $true)]
        [string]$Command # The command to execute locally
    )

    # Construct the PowerShell command and execute it locally
    Write-Log -Message "Executing local command: $Command" -Level "INFO" -LogFilePath $TestRunLog

    try {
        $result = Invoke-Expression $Command
        return $result
    }
    catch {
        if (-not $IgnoreErrors) {
            Write-Log -Message "FATAL: Local command execution failed: $_" -Level "FATAL" -LogFilePath $TestRunLog
            throw "Halting due to local command execution error."
        }
        else {
            Write-Log -Message "WARNING: Local command execution failed but ignored: $_" -Level "WARNING" -LogFilePath $TestRunLog
            return $null
        }
    }
}
    
Function Invoke-SshCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command, # The command or script block to execute
        [Parameter(Mandatory = $false)]
        [switch]$UseSudo, # If set, prepend 'sudo ' to the command
        [Parameter(Mandatory = $true)]
        [string]$TestRunLog, # Path to the build log file
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
    
    Write-Log -Message "Executing via WSL ($ActionDescription): $wslExe $($wslArgsList -join ' ')" -Level "INFO" -LogFilePath $TestRunLog

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
            Write-Log -Message "WSL/SSH StdOut: $sshOutput" -Level "INFO" -LogFilePath $TestRunLog
        }
        if ($stdErrOutput) {
            if ($sshExitCode -ne 0) {
                Write-Log -Message "WSL/SSH StdErr: $stdErrOutput" -Level "ERROR" -LogFilePath $TestRunLog
            }
            else {
                Write-Log -Message "WSL/SSH StdErr: $stdErrOutput" -Level "INFO" -LogFilePath $TestRunLog
            }
        }
    }
    catch {
        Write-Log -Message "FATAL: WSL/SSH command execution failed for '$ActionDescription'. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $TestRunLog
    }

    if ($sshExitCode -ne 0) {
        $errorMessage = "Failed to $ActionDescription via WSL. Exit Code: $sshExitCode."

        # Attempt cleanup if specified
        if ($FailureCleanupCommand) {
            Write-Log -Message "Attempting cleanup command via WSL after failure: $FailureCleanupCommand" -Level "WARNING" -LogFilePath $TestRunLog

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
                Write-Log -Message "Failed to start the WSL cleanup command. Error: $($_.Exception.Message)" -Level "ERROR" -LogFilePath $TestRunLog
                $cleanupExitCode = -999
            }

            # Check the exit code from the cleanup process object
            if ($cleanupExitCode -ne 0) {
                Write-Log -Message "WSL cleanup command also failed (Exit Code: $cleanupExitCode)." -Level "ERROR" -LogFilePath $TestRunLog
            }
            else {
                Write-Log -Message "WSL cleanup command executed successfully." -Level "SUCCESS" -LogFilePath $TestRunLog
            }
        }

        if ($IsFatal) {
            Write-Log -Message "FATAL ($ActionDescription): $errorMessage Check WSL/SSH output above or logs on server. Exiting." -Level "FATAL" -LogFilePath $TestRunLog # Changed Level to FATAL
            throw "Halting due to fatal error during '$ActionDescription'."
        }
        else {
            Write-Log -Message "Warning ($ActionDescription): $errorMessage Check WSL/SSH output above or logs on server. Continuing." -Level "WARNING" -LogFilePath $TestRunLog
        }
    }
    else {
        Write-Log -Message "$ActionDescription via WSL completed successfully." -Level "SUCCESS" -LogFilePath $TestRunLog
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

Function Confirm-ActiveTestBranch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ExpectedBranch,
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$LogPath
    )
    Push-Location -Path $RepoPath -ErrorAction Stop
    try {
        $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
        if ($LASTEXITCODE -ne 0 -or $currentBranch -ne $ExpectedBranch) {
            Write-Log -Message "FATAL: Expected branch '$ExpectedBranch' to be active, but found '$currentBranch'. This indicates a potential issue with the test setup flow." -Level "FATAL" -LogFilePath $LogPath
            throw "Incorrect Git branch active before deploying."
        }
        Write-Log -Message "Confirmed active branch is '$ExpectedBranch'." -Level "DEBUG" -LogFilePath $LogPath
    }
    finally {
        Pop-Location -ErrorAction SilentlyContinue
    }
}
##################################################################################
#--------------------------------- Initial Setup --------------------------------#
##################################################################################

# Set the script directory as the working directory
Set-Location -Path $PSScriptRoot
$scriptRoot = $PSScriptRoot

# --- Define Timestamp ---
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Set the log file path
$testRunLog = Join-Path $DEPLOYMENT_TEST_DEP_BASE_DIR $DEPLOYMENT_TEST_LOG_DIR "deployment_test_run_$timestamp.log"

Test-Logfile -TestRunLog $testRunLog

# --- Open the log file in Notepad++ with monitoring on ---
Open-Logfile -TestRunLog $testRunLog

# Initialise the test harness configuration
Initialize-TestHarnessConfig -TestEnvironment $TestEnvironment `
    -ScriptRoot $scriptRoot `
    -TestRunLog $testRunLog

##################################################################################
#---------------------------- Exclusive Actions ---------------------------------#
##################################################################################
# Handles parameters that trigger a single action and then exits, bypassing the main test loop.

# If -ResetOnly is set, reset the local and server environments
# This will ignore all other parameters and just run the reset functions
# Exit the script after resetting
if ($ResetOnly) {
    Write-Log -Message "Resetting local and server environments..." -Level "INFO" -LogFilePath $TestRunLog
    Reset-LocalEnvironment -BaseRef $GitSourceRef `
        -TestExecutionBranchName $Script:TestHarnessExecutionBranch `
        -LocalRepoPath $DEPLOYMENT_GIT_REPO_PATH `
        -TestEnvironment $TestEnvironment `
        -LocalSqlCompletedDir $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_COMPLETED_PATH `
        -LocalSqlSourceDir $DEPLOYMENT_LOCAL_RELEASE_SCRIPTS_PATH `
        -TestRunLog $TestRunLog

    Write-Log -Message "Local environment reset complete." -Level "INFO" -LogFilePath $TestRunLog

    Write-Log -Message "Resetting server environment..." -Level "INFO" -LogFilePath $TestRunLog
    # Reset the server environment
    Reset-ServerEnvironment -TestRunLog $TestRunLog `
        -ResetType $ResetType `
        -TestEnvironmentName $TestEnvironment `
        -SourceAppRefNameForNormalReset $ServerAppSourceRef `
        -SourceBackupRefNameForNormalReset $ServerBackupSourceRef 
    Write-Log -Message "Reset complete. Exiting script." -Level "INFO" -LogFilePath $TestRunLog
    return
}


##################################################################################
#-------------------------------- Main Test Loop --------------------------------#
##################################################################################

# Load the test definitions apply filtering based on -RunOnly and -SkipTags
# This will return the filtered list of test scenarios
$Runlist = Get-TestDefinitions

# Pass the filtered test scenarios to the main test loop
# This will run the tests, setup, and validation steps as defined in the test scenarios
$Results = Invoke-TestLoop -TestScenarios $Runlist -TestEnvironment $TestEnvironment -NoCleanup:$NoCleanup -SkipSetup:$SkipSetup -Verbose:$Verbose -TestRunLog $testRunLog

##################################################################################
#-------------------------------- Summary Report --------------------------------#
##################################################################################

# Print the summary report of the test run
# This will include the counts of passed/failed/skipped tests, failed test IDs, and the final status of the deployment
Show-TestSummary -Results $Results -StartTime $timestamp -EndTime (Get-Date -Format "yyyyMMdd_HHmmss") -TestRunLog $testRunLog


##################################################################################
#------------------------------- Test Definitions WIP----------------------------#
##################################################################################

<# .PARAMETER LIST FOR REFERENCE
deploy_to_droplet.ps1
param(
    [Parameter(Mandatory = $true, HelpMessage = "Specify the target environment. Valid values are: PROD, QAS, DEV")]
    [ValidateSet('PROD', 'QAS', 'DEV', 'TEST')]
    [string]$Environment,

    [Parameter(Mandatory = $true, HelpMessage = "Specify if database migration should run. Valid values are: y, n")]
    [ValidateSet('y', 'n')]
    [string]$runDBMigration,

    [Parameter(Mandatory = $false, HelpMessage = "Specify the Git tag/version to deploy (e.g., v1.3.0). Required if -BumpType is NOT used.")]
    [ValidatePattern('^v\d+\.\d+\.\d+$', Options = 'IgnoreCase')]
    [string]$Version,

    [Parameter(Mandatory = $false, HelpMessage = "Specify the type of version bump to perform before deployment. If used, -Version is ignored. Valid values: major, minor, patch, rc, dev, prod")]
    [ValidateSet("major", "minor", "patch", "rc", "dev", "qas", "prod")]
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
#>

$testScenarios = @(
    @{
        TestID      = "HP-1"
        Description = "First Deploy to Env (clean)"
        ResetType   = "full" # This test requires a full reset
        Tags        = @('HappyPath', 'SmokeTest', 'NewEnvironment')
        Parameters  = @{ # Params for deploy_to_droplet.ps1
            Environment    = $TestEnvironment
            RunDBMigration = 'y'
            Version        = 'v0.1.0' 
            runBackup      = 'n' # No backup for first deploy
        }
        SetupSteps  = { # ScriptBlock for setup
            Write-Log -Message "HP-1: Ensuring server is fully clean (Reset-ServerEnvironment with ResetType='full' should have handled this)." -Level "INFO" -LogFilePath $TestRunLog
            # Reset-ServerEnvironment (called by Invoke-TestLoop) would have run.
            # No need to do anything else here, as the server should be clean.
            
        }
    }
    ValidationSteps = { # ScriptBlock for validation
        param($DeployResult) # Receives output from Invoke-DeploymentScript
        Assert-ZeroExitCode -Result $DeployResult
        Assert-LogContains -LogFile $DeployResult.LogFilePath -Pattern "Deployment to DEV.*completed successfully"
        Assert-LogDoesNotContain -LogFile $DeployResult.LogFilePath -Pattern "FATAL|ERROR" # Allow specific expected errors
        Assert-RemotePathExists -Path "$DEPLOYMENT_SERVER_BASE_DIR/flask_server/app"
        Assert-RemotePathExists -Path "$DEPLOYMENT_SERVER_BASE_DIR/satisfactory_tracker/build"
        Assert-RemoteServiceActive -ServiceName $DEPLOYMENT_FLASK_SERVICE_NAME
        Assert-RemoteDbTableExists -Database $DEPLOYMENT_DB_NAME -Table "applied_sql_scripts"
        Invoke-AutomatedSystemTests -TestEnvironment $TestEnvironment -TestRunLog $testRunLog
            
        # etc...
    }
    
    @{
        TestID      = "ERR-12"
        Description = "Fail if server backup dir unwritable"
        ResetType   = "normal" # Needs an existing environment (from normal reset) to attempt backup
        Tags        = @('Error', 'Backup')
        Parameters  = @{ 
            Environment    = $TestEnvironment
            RunDBMigration = 'n' 
            Version        = 'v0.1.0' 
        }
        SetupSteps  = {
            $targetTestBackupDir = "$DEPLOYMENT_USER_DIR/$Script:TestHarnessBackupFolder"
            Write-Log -Message "ERR-12: Making test backup directory '$targetTestBackupDir' unwritable." -Level "INFO" -LogFilePath $TestRunLog
            Invoke-SshCommand -Command "sudo chmod 000 '$targetTestBackupDir'" -ActionDescription "make backup dir unwritable" -TestRunLog $TestRunLog -IsFatal $true
        }
    }
    ValidationSteps = {
        param($DeployResult)
        Assert-NonZeroExitCode -Result $DeployResult
        Assert-LogContains -LogFile $DeployResult.LogFilePath -Pattern "FATAL.*Failed to.*backup Flask files.*via WSL" -IsError $true # Flag expected error pattern
        # Optional: Assert server state wasn't fully changed (e.g., app dir doesn't exist if backup failed early)
    }
    
    # ... more scenarios ...
)
