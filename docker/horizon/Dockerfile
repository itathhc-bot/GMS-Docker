# ─────────────────────────────────────────────────────────────────────────────
#  docker/horizon/Dockerfile
#  Laravel Horizon — Redis queue worker manager
#  Handles: all background job processing (notifications, OCR, reports, etc.)
#
#  NOTE: Uses same composer-deps stage as backend for cache efficiency.
#        Build the backend image first, or use `--parallel` in docker-compose.
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

# ── Stage 2: Horizon worker ───────────────────────────────────────────────────
FROM php:8.3-cli-alpine AS horizon

LABEL org.opencontainers.image.title="Garage Guardian — Horizon (Queue Worker)"

RUN apk update && apk add --no-cache \
    zip unzip curl bash shadow \
    libpng-dev libjpeg-turbo-dev libwebp-dev \
    libxml2-dev oniguruma-dev linux-headers \
    icu-dev icu-libs \
    $PHPIZE_DEPS

RUN docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql mbstring exif pcntl bcmath gd opcache intl

RUN pecl install redis && docker-php-ext-enable redis

RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/bash -D appuser

WORKDIR /var/www/html

COPY --from=composer-deps /app/vendor /var/www/html/vendor
COPY --chown=appuser:appgroup . /var/www/html
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/app.ini

RUN chown -R appuser:appgroup /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD php artisan horizon:status 2>/dev/null | grep -qE "running|paused" || exit 1

CMD ["php", "artisan", "horizon"]
