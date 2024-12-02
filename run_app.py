import subprocess
import os
import sys

def activate_virtualenv():
    # Path to your virtual environment activation script
    venv_path = os.path.join(os.getcwd(), 'venv', 'Scripts', 'activate')
    activate_command = f'{venv_path} && '
    return activate_command

def run_command(command):
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"Error: {stderr.decode('utf-8')}")
    else:
        print(stdout.decode('utf-8'))

if __name__ == "__main__":
    # Activate the virtual environment 
    activate_command = activate_virtualenv()
    
    # Change to the react_stuff directory
    react_path = os.path.join(os.getcwd(), 'satisfactory_tracker', 'react_stuff')
    os.chdir(react_path)
         
    # Run npm run build
    print("Running npm run build...")
    run_command(activate_command + 'npm run build')
    
    # Run npm start
    print("Running npm start...")
    run_command(activate_command + 'npm start')