# 🐛 버그 수정 내역: 프론트엔드 최적화 및 초기화 안정화

- **날짜**: 2026-05-06
- **영향도**: 높음 (초기 로딩 속도 및 서버 자원 효율성)

---

## 1. 초기 데이터 중복 요청 (Ghost Fetch) 해결

### 문제 현상
- 페이지 로드 시 `IntersectionObserver`(무한 스크롤)가 실제 메모 렌더링 전 빈 화면을 감지하여 데이터를 요청하고, 동시에 `app.js`의 초기화 로직이 데이터를 요청하여 총 2회의 중복 API 호출 발생.

### 원인 분석
- `UI.initInfiniteScroll()`이 환경 설정 로드 및 첫 메모 렌더링 완료 전에 성급하게 실행됨.

### 조치 사항
- `app.js`에서 첫 번째 `refreshData()`가 완료된 후에만 무한 스크롤 옵저버가 활성화되도록 로직 순서 강제.

---

## 2. Flask 백엔드 UnboundLocalError 해결

### 문제 현상
- `brain.py` 구동 시 `UnboundLocalError: cannot access local variable 'json' where it is not associated with a value` 에러로 서버 실행 불가.

### 원인 분석
- `create_app()` 함수 내부에 `import json`을 중복 선언함으로써 파이썬의 지역 변수 스코프 충돌 발생 (함수 상단에서 사용하려 할 때 아직 로컬 임포트가 수행되지 않음).

### 조치 사항
- 함수 내부의 불필요한 `import json`을 제거하고 파일 최상단의 글로벌 임포트를 사용하도록 수정.

---

## 3. Vite 빌드 시 CSS 문법 호환성 해결

### 문제 현상
- `lightningcss` 미니파이어가 Toast UI Editor 등 일부 외부 라이브러리의 특수 주석/문법을 처리하지 못해 빌드 실패.

### 조치 사항
- `vite.config.js`에서 `cssMinify` 옵션을 `esbuild`로 변경하여 호환성 확보.
