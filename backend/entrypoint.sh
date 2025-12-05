#!/bin/bash

# Exit on error
set -e

echo "Waiting for PostgreSQL..."

# Wait for PostgreSQL with timeout (30 seconds)
timeout=30
elapsed=0

while [ $elapsed -lt $timeout ]; do
  # Try bash TCP redirection first (most portable, no dependencies)
  if timeout 1 bash -c "echo > /dev/tcp/db/5432" 2>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  # Fallback to nc if bash TCP is not available
  elif command -v nc >/dev/null 2>&1 && nc -z db 5432 2>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  fi

  echo "Waiting for PostgreSQL... ($elapsed/$timeout seconds)"
  sleep 1
  elapsed=$((elapsed + 1))
done

# Check if we timed out
if [ $elapsed -ge $timeout ]; then
  echo "ERROR: PostgreSQL did not become available within $timeout seconds"
  exit 1
fi

# Only run migrations and collectstatic for web service
# Celery workers should skip these
# Check if this is NOT a celery command (web server commands should run migrations)
# This handles: "python manage.py runserver", "gunicorn", but not "celery worker" or "celery beat"
is_celery_command=false

for arg in "$@"; do
    if [ "$arg" = "celery" ]; then
        is_celery_command=true
        break
    fi
done

if [ "$is_celery_command" = false ]; then
    # Run migrations for non-celery commands
    echo "Running migrations..."
    python manage.py makemigrations --noinput
    python manage.py migrate --noinput

    echo "Creating admin user..."
    python manage.py create_admin

    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

exec "$@"
