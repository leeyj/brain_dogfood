import os
import json
from flask import Blueprint, request, jsonify, current_app # type: ignore
from ..auth import login_required

settings_bp = Blueprint('settings', __name__)

CONFIG_PATH = os.path.join(os.getcwd(), 'config.json')

# 기본 테마 및 시스템 설정
DEFAULT_SETTINGS = {
    "bg_color": "#0f172a",
    "sidebar_color": "rgba(30, 41, 59, 0.7)",
    "card_color": "rgba(30, 41, 59, 0.85)",
    "encrypted_border": "#00f3ff",
    "ai_accent": "#8b5cf6",
    "enable_ai": True,
    "lang": "ko",
    "enable_categories": False,
    "categories": [],
    "pinned_categories": [],
    "session_timeout": 60,      # 기본 60분
    "external_api_token": "",    # 외부 앱 연동 토큰
    "obsidian_export_enabled": False
}

@settings_bp.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    if not os.path.exists(CONFIG_PATH):
        return jsonify(DEFAULT_SETTINGS)
    
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # 기본값과 병합하여 신규 필드 등 누락 방지
            full_data = {**DEFAULT_SETTINGS, **data}
            # 최소 10분 강제 적용
            if full_data.get('session_timeout', 0) < 10:
                full_data['session_timeout'] = 10
            return jsonify(full_data)
    except Exception as e:
        return jsonify(DEFAULT_SETTINGS)

@settings_bp.route('/api/settings', methods=['POST'])
@login_required
def save_settings():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # 기존 데이터 로드 후 병합
        current_data = {}
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                current_data = json.load(f)
        
        # 세션 타임아웃 검증 및 보정
        session_timeout = data.get('session_timeout')
        if session_timeout is not None:
            try:
                session_timeout = int(session_timeout)
                if session_timeout < 10:
                    session_timeout = 10
                data['session_timeout'] = session_timeout
            except (ValueError, TypeError):
                data.pop('session_timeout', None)

        updated_data = {**current_data, **data}
        
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, indent=4, ensure_ascii=False)
            
        # Flask 설정 즉시 반영
        if 'session_timeout' in updated_data:
            from datetime import timedelta
            current_app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=updated_data['session_timeout'])
            
        current_app.logger.info(f"System Settings Updated: {list(data.keys())} (Session Timeout: {updated_data.get('session_timeout')} min)")
        return jsonify({'message': 'Settings saved successfully', 'session_timeout': updated_data.get('session_timeout')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/api/plugins', methods=['GET'])
@login_required
def list_plugins():
    """설치된 플러그인 목록 반환 (static/js/plugins 디렉토리 스캔)"""
    plugins_dir = os.path.join(current_app.static_folder, 'js', 'plugins')
    if not os.path.exists(plugins_dir):
        return jsonify([])
    
    plugins = []
    try:
        for d in os.listdir(plugins_dir):
            if os.path.isdir(os.path.join(plugins_dir, d)):
                # index.js가 있는 폴더만 유효한 플러그인으로 간주
                if os.path.exists(os.path.join(plugins_dir, d, 'index.js')):
                    plugins.append(d)
        return jsonify(plugins)
    except Exception as e:
        return jsonify([])
