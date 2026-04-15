import os
import functools
from flask import session, redirect, url_for, request, current_app # type: ignore

def check_auth(username, password):
    """
    환경 변수에 설정된 관리자 계정 정보와 일치하는지 확인합니다.
    """
    admin_user = os.getenv('ADMIN_USERNAME', 'admin')
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin')
    return username == admin_user and password == admin_password

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        # app/routes/auth.py의 세션 키와 일치시킴 (logged_in)
        if session.get('logged_in') is None:
            return redirect(url_for('main.login_page'))
        return view(**kwargs)
    return wrapped_view
