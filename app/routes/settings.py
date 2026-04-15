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
    "lang": "ko"
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
        
        updated_data = {**current_data, **data}
        
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, indent=4, ensure_ascii=False)
            
        current_app.logger.info(f"System Settings Updated: {list(data.keys())}")
        return jsonify({'message': 'Settings saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
