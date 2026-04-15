import platform
from app import create_app

app = create_app()

if __name__ == "__main__":
    # OS 환경에 따른 설정 분기
    is_windows = platform.system() == "Windows"
    
    # Windows(개발/디버그): 5050 포트, Linux(운영): 5093 포트
    port = 5050 if is_windows else 5093
    debug_mode = True if is_windows else False
    
    print(f"📡 {'Windows' if is_windows else 'Linux'} 환경 감지 - Port: {port}, Debug: {debug_mode}")
    
    # 향후 Linux 서버 구축시 gunicorn / uwsgi 로 구동 권장
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
