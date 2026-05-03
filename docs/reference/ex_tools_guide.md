# 🛠️ 외부 배포용 도구 모음 (ex_tools) 가이드

`ex_tools` 폴더는 뇌사료(Brain Dogfood) 프로젝트를 배포받아 사용하는 엔드 유저(사용자)분들이, 서버 환경에 의존하지 않고 로컬 PC에서 데이터 주권을 완벽하게 통제할 수 있도록 제공되는 **독립형 스크립트 모음**입니다.

---

## 1. 오프라인 복호화 및 추출 도구 (`offline_exporter.py`)

웹 서버가 오프라인이거나 완전히 파괴된 극단적인 상황에서도, 전체 백업 파일에 들어있는 데이터베이스(`memos.db`)만 있으면, 암호화된 비밀 메모들을 포함한 모든 지식을 마크다운(`.md`) 평문 파일로 안전하게 구출해 내는 강력한 재난 복구(DR) 도구입니다.

### 📋 사전 준비 사항 (Requirements)

이 도구는 뇌사료 웹 서버(Flask 등)의 복잡한 환경 설정을 필요로 하지 않습니다. 단, 강력한 AES-256 암호 해독을 수행하기 위해 Python 표준 라이브러리와 아래의 암호화 모듈이 로컬 PC에 설치되어 있어야 합니다.

```bash
# 필수 라이브러리 설치
pip install cryptography python-dotenv
```

### 🚀 사용 방법

터미널(명령 프롬프트)을 열고 스크립트를 실행합니다.

```bash
cd ex_tools
python offline_exporter.py
```

스크립트가 켜지면 친절한 대화형(Interactive) 프롬프트가 안내를 시작합니다.

1. **DB 경로 입력**: 백업받은 `memos.db` 파일의 물리적 경로를 입력합니다. (그냥 엔터 입력 시 `../data/memos.db`를 자동으로 찾습니다)
2. **보안 시드(ENCRYPTION_SEED) 확인**: 암호화 키 파생에 사용된 시스템 시드 값을 찾습니다. 동일한 폴더에 `.env` 파일이 복사되어 있다면 스크립트가 자동으로 읽어들이며, 없다면 콘솔에서 사용자가 직접 입력할 수 있습니다.
3. **추출 폴더 지정**: 마크다운 파일들이 생성될 폴더 경로를 지정합니다. (기본값: `./export/`)

---

### 🔐 지능형 암호 해독 프로세스 (Smart Caching)

일반 평문 메모는 묻지도 따지지도 않고 즉시 마크다운으로 변환됩니다. 하지만 스캔 중 **암호화된 메모**를 발견하면 스크립트는 다음과 같이 스마트하게 대응합니다.

- **비밀번호 프롬프트**: 터미널에서 즉시 해당 메모의 제목을 띄워주고 `-> 🔑 복호화 비밀번호 입력:` 프롬프트를 노출합니다.
- **캐싱(Caching)을 통한 프리패스**: 사용자가 한 번 비밀번호를 입력하여 복호화에 성공하면, 스크립트는 그 비밀번호를 메모리에 일시적으로 쥐고 있습니다. 이후 다른 암호화된 메모를 만났을 때, 기억해둔 비밀번호들로 먼저 자물쇠를 따봅니다. 성공하면 굳이 사용자에게 귀찮게 다시 묻지 않고 0.1초 만에 **자동으로 복호화**하고 넘깁니다!
- **스킵(Skip) 기능**: 끝까지 비밀번호가 기억나지 않는 메모가 나타나면, 입력창에서 그냥 **[Enter] 키**를 치세요. 해당 메모만 깔끔하게 건너뛰고 다음 데이터를 계속해서 복구합니다.

---

### 📦 추출 결과물 형식 (Frontmatter 지원)

추출된 모든 지식은 개별 `.md` 파일로 폴더에 쏟아집니다.
특히 옵시디언(Obsidian) 등 외부 지식 관리 앱으로 폴더를 통째로 들이부었을 때 100% 호환되도록, 파일 최상단에 **YAML Frontmatter** 구조를 사용하여 데이터의 메타정보(태그, 날짜 등)를 아름답게 보존합니다.

```yaml
---
uuid: 550e8400-e29b-41d4-a716-446655440000
title: 월간 업무 보고서
category: 업무
group: work
date: 2024-04-27 10:00:00
tags: [중요, 회의록, 보안]
---

(여기에 암호가 해제된 깨끗한 본문 내용이 기록됩니다.)
```

<br><br>

---

# 🛠️ External Tools Collection (`ex_tools`) Guide

The `ex_tools` folder is a collection of **standalone scripts** provided for end-users of the Brain Dogfood project. It allows you to exercise complete data sovereignty over your knowledge base directly from your local PC, completely independent of the server environment.

---

## 1. Offline Decryption & Extraction Tool (`offline_exporter.py`)

Even in extreme situations where the web server is offline or completely destroyed, this powerful Disaster Recovery (DR) tool can safely extract all your knowledge—including AES-encrypted secret memos—into plain text Markdown (`.md`) files, provided you have the database backup file (`memos.db`).

### 📋 Requirements

This tool does not require the complex environment setup of the Brain Dogfood web server (like Flask). However, to perform strong AES-256 decryption, you must have Python and the following cryptography module installed on your local PC.

```bash
# Install required libraries
pip install cryptography python-dotenv
```

### 🚀 Usage

Open your terminal (or Command Prompt) and run the script.

```bash
cd ex_tools
python offline_exporter.py
```

Once the script starts, a friendly interactive prompt will guide you.

1. **DB Path**: Enter the physical path to your backed-up `memos.db` file. (Press Enter to automatically look for `../data/memos.db`)
2. **Encryption Seed**: The script needs the system seed value used to derive your encryption keys. If the `.env` file is copied in the same folder, the script will read it automatically. Otherwise, you can type it manually in the console.
3. **Export Directory**: Specify the folder path where the generated Markdown files will be saved. (Default: `./export/`)

---

### 🔐 Smart Caching Decryption Process

Regular plaintext memos are instantly converted to Markdown. However, when the script encounters an **encrypted memo** during the scan, it responds smartly:

- **Password Prompt**: It instantly displays the title of the memo in the terminal and asks for the decryption password.
- **Free Pass via Caching**: Once you successfully enter a password to decrypt a memo, the script temporarily holds that password in memory. When it encounters another encrypted memo later, it first tries to unlock it using the remembered passwords. If successful, it automatically decrypts the memo in 0.1 seconds **without bothering you to ask again!**
- **Skip Function**: If you encounter a memo and absolutely cannot remember the password, simply press the **[Enter] key** at the prompt. The script will cleanly skip that specific memo and continue recovering the rest of your data.

---

### 📦 Export Format (Frontmatter Support)

All extracted knowledge will pour into the designated folder as individual `.md` files.
To ensure 100% compatibility when importing the folder into external knowledge management apps like Obsidian, the script beautifully preserves the data's metadata (tags, dates, etc.) using a **YAML Frontmatter** structure at the very top of each file.

```yaml
---
uuid: 550e8400-e29b-41d4-a716-446655440000
title: Monthly Work Report
category: Work
group: work
date: 2024-04-27 10:00:00
tags: [Important, Minutes, Security]
---

(The cleanly decrypted body content is written here in plaintext.)
```
