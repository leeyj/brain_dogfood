# 1. Base Image
FROM python:3.10-slim

# 2. Set Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5093
ENV DEBUG=False

# 3. Set Working Directory
WORKDIR /app

# 4. Install System Dependencies (Needed for cryptography and other packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy Project Files
COPY . .

# 7. Create Necessary Directories
RUN mkdir -p data logs static/uploads

# 8. Expose Port
EXPOSE 5093

# 9. Start Application
CMD ["python", "brain.py"]
