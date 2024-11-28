@echo off
setlocal

if "%1" == "create" (
    python -m venv venv
    call .\venv\Scripts\activate
    pip install -r requirements.txt
) else if "%1" == "delete" (
    call .\venv\Scripts\deactivate
    rmdir /s /q venv
) else if "%1" == "start" (
    call .\venv\Scripts\activate
) else if "%1" == "stop" (
    call .\venv\Scripts\deactivate
) else if "%1" == "build" (
    npm run build
) else if "%1" == "server" (
    npm start
) else (
    echo "Usage: do [create|delete|start|stop|build|server]"
)

endlocal