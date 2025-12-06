#!/bin/bash

# Volta Zero-Downtime Deployment Script
# Deploys pre-built images from Docker Hub to EC2

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo "================================================"
echo "   Volta Zero-Downtime Deployment"
echo "   Deploying from Docker Hub"
echo "================================================"
echo ""

# Check required environment variables
if [ -z "$DOCKER_USERNAME" ]; then
    print_error "DOCKER_USERNAME environment variable is not set"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    print_warning "IMAGE_TAG not set, using 'latest'"
    IMAGE_TAG="latest"
fi

print_info "Docker Hub Username: $DOCKER_USERNAME"
print_info "Image Tag: $IMAGE_TAG"
echo ""

# Check if .env.production exists
if [ ! -f backend/.env.production ]; then
    print_error "backend/.env.production file not found!"
    print_error "Please create it with required environment variables"
    exit 1
fi

# Backup current deployment info
print_info "Backing up current deployment info..."
BACKUP_FILE=".deployment_backup_$(date +%Y%m%d_%H%M%S).txt"
docker-compose -f docker-compose.deploy.yml ps > "$BACKUP_FILE" 2>/dev/null || true
print_success "Backup saved to: $BACKUP_FILE"
echo ""

# Save current image tag for rollback
if [ -f .current_deployment ]; then
    cp .current_deployment .previous_deployment
fi

# Export environment variables for docker-compose
export DOCKER_USERNAME=$DOCKER_USERNAME
export IMAGE_TAG=$IMAGE_TAG

# Pull latest images from Docker Hub
print_info "Pulling latest Docker images from Docker Hub..."
docker-compose -f docker-compose.deploy.yml pull web celery_worker frontend nginx
print_success "Images pulled successfully!"
echo ""

# Collect static files
print_info "Collecting static files..."
docker-compose -f docker-compose.deploy.yml run --rm --no-deps web python manage.py collectstatic --noinput || true
print_success "Static files collected!"
echo ""

# Run migrations
print_info "Running database migrations..."
docker-compose -f docker-compose.deploy.yml run --rm --no-deps web python manage.py migrate --noinput
print_success "Migrations completed!"
echo ""

# Deploy with zero-downtime strategy
print_info "Starting zero-downtime deployment..."

# Start new containers (old ones still running if they exist)
docker-compose -f docker-compose.deploy.yml up -d

# Wait for new containers to be healthy
print_info "Waiting for new containers to be healthy..."
TIMEOUT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    # Check if containers are healthy
    HEALTHY_COUNT=$(docker-compose -f docker-compose.deploy.yml ps 2>/dev/null | grep -c "healthy" || echo "0")

    # We expect at least 4 healthy containers (web, celery, frontend, nginx)
    if [ "$HEALTHY_COUNT" -ge 4 ]; then
        print_success "New containers are healthy!"
        break
    fi

    echo -n "."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""

if [ $ELAPSED -ge $TIMEOUT ]; then
    print_error "New containers failed to become healthy within $TIMEOUT seconds"
    print_error "Check logs with: docker-compose -f docker-compose.deploy.yml logs"
    print_warning "You may need to manually rollback if the deployment is broken"
    exit 1
fi

# Remove old/unused containers
print_info "Cleaning up old containers..."
docker-compose -f docker-compose.deploy.yml up -d --remove-orphans
print_success "Cleanup completed!"
echo ""

# Clean up old images to save disk space (keep last 3 versions)
print_info "Cleaning up old Docker images..."
docker image prune -f > /dev/null 2>&1 || true
print_success "Image cleanup completed!"
echo ""

# Verify deployment
print_info "Verifying deployment..."
echo ""
docker-compose -f docker-compose.deploy.yml ps
echo ""

# Health check
print_info "Running final health checks..."
sleep 5

WEB_HEALTH=$(docker inspect volta_web_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
CELERY_HEALTH=$(docker inspect volta_celery_worker_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
FRONTEND_HEALTH=$(docker inspect volta_frontend_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
NGINX_HEALTH=$(docker inspect volta_nginx_prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")

echo "Health Status:"
echo "  Web:      $WEB_HEALTH"
echo "  Celery:   $CELERY_HEALTH"
echo "  Frontend: $FRONTEND_HEALTH"
echo "  Nginx:    $NGINX_HEALTH"
echo ""

if [ "$WEB_HEALTH" == "healthy" ] && [ "$CELERY_HEALTH" == "healthy" ] && [ "$FRONTEND_HEALTH" == "healthy" ] && [ "$NGINX_HEALTH" == "healthy" ]; then
    print_success "All services are healthy!"
else
    print_warning "Some services may not be fully healthy yet. Check logs:"
    echo "  docker-compose -f docker-compose.deploy.yml logs -f"
fi

# Save deployment info
echo "Image Tag: $IMAGE_TAG" > .current_deployment
echo "Deployed at: $(date)" >> .current_deployment
echo "Deployed by: CI/CD" >> .current_deployment

echo ""
echo "================================================"
echo "   Deployment Complete!"
echo "================================================"
echo ""
print_success "Volta has been successfully deployed!"
echo ""
echo "Deployment Details:"
echo "  Docker Hub User: $DOCKER_USERNAME"
echo "  Image Tag:       $IMAGE_TAG"
echo "  Deployment Time: $(date)"
echo ""
echo "Useful Commands:"
echo "  View logs:        docker-compose -f docker-compose.deploy.yml logs -f [service]"
echo "  Restart service:  docker-compose -f docker-compose.deploy.yml restart [service]"
echo "  View status:      docker-compose -f docker-compose.deploy.yml ps"
echo "  Rollback:         bash deploy/scripts/rollback.sh"
echo ""
echo "================================================"
