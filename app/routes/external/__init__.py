from flask import Blueprint

external_bp = Blueprint('external', __name__)

# 서브 라우트들에서 이 blueprint를 사용하여 라우트를 등록할 수 있도록 
# __init__ 파일에서 임포트하여 활성화합니다.
from . import memo_routes, file_routes, meta_routes
