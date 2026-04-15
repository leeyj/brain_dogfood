[한국어](#한국어) | [English](#english)

<br/>

<div align="center">
  <img src="docs/img/main.png" alt="Brain Dogfood Dashboard" width="100%">
  <h1>🧠 뇌사료 (Brain Dogfood)</h1>
  <p><b>지식을 기록하는 습관을 넘어, 지능형 유기체로 성장하는 나만의 지식 창고</b></p>
  <p>Minimalist, AI-powered, Privacy-first Knowledge Server</p>
</div>

---

> [!IMPORTANT]
> **보안 주의사항 (Security Notice)**
> - 기본 관리자 계정은 아이디: `admin` / 비밀번호: `.env` 파일에서 본인이 설정한 값입니다.
> - 최초 로그인 후, 혹은 서버 실행 전 **`.env` 파일에서 `ADMIN_USERNAME`과 `ADMIN_PASSWORD`를 반드시 본인만의 정보로 수정**하세요. 수정하지 않을 경우 보안에 매우 취약해질 수 있습니다.

> [!NOTE]
> **AI 기능은 선택 사항입니다 (AI is Optional)**
> - **Gemini API 키가 없어도** 뇌사료의 핵심 기능(기본 메모, 히트맵, 지식 그래프 Nebula, 개별 암호화 등)은 **모두 정상 작동**합니다.
> - AI 기능(`GEMINI_API_KEY`)은 자동 요약과 인공지능 태깅 기능을 사용할 때만 필요합니다.

---

<h2 id="한국어">📄 프로젝트 소개</h2>

**뇌사료(Brain Dogfood)**는 "내가 만든 지식은 내가 먼저 소비한다"는 철학에서 시작된 개인용 메모 서버입니다. 단순한 텍스트 기록을 넘어, AI가 당신의 지식을 분석하고 유기적인 그래프(Nebula)로 연결하여 새로운 통찰을 제공합니다.

### ✨ 독보적인 강점

*   **Intelligent Nebula**: 단순히 태그로 묶는 것이 아닙니다. D3.js 기반의 그래프 시각화를 통해 지식 간의 관계를 시각적으로 탐험하세요.
*   **AI Insight Hub (Optional)**: Gemini 2.0 Flash가 모든 메모를 실시간으로 요약하고 최적의 태그를 제안합니다. 당신은 기록에만 집중하세요.
*   **Privacy-First Security**: 메모별로 개별 암호화를 지원합니다. 서버 관리자조차도 당신의 비밀번호 없이는 지식을 엿볼 수 없습니다.
*   **High-End UX**: 글래스모피즘 기반의 모던한 UI와 하이엔드 셰이더 효과, 그리고 빠른 생산성을 위한 풍부한 단축키 시스템을 제공합니다.

---

## 🆚 memos vs 뇌사료 (Comparison)

| 기능 | **memos (Open Source)** | **🧠 뇌사료 (Brain Dogfood)** |
| :--- | :--- | :--- |
| **기본 철학** | 타임라인 기반 마이크로 블로깅 | 유기적인 지식 연결 및 AI 통찰 |
| **시각화** | 단순 달력/히트맵 | **D3.js Knowledge Nebula (그래프)** |
| **AI 통합** | 외부 플러그인 의존 | **Gemini 2.0 Native 통합 (자동 요약/태그 / 선택 사항)** |
| **보안** | DB 전체 보안 | **메모별 개별 암호화 (Grain-level Security)** |
| **사용성** | 모바일 앱 위주 | **데스크탑 생산성 최적화 (Slash Commands & Shortcuts)** |
| **디자인** | 미니멀, 정적인 UI | **Modern Glassmorphism & 다이내믹 애니메이션** |

---

## ⌨️ 생산성 단축키

| 동작 | 단축키 | 설명 |
| :--- | :--- | :--- |
| **저장/수정** | `Ctrl + Enter` | 작성한 메모를 즉시 서버에 반영 |
| **새 메모** | `Ctrl + Shift + N` | 언제 어디서든 즉시 작성창 호출 |
| **슬래시 명령** | `/` | `/task`, `/ai`, `/h2` 등으로 빠른 서식 지정 |
| **지식 탐색기** | `Ctrl + Shift + E` | 저장된 지식의 구조를 한눈에 파악 |
| **즉시 수정** | `Alt + Click` | 메인 그리드에서 즉시 편집 모드 진입 |

---

## 🛠️ 시작하기

```bash
# 1. 저장소 복제 및 종속성 설치
pip install -r requirements.txt

# 2. .env.example을 .env로 복사 후 설정 수정 (필수)
cp .env.example .env

# 3. 서버 실행
python brain.py
```

*`.env` 파일에서 관리자 아이디와 비밀번호를 꼭 수정하고, 필요한 경우에만 `GEMINI_API_KEY`를 등록하세요.*

---

<h2 id="english">🌐 English Description</h2>

### What is Brain Dogfood?
**Brain Dogfood** is a minimalist yet powerful personal knowledge server built for those who value privacy and deep insights. It’s not just a memo app; it’s an **intelligent knowledge ecosystem** that grows with you.

> [!IMPORTANT]
> **Security Notice**: 
> Default credentials are set in the `.env` file. **You MUST change `ADMIN_USERNAME` and `ADMIN_PASSWORD`** in your `.env` file before running the server in a public environment.

> [!NOTE]
> **AI is Optional**: 
> All core features (Memos, Heatmap, Knowledge Nebula, Encryption) work perfectly **without an AI API key**. The `GEMINI_API_KEY` is only required for automated summarization and AI tagging.

### Key Features
- **AI-Driven Insights**: Powered by Gemini 2.0 Flash for instant summarization and smart tagging (Optional).
- **Knowledge Nebula**: Explore your thoughts through a dynamic D3.js-based interactive knowledge graph.
- **Advanced Security**: Grain-level encryption for individual memos – your data is for your eyes only.
- **Premium Aesthetics**: Sleek glassmorphism UI with smooth micro-animations and production-ready UX.

### Quick Start
1. Install dependencies: `pip install -r requirements.txt`
2. Create your `.env` from `.env.example` and update your master credentials.
3. Launch the server: `python brain.py` (Default port: 5050 on Windows, 5093 on Linux).

---
<div align="center">
  <p>Developed with ❤️ for knowledge lovers.</p>
</div>
