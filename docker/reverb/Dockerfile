# ─────────────────────────────────────────────────────────────────────────────
#  docker/reverb/Dockerfile
#  Laravel Reverb — self-hosted WebSocket server (replaces Pusher)
#  Handles: real-time events (job card updates, scan sessions, notifications)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Composer deps ────────────────────────────────────────────────────
FROM composer:2 AS composer-deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --prefer-dist \
    --no-interaction

# ── Stage 2: Reverb server ────────────────────────────────────────────────────
FROM php:8.3-cli-alpine AS reverb

LABEL org.opencontainers.image.title="Garage Guardian — Reverb (WebSocket Server)"

RUN apk update && apk add --no-cache \
    zip unzip curl bash shadow \
    libxml2-dev oniguruma-dev linux-headers \
    icu-dev icu-libs \
    $PHPIZE_DEPS

RUN docker-php-ext-install -j$(nproc) pdo_mysql mbstring pcntl bcmath opcache intl

RUN pecl install redis && docker-php-ext-enable redis

RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/bash -D appuser

WORKDIR /var/www/html

COPY --from=composer-deps /app/vendor /var/www/html/vendor
# Copy application source
COPY --chown=1000:0 . /var/www/html
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/app.ini

# Set permissions for OpenShift (Group 0)
RUN chgrp -R 0 /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R g=u /var/www/html/storage /var/www/html/bootstrap/cache

USER 1000

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8080 || exit 0

CMD ["php", "artisan", "reverb:start", "--host=0.0.0.0", "--port=8080", "--no-interaction"]
