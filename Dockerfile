FROM php:8.2-cli-bookworm AS vendor
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libfreetype6-dev \
    libicu-dev \
    libjpeg62-turbo-dev \
    libonig-dev \
    libpng-dev \
    libzip-dev \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    bcmath \
    exif \
    gd \
    intl \
    mbstring \
    pdo_mysql \
    zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts

COPY . .
RUN APP_ENV=production APP_DEBUG=false APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= php artisan package:discover --ansi

FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY resources ./resources
COPY vite.config.js tailwind.config.cjs postcss.config.cjs postcss.config.mjs ./
RUN mkdir -p public && npm run build

FROM php:8.2-apache-bookworm
WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libfreetype6-dev \
    libicu-dev \
    libjpeg62-turbo-dev \
    libonig-dev \
    libpng-dev \
    libzip-dev \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    bcmath \
    exif \
    gd \
    intl \
    mbstring \
    pdo_mysql \
    zip

RUN a2enmod rewrite headers

RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && sed -ri '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=vendor /app/bootstrap/cache ./bootstrap/cache
COPY --from=frontend /app/public/build ./public/build

RUN rm -rf /var/www/html/public/storage && APP_ENV=production APP_DEBUG=false APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= php artisan storage:link --ansi || true

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
