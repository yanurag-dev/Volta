#!/bin/bash

# Exit on error
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Creating admin user..."
python manage.py create_admin

echo "Collecting static files..."
python manage.py collectstatic --noinput

exec "$@"
