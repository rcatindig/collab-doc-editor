FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends git unzip libpq-dev libsqlite3-dev libonig-dev \
    && docker-php-ext-install mbstring pdo_pgsql pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --prefer-dist --no-progress --no-scripts
COPY . .
RUN composer dump-autoload --no-interaction --optimize
RUN mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && chmod -R 775 bootstrap/cache storage
COPY docker/entrypoint.sh /usr/local/bin/ajaia-entrypoint
RUN chmod +x /usr/local/bin/ajaia-entrypoint

EXPOSE 8000
CMD ["sh", "-c", "php artisan migrate --force && exec php artisan serve --host=0.0.0.0 --port=${PORT:-10000}"]
