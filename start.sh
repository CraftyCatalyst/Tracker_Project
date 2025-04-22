# Starts the virtual environment, changes directory to the React app and runs npm start
# This will run the start script in the package.json file. 
# It is set up to start both the Flask and React servers at the same time using Concurrently.
# To use run this script in the terminal:
# chmod +x start.sh
# ./start.sh

# 1. Activate the virtual environment
VENV_PATH="./venv/bin/activate"

if [ -f "$VENV_PATH" ]; then
    echo "✅ Activating virtual environment..."
    source "$VENV_PATH"
else
    echo "❌ Could not find virtual environment at $VENV_PATH"
    exit 1
fi

# 2. Change to React app directory
cd satisfactory_tracker || {
    echo "❌ Could not change directory to satisfactory_tracker"
    exit 1
}

# 3. Start the frontend (and backend via concurrently)
echo "🚀 Starting React frontend (npm start)..."
npm start
