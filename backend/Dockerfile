# Backend: Flask + SQLite
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for building/reportlab (freetype, zlib, jpeg) + build-essential
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_NO_CACHE_DIR=1

COPY requirements.txt /app/requirements.txt
# --prefer-binary će povući wheel kad postoji; inače će i dalje kompajlirati uz gore libs
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . /app

# Ensure instance folder exists u image-u (fallback; praviće se i u entrypointu)
RUN mkdir -p /app/instance

# Entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 5000
CMD ["/app/entrypoint.sh"]
