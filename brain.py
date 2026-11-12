import platform
import os

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

    if debug_mode:
        # 개발: Werkzeug (자동 리로드·디버거)
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        # 운영: waitress (멀티스레드 프로덕션 WSGI 서버, 순수 Python이라 Windows/Linux 공통)
        try:
            from waitress import serve
        except ImportError:
            print("⚠️  waitress 미설치 → Werkzeug 개발 서버로 대체 구동합니다. (pip install waitress 권장)")
            app.run(host="0.0.0.0", port=port, debug=False)
        else:
            threads = int(os.getenv("WAITRESS_THREADS", "8"))
            print(f"🚀 waitress 구동 (threads={threads})")
            serve(app, host="0.0.0.0", port=port, threads=threads)
