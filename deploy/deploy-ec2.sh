#!/bin/bash

# Volta EC2 Deployment Script
# This script automates the deployment of Volta on AWS EC2 using Docker Compose

set -e  # Exit on error

# Change to project root directory (parent of deploy/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

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
echo "   Volta EC2 Deployment Script"
echo "   All-Docker Production Deployment"
echo "================================================"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

print_success "All prerequisites met!"
echo ""

# Generate strong passwords
print_info "Generating secure credentials..."

# Generate SECRET_KEY (64 characters)
SECRET_KEY=$(python3 -c "import secrets; import string; chars = string.ascii_letters + string.digits + string.punctuation; print(''.join(secrets.choice(chars) for _ in range(64)))" | sed 's/[$]/\\$/g')

# Generate DB password (32 characters, alphanumeric only - safe for URLs)
DB_PASSWORD=$(python3 -c "import secrets; import string; chars = string.ascii_letters + string.digits; print(''.join(secrets.choice(chars) for _ in range(32)))")

# Generate RabbitMQ password (32 characters, alphanumeric only - safe for URLs)
RABBITMQ_PASSWORD=$(python3 -c "import secrets; import string; chars = string.ascii_letters + string.digits; print(''.join(secrets.choice(chars) for _ in range(32)))")

print_success "Credentials generated!"
echo ""

# Prompt for EC2 public IP
print_info "Please enter your EC2 configuration details:"
echo ""

read -p "EC2 Public IP Address: " EC2_IP

# Validate IP format
if ! [[ $EC2_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    print_error "Invalid IP address format. Please use format: xxx.xxx.xxx.xxx"
    exit 1
fi

# Prompt for admin credentials
echo ""
read -p "Admin Username (default: admin): " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -p "Admin Email (default: admin@volta.app): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@volta.app}

# Prompt for admin password with validation
while true; do
    read -s -p "Admin Password (min 12 characters): " ADMIN_PASSWORD
    echo ""
    if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
        print_error "Password must be at least 12 characters long."
        continue
    fi
    read -s -p "Confirm Admin Password: " ADMIN_PASSWORD_CONFIRM
    echo ""
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        print_error "Passwords do not match. Please try again."
        continue
    fi
    break
done

echo ""
print_success "Configuration collected!"
echo ""

# Create .env.production file
print_info "Creating production environment file..."

cat > backend/.env.production << EOF
# Django Settings Module
DJANGO_SETTINGS_MODULE=volta.settings.production

# Security
SECRET_KEY=$SECRET_KEY
DEBUG=False

# Allowed Hosts
ALLOWED_HOSTS=$EC2_IP,localhost,127.0.0.1

# CORS Origins
CORS_ALLOWED_ORIGINS=http://$EC2_IP

# Database Configuration
DATABASE_URL=postgresql://volta_user:$DB_PASSWORD@db:5432/volta

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Celery Configuration
CELERY_BROKER_URL=amqp://volta:$RABBITMQ_PASSWORD@rabbitmq:5672//
CELERY_RESULT_BACKEND=redis://redis:6379/0
CELERY_TASK_ALWAYS_EAGER=False

# Admin User
DJANGO_SUPERUSER_USERNAME=$ADMIN_USERNAME
DJANGO_SUPERUSER_EMAIL=$ADMIN_EMAIL
DJANGO_SUPERUSER_PASSWORD=$ADMIN_PASSWORD

# File Upload Settings
MAX_UPLOAD_SIZE=104857600

# Security Settings (HTTP deployment)
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# Logging
LOG_LEVEL=INFO

# Deployment Environment
DEPLOYMENT_ENV=production
EOF

print_success ".env.production file created!"
echo ""

# Create .env file for docker-compose (for password substitution)
cat > .env << EOF
DB_PASSWORD=$DB_PASSWORD
RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD
EOF

print_success ".env file created for Docker Compose!"
echo ""

# Check disk space
print_info "Checking available disk space..."
AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 5 ]; then
    print_warning "Less than 5GB of disk space available. Deployment may fail."
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        print_info "Deployment cancelled."
        exit 0
    fi
fi

print_success "Sufficient disk space available!"
echo ""

# Stop any existing containers and clean up volumes
print_info "Stopping any existing containers..."
docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
print_success "Existing containers stopped and volumes cleaned!"
echo ""

# Pull Docker images
print_info "Pulling Docker images... (this may take a few minutes)"
docker-compose -f docker-compose.prod.yml pull --quiet
print_success "Docker images pulled!"
echo ""

# Build containers
print_info "Building containers... (this may take 10-15 minutes)"
docker-compose -f docker-compose.prod.yml build --no-cache
print_success "Containers built successfully!"
echo ""

# Start services
print_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d
print_success "Services started!"
echo ""

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
TIMEOUT=180
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTHY=$(docker-compose -f docker-compose.prod.yml ps | grep -c "healthy" || true)
    if [ "$HEALTHY" -ge 4 ]; then
        print_success "All services are healthy!"
        break
    fi
    echo -n "."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    print_warning "Services taking longer than expected to start. Check logs with: docker-compose -f docker-compose.prod.yml logs"
fi

echo ""

# Display deployment summary
echo "================================================"
echo "   Deployment Complete!"
echo "================================================"
echo ""
print_success "Volta has been successfully deployed!"
echo ""
echo "Access your application at:"
echo "  Frontend:  http://$EC2_IP/"
echo "  API:       http://$EC2_IP/api/"
echo "  Admin:     http://$EC2_IP/admin/"
echo ""
echo "Admin Credentials:"
echo "  Username:  $ADMIN_USERNAME"
echo "  Email:     $ADMIN_EMAIL"
echo "  Password:  [saved in .env.production]"
echo ""
echo "Useful Commands:"
echo "  View logs:        docker-compose -f docker-compose.prod.yml logs -f"
echo "  Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  Stop services:    docker-compose -f docker-compose.prod.yml down"
echo "  View status:      docker-compose -f docker-compose.prod.yml ps"
echo ""
print_info "Database and RabbitMQ passwords are saved in the .env file"
print_info "Keep your .env and .env.production files secure!"
echo ""
print_warning "For HTTPS upgrade, see: HTTPS_UPGRADE_GUIDE.md"
echo "================================================"
