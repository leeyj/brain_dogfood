from flask import Blueprint, render_template, redirect, url_for, session, current_app # type: ignore
from ..auth import login_required
import os
import json

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def index():
    return render_template('index.html')

@main_bp.route('/login', methods=['GET'])
def login_page():
    if 'logged_in' in session:
        return redirect(url_for('main.index'))
    
    # i18n 지원을 위해 기본 언어 전달
    config_path = os.path.join(os.getcwd(), 'config.json')
    lang = 'ko'
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                lang = json.load(f).get('lang', 'ko')
        except: pass
    
    return render_template('login.html', lang=lang)
