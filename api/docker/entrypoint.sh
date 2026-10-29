#!/bin/sh
set -eu

if [ ! -f .env ]; then
    cp .env.example .env
fi

if ! grep -q '^APP_KEY=base64:' .env; then
    php artisan key:generate --force --no-interaction
fi

until php artisan migrate --force --no-interaction; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

# Run PHP directly so the HTTP worker inherits the Compose environment exactly.
# `artisan serve` launches a child server process and can diverge from the
# environment used by the migration command above.
cd public
exec php -S 0.0.0.0:8000 -t . ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
