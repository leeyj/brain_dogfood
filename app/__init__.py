import os
import json
from flask import Flask, request, abort # type: ignore
from dotenv import load_dotenv
load_dotenv()

def create_app():
    # Set folders to parent directory since app logic is now in a subfolder
    template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates'))
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static'))
    
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    app.secret_key = os.getenv('SECRET_KEY', 'dev_key')
    
    # --- 🛡️ 보안 실드 & 로깅 설정 ---
    import logging
    from logging.handlers import RotatingFileHandler
    
    log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'logs'))
    os.makedirs(log_dir, exist_ok=True)
    
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'), 
        maxBytes=10*1024*1024, # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('🚀 뇌사료 서버 기동 - 로깅 시스템 가동')

    @app.errorhandler(403)
    def forbidden(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Forbidden', 'message': 'Suspicious activity detected'}), 403
        return "Forbidden: Suspicious activity detected. Your IP has been logged.", 403

    @app.errorhandler(Exception)
    def handle_exception(e):
        # API 요청인 경우 항상 JSON 반환
        if request.path.startswith('/api/'):
            from werkzeug.exceptions import HTTPException
            if isinstance(e, HTTPException):
                return jsonify({'error': e.name, 'message': e.description}), e.code
            return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500
        # 일반 요청은 Flask 기본 처리 (또는 커스텀 HTML 에러 페이지)
        return e

    @app.before_request
    def unified_logger():
        # 클라이언트 IP (Cloudflare 등을 거칠 경우 X-Forwarded-For 확인)
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        path = request.path
        method = request.method
        params = request.query_string.decode('utf-8')
        
        # 1. 보안 실드: 메인/로그인 페이지에 파라미터가 붙은 경우 즉시 차단
        if path.rstrip('/') in ['', '/login'] and params:
            log_msg = f"[SHIELD] Blocked: [{ip}] {method} {path}?{params}"
            app.logger.warning(log_msg)
            abort(403)
            
        # 2. 트래픽 로깅 (정적 파일 제외)
        if not path.startswith('/static/'):
            log_msg = f"ACCESS: [{ip}] {method} {path}"
            if params:
                log_msg += f"?{params}"
            app.logger.info(log_msg)

    upload_folder = os.path.abspath(os.path.join(static_dir, 'uploads'))
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder
    
    # Load config.json
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config.json'))
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            app.config['UPLOAD_SECURITY'] = cfg.get('upload_security', {})
    else:
        app.config['UPLOAD_SECURITY'] = {'allowed_extensions': [], 'blocked_extensions': []}
    
    # Initialize DB schema
    from .database import init_db
    init_db()
    
    # Session and Security configurations
    # config.json에서 타임아웃 로드 (기본 60분, 최소 10분 강제)
    session_timeout = cfg.get('session_timeout', 60)
    if not isinstance(session_timeout, int) or session_timeout < 10:
        session_timeout = 10

    from datetime import timedelta
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true',
        PERMANENT_SESSION_LIFETIME=timedelta(minutes=session_timeout)
    )
    
    @app.after_request
    def add_security_headers(response):
        """보안 강화를 위한 HTTP 헤더 추가"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        # Content Security Policy (Toast UI 및 외부 CDN 허용)
        # 운영 환경에 맞춰 점진적으로 강화 가능
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://uicdn.toast.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://static.cloudflareinsights.com https://d3js.org; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://uicdn.toast.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cloudflareinsights.com https://d3js.org;"
        )
        response.headers['Content-Security-Policy'] = csp
        return response

    # Register modular blueprints
    from .routes import register_blueprints
    register_blueprints(app)
    
    return app
