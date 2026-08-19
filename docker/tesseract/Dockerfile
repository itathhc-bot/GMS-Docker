# ─────────────────────────────────────────────────────────────────────────────
#  docker/tesseract/Dockerfile
#  Self-hosted OCR microservice — Tesseract + Flask HTTP wrapper
#  Handles: license plate recognition from uploaded images
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS tesseract

LABEL org.opencontainers.image.title="Garage Guardian — Tesseract OCR Service"

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install Tesseract with language packs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara \
    imagemagick \
    libmagickwand-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r ocruser && useradd -r -g ocruser ocruser

WORKDIR /app

# Install Python deps
COPY docker/tesseract/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY docker/tesseract/app.py .

# OpenShift compatibility: group 0 must have write access
RUN chgrp -R 0 /app \
    && chmod -R g=u /app

# Run as non-root (OpenShift will override the UID, but requires numeric)
USER 1000

EXPOSE 5000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:5000/health || exit 1

CMD ["python3", "app.py"]
