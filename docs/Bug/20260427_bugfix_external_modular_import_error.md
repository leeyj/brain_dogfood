# 20260427_bugfix_external_modular_import_error.md

## 1. 버그 내역
- 외부 연동 API를 `app/routes/external/` 패키지로 모듈화하는 과정에서, 서브 모듈(`memo_routes.py`, `file_routes.py`, `meta_routes.py`)들이 `api_key_required` 데코레이터를 가져올 때 잘못된 상대 경로(`..auth`)를 사용하여 `ImportError`가 발생함.
- 서버 기동 시 `cannot import name 'api_key_required' from 'app.routes.auth'` 에러와 함께 프로세스가 종료됨.

## 2. 영향도
- **심각도**: 높음
- **영향**: 외부 API(Obsidian, Bot 등) 전체 기능 마비 및 서버 재시작 불가.

## 3. 수정 사항
- **[app/routes/external/memo_routes.py]**: 임포트 구문을 `from ...auth import api_key_required`로 수정.
- **[app/routes/external/file_routes.py]**: 임포트 구문을 `from ...auth import api_key_required` 및 `from ...security import encrypt_file`로 수정.
- **[app/routes/external/meta_routes.py]**: 임포트 구문을 `from ...auth import api_key_required`로 수정.
- **[app/auth.py]**: 사용자 보안 피드백을 반영하여 API Key가 설정되지 않았거나 일치하지 않을 경우 엄격하게 접근을 차단하도록 로직 강화.

## 4. 해결 사항
- 모듈 위계에 맞는 올바른 상대 경로 참조를 통해 `ImportError`를 해결하고 서버가 정상적으로 기동됨을 확인.
- 외부 API 호출 시 `Authorization: Bearer <TOKEN>` 헤더 검증이 모든 모듈에서 정상 작동함을 보장함.
