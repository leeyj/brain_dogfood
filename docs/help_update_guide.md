# 🧠 도움말 시스템 업데이트 가이드 (Maintenance Guide)

이 문서는 프로젝트 내 도움말 시스템을 유지보수하고 업데이트하는 절차를 설명합니다. 새로운 기능이 추가되거나 기존 설명이 변경될 때 이 절차를 따라주세요.

## 1. 개요
시스템의 도움말은 워드 문서(`도움말_원본.xml`)를 기반으로 추출되어, 현대적인 HTML/CSS 구조로 재구성됩니다. 현재 시스템은 **글래스모피즘(Glassmorphism)** 디자인과 **탭 시스템**을 사용합니다.

## 2. 작업 절차 (Extraction & Update)

### Step 1: 원본 문서 업데이트
- `docs/도움말_원본.xml` (또는 `.docx`) 파일을 수정하여 새로운 내용과 이미지를 추가합니다.

### Step 2: 자산 추출 (Text & Images)
- 프로젝트 루트에서 `scratch/extract_help.py` 스크립트를 실행합니다.
- **결과물**:
  - `static/img/help/`: 워드 문서에서 추출된 이미지가 `image1.png`, `image2.png` 순으로 저장됩니다.
  - 콘솔 출력: 추출된 텍스트와 이미지 매핑 정보가 출력됩니다.

### Step 3: HTML 반영 (`static/html/help/`)
- `guide_ko.html` 및 `guide_en.html` 파일을 수정합니다.
- **디자인 원칙**:
  - `.help-premium-container` 클래스를 최상위로 사용합니다.
  - 섹션별로 `.help-section`과 `.help-card` 구조를 유지하여 시각적 일관성을 확보합니다.
  - 이미지는 `/static/img/help/imageX.png` 경로를 사용합니다.

### Step 4: 다국어 및 제목 설정
- 새로운 탭이 추가되거나 제목이 변경될 경우 다음 파일을 업데이트합니다.
  - `static/locales/ko.json` (`title_guide`, `title_shortcuts` 등)
  - `static/locales/en.json`

### Step 5: 캐시 방지 (Cache Busting)
- 수정한 내용이 즉시 반영되도록 다음 파일들에서 버전 번호(`?v=3.0` 등)를 상향 조정합니다.
  - `static/js/components/modals/help/GuideContent.js`
  - `static/js/components/modals/help/ShortcutContent.js`
  - `static/js/components/modals/help/TipsContent.js`

## 3. 주요 구성 요소 (Architecture)

### 3.1 레이아웃 구조
- **Sticky Footer**: 하단 탭 바가 항상 고정되도록 `modals.css`에서 `#shortcutModal .modal-content`에 `flex` 레이아웃이 적용되어 있습니다.
- **Scroll Area**: 본문 영역(`#helpContentArea`)만 개별적으로 스크롤됩니다.

### 3.2 스타일 가이드
- 포인트 컬러: `var(--accent)` (Sky Blue)
- 배경: `var(--card)` 또는 `rgba(30, 41, 59, 0.95)`
- 애니메이션: `fadeInUp` 키프레임을 사용하여 섹션이 부드럽게 나타나도록 합니다.

## 4. 주의 사항
- **중첩 스크롤 금지**: HTML 파일 내부에 `overflow-y: auto`나 고정 `height`를 직접 지정하지 마세요. 하단 탭 바가 화면 밖으로 밀려날 수 있습니다.
- **이미지 순서**: `extract_help.py`는 문서에 삽입된 순서대로 이미지를 추출하므로, HTML 작성 시 순서가 꼬이지 않도록 주의하세요.

---
*Last Updated: 2026-04-23*
