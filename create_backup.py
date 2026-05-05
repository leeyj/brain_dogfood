import os
import zipfile
from datetime import datetime

def backup_project():
    project_dir = r"c:\project\my_util\memo_server"
    backup_filename = f"cold_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    backup_path = os.path.join(project_dir, backup_filename)
    
    exclude_dirs = {'.venv', '.git', '__pycache__', 'node_modules', 'obsidian-brainsryo-plugin'}
    
    print(f"Creating backup at {backup_path}...")
    with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file.endswith('.zip') and file.startswith('cold_backup_'):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, project_dir)
                zipf.write(file_path, arcname)
                
    print("Backup completed.")

if __name__ == "__main__":
    backup_project()
