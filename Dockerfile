# 프론트엔드 빌드 단계 없음 (바닐라 ES 모듈 + app/assets.py의 런타임 버전/프리로드)
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

# 소스 코드 복사
COPY . .

# 필수 디렉토리 생성
RUN mkdir -p data logs static/uploads

EXPOSE 5093
CMD ["python", "brain.py"]
