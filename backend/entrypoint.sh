#!/bin/bash

# Exit on error
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Only run migrations and collectstatic for web service
# Celery workers should skip these
if [ "$1" = "gunicorn" ]; then
    echo "Running migrations..."
    python manage.py makemigrations --noinput
    python manage.py migrate --noinput

    echo "Creating admin user..."
    python manage.py create_admin

    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

exec "$@"
