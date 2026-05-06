# === 1단계: 프론트엔드 빌드 스테이지 (Node.js) ===
FROM node:20-slim AS build-stage
WORKDIR /build

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 빌드 실행 (static 폴더 내 자산 필요)
COPY static/ ./static/
COPY vite.config.js .
RUN npm run build

# === 2단계: 최종 실행 스테이지 (Python) ===
FROM python:3.10-slim
WORKDIR /app

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5093
ENV DEBUG=False

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 파이썬 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사 (정적 파일 제외)
COPY . .

# 1단계에서 빌드된 최적화 파일(dist)만 가져오기
COPY --from=build-stage /build/static/dist ./static/dist

# 필수 디렉토리 생성
RUN mkdir -p data logs static/uploads

EXPOSE 5093
CMD ["python", "brain.py"]
