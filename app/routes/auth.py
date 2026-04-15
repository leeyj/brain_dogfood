from flask import Blueprint, request, jsonify, session, redirect, url_for # type: ignore
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
        return jsonify({'message': 'Logged in successfully'})
    return jsonify({'error': _t('msg_auth_failed')}), 401

@auth_bp.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('main.login_page'))
