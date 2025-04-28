# Starts the virtual environment, changes directory to the React app and runs npm start
# This will run the start script in the package.json file. 
# It is set up to start both the Flask and React servers at the same time using Concurrently.
# To use run this script in the terminal:
#   .\start.ps1
# or
#    C:\repos\Tracker_Project\start.ps1

# 1. Activate virtual environment (Windows)
$venvPath = "C:\\repos\\Tracker_Project\\venv\\Scripts\\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "✅ Activating virtual environment..."
    & $venvPath
} else {
    Write-Host "❌ Could not find venv at $venvPath"
    exit 1
}

# 2. Change directory to React frontend
#Set-Location satisfactory_tracker
Push-Location "satisfactory_tracker"
try { 
    # 3. Run the React app
    Write-Host "🚀 Starting React frontend (npm start)..."
    npm start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ React frontend failed to start! Exiting..."
        exit 1
    }
} finally {
    # 4. Change back to the original directory
    Pop-Location
    Write-Host "🔙 Changed back to the original directory."
}
