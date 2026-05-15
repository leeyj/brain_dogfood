# Bugfix Report: 20260515_bugfix_docker_import_error

## 버그 내역
- **현상**: Docker 환경에서 서버 구동 시 `ModuleNotFoundError: No module named 'app.routes.backup'` 에러 발생하며 기동 실패.
- **원인**: 운영 환경용 소스를 생성하는 `tools/sync_stable.py` 스크립트의 제외 목록(`EXCLUDE_FILES`)에 `backup.py`가 포함되어 있어, 필수 라우트 파일인 `app/routes/backup.py`가 배포 대상에서 누락됨.

## 영향도
- **영향 범위**: Docker 사용자 및 `stable` 버전을 사용하는 모든 환경.
- **심각도**: 높음 (서버 기동 불가).

## 수정 사항
- **수정 파일**: [sync_stable.py](file:///c:/project/my_util/memo_server/tools/sync_stable.py)
- **내용**: `EXCLUDE_FILES` 목록에서 `backup.py` 제거.

## 해결 사항
- `sync_stable.py` 수정 후 동기화 재실행하여 `brain_dogfood_stable/app/routes/backup.py` 파일이 포함됨을 확인.
- 임포트 테스트를 통해 정상적으로 모듈을 불러올 수 있음을 검증함.

## 후속 조치
- Docker 사용자는 이미지 재빌드(`docker-compose up --build`) 또는 최신 소스 반영 필요.
