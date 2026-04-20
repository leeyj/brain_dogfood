from flask import Blueprint, request, jsonify, session, redirect, url_for, current_app # type: ignore
from ..auth import check_auth
from ..utils.i18n import _t

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if check_auth(username, password):
        session.permanent = True # Enable permanent session to use LIFETIME config
        session['logged_in'] = True
        current_app.logger.info(f"AUTH: Success login for user '{username}' from {request.remote_addr}")
        return jsonify({'message': 'Logged in successfully'})
    
    current_app.logger.warning(f"AUTH: Failed login attempt for user '{username}' from {request.remote_addr}")
    return jsonify({'error': _t('msg_auth_failed')}), 401

@auth_bp.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('main.login_page'))

@auth_bp.route('/api/auth/status')
def auth_status():
    """프론트엔드 세션 체크(Heartbeat)용 엔드포인트"""
    if session.get('logged_in'):
        return jsonify({'status': 'ok', 'logged_in': True})
    return jsonify({'error': 'Unauthorized', 'logged_in': False}), 401
