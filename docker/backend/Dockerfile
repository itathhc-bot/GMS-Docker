# ─────────────────────────────────────────────────────────────────────────────
#  docker/backend/Dockerfile
#  Laravel PHP-FPM application server
#  Handles: HTTP API requests via PHP-FPM + NGINX socket
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Composer deps (production, no dev) ───────────────────────────────
FROM composer:2 AS composer-deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --prefer-dist \
    --ignore-platform-reqs \
    --no-interaction

# ── Stage 2: Frontend assets (Vite build for manifest.json) ───────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY resources/ ./resources/
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js ./
COPY public/ ./public/

ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME

ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
ENV VITE_REVERB_HOST=$VITE_REVERB_HOST
ENV VITE_REVERB_PORT=$VITE_REVERB_PORT
ENV VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN npm run build

# ── Stage 2: Final image ──────────────────────────────────────────────────────
FROM php:8.3-fpm-alpine AS backend

LABEL org.opencontainers.image.title="Garage Guardian — Backend (PHP-FPM)"

# System dependencies
RUN apk update && apk add --no-cache \
    zip unzip curl bash shadow \
    libpng-dev libjpeg-turbo-dev libwebp-dev \
    libxml2-dev oniguruma-dev linux-headers \
    icu-dev icu-libs \
    $PHPIZE_DEPS

# PHP extensions
RUN docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql mbstring exif pcntl bcmath gd opcache intl

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Non-root user
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/bash -D appuser

WORKDIR /var/www/html

# Copy vendor from composer stage
COPY --from=composer-deps /app/vendor /var/www/html/vendor

# Copy application source
COPY --chown=1000:0 . /var/www/html

# Copy Vite build output (manifest + assets) from frontend build stage
# This is needed because public/build/ is .gitignored but @vite() requires manifest.json
COPY --from=frontend-build --chown=1000:0 /app/public/build /var/www/html/public/build

# PHP configuration
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/app.ini
COPY docker/backend/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf

# Set permissions for OpenShift restricted SCC (Group 0)
RUN chgrp -R 0 /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R g=u /var/www/html/storage /var/www/html/bootstrap/cache

# Run optimization (key must be set via env at runtime)
RUN php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear

USER 1000

EXPOSE 9000

CMD ["php-fpm"]
