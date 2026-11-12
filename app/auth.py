import os
import hmac
import json
import functools
from flask import session, redirect, url_for, request, current_app, jsonify # type: ignore

def check_auth(username, password):
    """
    환경 변수에 설정된 관리자 계정 정보와 일치하는지 확인합니다.
    ADMIN_USERNAME 또는 ADMIN_USER 중 하나를 사용합니다.
    """
    admin_user = os.getenv('ADMIN_USERNAME') or os.getenv('ADMIN_USER') or 'admin'
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin')
    return username == admin_user and password == admin_password

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        # app/routes/auth.py의 세션 키와 일치시킴 (logged_in)
        if session.get('logged_in') is None:
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized', 'message': 'Session expired or not logged in'}), 401
            return redirect(url_for('main.login_page'))
        return view(**kwargs)
    return wrapped_view

def has_bearer_header():
    auth_header = request.headers.get('Authorization') or ''
    return auth_header.startswith('Bearer ')


def has_valid_api_token():
    """Authorization: Bearer <token> 이 config.json의 external_api_token과 일치하는지 확인.
    토큰이 비어 있으면(미설정) 항상 False. 타이밍 공격 방지를 위해 상수 시간 비교."""
    if not has_bearer_header():
        return False
    token = request.headers.get('Authorization', '')[len('Bearer '):].strip()
    if not token:
        return False

    config_path = os.path.join(os.getcwd(), 'config.json')
    if not os.path.exists(config_path):
        return False
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            valid_token = json.load(f).get('external_api_token')
    except Exception:
        return False
    return bool(valid_token) and hmac.compare_digest(token.encode(), str(valid_token).encode())


def api_key_required(view):
    """외부 앱 연동을 위한 API Key (Bearer Token) 인증 데코레이터"""
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if not has_bearer_header():
            return jsonify({'error': 'Unauthorized', 'message': 'API Key required'}), 401
        if has_valid_api_token():
            return view(**kwargs)
        return jsonify({'error': 'Forbidden', 'message': 'Invalid or missing API Key'}), 403
    return wrapped_view
