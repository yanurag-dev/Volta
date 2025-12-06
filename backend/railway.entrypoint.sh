#!/bin/bash

# Exit on error
set -e

echo "Railway Deployment - Starting entrypoint..."

# Extract database host from DATABASE_URL for health check
# DATABASE_URL format: postgresql://user:pass@host:port/dbname
if [ -n "$DATABASE_URL" ]; then
    DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    
    echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
    
    # Wait for PostgreSQL with timeout (60 seconds for Railway)
    timeout=60
    elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if timeout 2 bash -c "echo > /dev/tcp/$DB_HOST/${DB_PORT:-5432}" 2>/dev/null; then
            echo "PostgreSQL is ready!"
            break
        fi
        
        echo "Waiting for PostgreSQL... ($elapsed/$timeout seconds)"
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "WARNING: PostgreSQL health check timed out, proceeding anyway..."
    fi
else
    echo "WARNING: DATABASE_URL not set, skipping database health check"
fi

# Check if this is a celery command
is_celery_command=false
for arg in "$@"; do
    if [ "$arg" = "celery" ]; then
        is_celery_command=true
        break
    fi
done

# Only run migrations for web service (not celery workers)
if [ "$is_celery_command" = false ]; then
    echo "Running migrations..."
    python manage.py migrate --noinput
    
    echo "Creating admin user..."
    python manage.py create_admin
    
    echo "Collecting static files..."
    python manage.py collectstatic --noinput --clear
    
    echo "Web service ready to start!"
else
    echo "Celery worker - skipping migrations"
fi

exec "$@"
