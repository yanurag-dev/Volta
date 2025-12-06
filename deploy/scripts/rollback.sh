#!/bin/bash

# Volta Rollback Script
# Rolls back to the previous deployment

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
echo "   Volta Deployment Rollback"
echo "================================================"
echo ""

# Check if previous deployment exists
if [ ! -f .previous_deployment ]; then
    print_error "No previous deployment found!"
    print_error "Cannot rollback. .previous_deployment file missing."
    exit 1
fi

# Read previous deployment info
PREVIOUS_TAG=$(grep "Image Tag:" .previous_deployment | cut -d: -f2 | xargs)

if [ -z "$PREVIOUS_TAG" ]; then
    print_error "Could not extract previous image tag from .previous_deployment"
    exit 1
fi

print_warning "Current deployment will be rolled back to:"
cat .previous_deployment
echo ""

# Confirm rollback
read -p "Are you sure you want to rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Rollback cancelled."
    exit 0
fi

echo ""
print_info "Starting rollback to image tag: $PREVIOUS_TAG"
echo ""

# Get Docker username from environment or .env file
if [ -z "$DOCKER_USERNAME" ]; then
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
fi

if [ -z "$DOCKER_USERNAME" ]; then
    print_error "DOCKER_USERNAME not set!"
    print_error "Please set DOCKER_USERNAME environment variable or create .env file"
    exit 1
fi

# Set environment variables
export IMAGE_TAG=$PREVIOUS_TAG

print_info "Docker Hub Username: $DOCKER_USERNAME"
print_info "Rolling back to tag: $IMAGE_TAG"
echo ""

# Pull previous images
print_info "Pulling previous Docker images..."
docker-compose -f docker-compose.deploy.yml pull web celery_worker frontend nginx
print_success "Previous images pulled!"
echo ""

# Stop current containers gracefully
print_info "Stopping current containers..."
docker-compose -f docker-compose.deploy.yml down
print_success "Current containers stopped!"
echo ""

# Start previous version
print_info "Starting previous version..."
docker-compose -f docker-compose.deploy.yml up -d
print_success "Previous version started!"
echo ""

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
TIMEOUT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTHY_COUNT=$(docker-compose -f docker-compose.deploy.yml ps 2>/dev/null | grep -c "healthy" || echo "0")

    if [ "$HEALTHY_COUNT" -ge 4 ]; then
        print_success "Services are healthy!"
        break
    fi

    echo -n "."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""

if [ $ELAPSED -ge $TIMEOUT ]; then
    print_error "Services failed to become healthy within $TIMEOUT seconds"
    print_error "Check logs with: docker-compose -f docker-compose.deploy.yml logs"
    exit 1
fi

# Update current deployment file
cp .previous_deployment .current_deployment

echo ""
echo "================================================"
echo "   Rollback Complete!"
echo "================================================"
echo ""
print_success "Successfully rolled back to previous version!"
echo ""
echo "Deployment Details:"
echo "  Image Tag: $PREVIOUS_TAG"
echo "  Rollback Time: $(date)"
echo ""
echo "Verify the application:"
docker-compose -f docker-compose.deploy.yml ps
echo ""
echo "================================================"
