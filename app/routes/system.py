import os
import json
import subprocess
import urllib.request
from flask import Blueprint, jsonify, request # type: ignore
from ..auth import login_required

system_bp = Blueprint('system', __name__)

VERSION_FILE = os.path.join(os.getcwd(), 'version.json')
REMOTE_VERSION_URL = "https://raw.githubusercontent.com/leeyj/brain_dogfood/main/version.json"

def get_local_version():
    if not os.path.exists(VERSION_FILE):
        return {"version": "0.0.0", "history": []}
    try:
        with open(VERSION_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"version": "0.0.0", "history": []}

@system_bp.route('/api/system/version', methods=['GET'])
@login_required
def get_version():
    """현재 로컬 버전 정보를 반환합니다."""
    return jsonify(get_local_version())

@system_bp.route('/api/system/check-update', methods=['GET'])
@login_required
def check_update():
    """GitHub에서 최신 버전을 확인하고 비교 결과를 반환합니다."""
    local_info = get_local_version()
    
    try:
        # GitHub에서 최신 version.json 가져오기
        with urllib.request.urlopen(REMOTE_VERSION_URL, timeout=5) as response:
            remote_info = json.loads(response.read().decode('utf-8'))
            
        local_v = local_info.get('version', '0.0.0')
        remote_v = remote_info.get('version', '0.0.0')
        
        # 단순 문자열 비교 (더 정교한 비교가 필요할 경우 패키지 활용 가능)
        has_update = remote_v > local_v
        
        return jsonify({
            "has_update": has_update,
            "local_version": local_v,
            "remote_version": remote_v,
            "remote_history": remote_info.get('history', []),
            "release_date": remote_info.get('release_date', '')
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to check remote version",
            "message": str(e)
        }), 500

@system_bp.route('/api/system/update', methods=['POST'])
@login_required
def execute_update():
    """git pull을 통해 시스템을 업데이트합니다."""
    try:
        # 1. git pull 실행
        # CWD를 프로젝트 루트로 보장
        process = subprocess.Popen(
            ['git', 'pull', 'origin', 'main'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.getcwd()
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return jsonify({
                "success": false,
                "error": "Git pull failed",
                "message": stderr
            }), 500
            
        return jsonify({
            "success": True,
            "message": "Update pulled successfully. Please restart the server to apply changes.",
            "output": stdout
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Execution error",
            "message": str(e)
        }), 500
