# Stage 1: Base
FROM php:8.3-fpm-alpine AS base

# Install system dependencies
RUN apk update && apk add --no-cache \
    zip \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libxml2-dev \
    oniguruma-dev \
    linux-headers \
    $PHPIZE_DEPS \
    bash \
    supervisor

# Install PHP extensions
RUN docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    opcache

# Install Redis extension
RUN pecl install redis \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html


# Stage 2: Dependencies
FROM base AS deps
COPY composer.json composer.lock ./
# Note: In a real environment, you'd only run this if the files are present,
# but since this is a Dockerfile for the project, we assume they exist.
RUN composer install --no-dev --optimize-autoloader --no-scripts --prefer-dist


# Stage 3: Frontend Build
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY resources/ ./resources/
COPY vite.config.js ./
# We might need tailwind.config.js, postcss.config.js etc depending on the setup.
COPY . .
RUN npm run build


# Stage 4: Production
FROM base AS prod

# Copy vendor from deps
COPY --from=deps /var/www/html/vendor /var/www/html/vendor

# Copy application code
COPY . /var/www/html

# Copy built frontend assets
COPY --from=frontend-build /app/public/build /var/www/html/public/build

# Setup production php.ini settings
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && echo "memory_limit=256M" >> "$PHP_INI_DIR/conf.d/custom.ini" \
    && echo "upload_max_filesize=20M" >> "$PHP_INI_DIR/conf.d/custom.ini" \
    && echo "post_max_size=20M" >> "$PHP_INI_DIR/conf.d/custom.ini" \
    && echo "opcache.enable=1" >> "$PHP_INI_DIR/conf.d/custom.ini" \
    && echo "opcache.memory_consumption=256" >> "$PHP_INI_DIR/conf.d/custom.ini" \
    && echo "opcache.max_accelerated_files=10000" >> "$PHP_INI_DIR/conf.d/custom.ini"

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Run Laravel optimization commands
# Note: we need the APP_KEY or this might fail. In a real CI/CD, we run this at deploy time or provide a dummy key here.
RUN php artisan config:cache || true
RUN php artisan route:cache || true
RUN php artisan view:cache || true

EXPOSE 9000
CMD ["php-fpm"]
