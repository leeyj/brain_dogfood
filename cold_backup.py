import os
import tarfile
import datetime

# 전체 프로젝트 백업 (대용량 제외)
BACKUP_ROOT = "backups"
EXCLUDE_DIRS = ["node_modules", "backups", ".git", "__pycache__", ".venv"]

def run_cold_backup():
    if not os.path.exists(BACKUP_ROOT):
        os.makedirs(BACKUP_ROOT)
        
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"cold_backup_{timestamp}.tar.gz"
    backup_path = os.path.join(BACKUP_ROOT, backup_filename)
    
    print(f"📦 전체 프로젝트 콜드 백업 시작: {backup_filename}")
    
    try:
        with tarfile.open(backup_path, "w:gz") as tar:
            # 현재 디렉토리의 모든 파일/폴더 순회
            for item in os.listdir("."):
                if item in EXCLUDE_DIRS or item == backup_filename:
                    continue
                
                print(f"   ➕ 추가 중: {item}")
                tar.add(item)
                
        print("-" * 40)
        print(f"✅ 콜드 백업 성공! 파일: {backup_path}")
        print(f"📊 크기: {os.path.getsize(backup_path) / 1024 / 1024:.2f} MB")
        print("-" * 40)
        
    except Exception as e:
        print(f"❌ 백업 중 오류 발생: {e}")

if __name__ == "__main__":
    run_cold_backup()
