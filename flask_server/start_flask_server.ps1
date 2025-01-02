Set-Location C:\repos\Tracker_Project\flask_server
.\venv\Scripts\activate

# Run the server and log output to a file
cmd.exe /c "python run.py >> flask_server.log 2>&1"

# Give the server a few seconds to start
Start-Sleep -Seconds 5

# Check if the server started successfully
if ($LASTEXITCODE -ne 0) {
    Write-Host "Server failed to start. Check flask_server.log for details."
    Add-Content -Path flask_server.log -Value "`nServer failed to start. Check flask_server.log for details."
    exit 1
} else {
    Write-Host "Server started successfully. Access it at http://0.0.0.0:5000"
    Add-Content -Path flask_server.log -Value "`nServer started successfully. Access it at http://0.0.0.0:5000"
}