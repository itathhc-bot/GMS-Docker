# ─────────────────────────────────────────────────────────────────────────────
#  docker/base-php/Dockerfile
#  Shared PHP 8.3 base — inherited by backend, horizon, reverb, scheduler
# ─────────────────────────────────────────────────────────────────────────────
FROM php:8.3-fpm-alpine AS base-php

LABEL maintainer="TechAura Projects <admin@techaura-projects.com>"
LABEL org.opencontainers.image.description="Garage Guardian — PHP 8.3 Base"

# ── System deps ───────────────────────────────────────────────────────────────
RUN apk update && apk add --no-cache \
    zip unzip curl bash shadow \
    libpng-dev libjpeg-turbo-dev libwebp-dev \
    libxml2-dev oniguruma-dev linux-headers \
    icu-dev icu-libs \
    $PHPIZE_DEPS

# ── PHP extensions ────────────────────────────────────────────────────────────
RUN docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql mbstring exif pcntl bcmath gd opcache intl

# ── Redis extension ───────────────────────────────────────────────────────────
RUN pecl install redis && docker-php-ext-enable redis

# ── Composer ──────────────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/bash -D appuser

WORKDIR /var/www/html
