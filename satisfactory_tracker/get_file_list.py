import os

def list_files(startpath, output_file):
    with open(output_file, 'w') as f:
        for root, dirs, files in os.walk(startpath):
            # ignore node_modules and venv directories
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if 'venv' in dirs:
                dirs.remove('venv')
            level = root.replace(startpath, '').count(os.sep)
            indent = ' ' * 4 * (level)
            f.write(f'{indent}{os.path.basename(root)}/\n')
            subindent = ' ' * 4 * (level + 1)
            for file in files:
                f.write(f'{subindent}{file}\n')

# Example usage
startpath = os.path.join(os.getcwd())
output_file = 'file_list.txt'
list_files(startpath, output_file)