import platform
import os
import sys

from app import create_app

app = create_app()

if __name__ == "__main__":
    # 1. OS 환경에 따른 기본값 설정
    is_windows = platform.system() == "Windows"
    default_port = 5050 if is_windows else 5093
    default_debug = True if is_windows else False
    
    # 2. 환경 변수 우선 적용 (PORT)
    try:
        env_port = os.getenv("PORT")
        port = int(env_port) if env_port else default_port
    except (ValueError, TypeError):
        port = default_port
        
    # 3. 환경 변수 우선 적용 (DEBUG)
    env_debug = os.getenv("DEBUG")
    if env_debug is not None:
        debug_mode = env_debug.lower() == "true"
    else:
        debug_mode = default_debug
    
    print(f"📡 {'Windows' if is_windows else 'Linux'} 환경 감지")
    print(f"⚙️  설정 적용 - Port: {port}, Debug: {debug_mode}")
    
    # 향후 Linux 서버 구축시 gunicorn / uwsgi 로 구동 권장
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
