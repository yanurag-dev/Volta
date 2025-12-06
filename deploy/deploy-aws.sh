#!/bin/bash

# Volta AWS EC2 Deployment Script (with Managed Services)
# Uses: RDS PostgreSQL, ElastiCache Redis, CloudAMQP RabbitMQ

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "================================================"
echo "   Volta AWS EC2 Deployment"
echo "   With Managed Services (RDS, ElastiCache, CloudAMQP)"
echo "================================================"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker not installed. Install it first!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose not installed!"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker daemon not running!"
    exit 1
fi

print_success "All prerequisites met!"
echo ""

# Generate SECRET_KEY (only alphanumeric to avoid shell parsing issues)
print_info "Generating secure SECRET_KEY..."
SECRET_KEY=$(python3 -c "import secrets; import string; chars = string.ascii_letters + string.digits; print(''.join(secrets.choice(chars) for _ in range(64)))")
print_success "SECRET_KEY generated!"
echo ""

# Collect AWS endpoints
print_info "Please provide your AWS service endpoints:"
echo ""

read -p "EC2 Public IP: " EC2_IP
read -p "RDS PostgreSQL Endpoint (e.g., volta-db.xxxxx.rds.amazonaws.com): " RDS_ENDPOINT
read -p "RDS Password: " -s RDS_PASSWORD
echo ""
read -p "ElastiCache Redis Endpoint (e.g., volta-redis.xxxxx.cache.amazonaws.com): " REDIS_ENDPOINT
read -p "CloudAMQP URL (amqps://...): " CLOUDAMQP_URL
echo ""

# Admin credentials
read -p "Admin Username (default: admin): " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -p "Admin Email (default: admin@volta.app): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@volta.app}

while true; do
    read -s -p "Admin Password (min 12 characters): " ADMIN_PASSWORD
    echo ""
    if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
        print_error "Password must be at least 12 characters!"
        continue
    fi
    read -s -p "Confirm Admin Password: " ADMIN_PASSWORD_CONFIRM
    echo ""
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        print_error "Passwords don't match!"
        continue
    fi
    break
done

echo ""
print_success "Configuration collected!"
echo ""

# Create .env.production
print_info "Creating .env.production file..."

cat > backend/.env.production << EOF
# Django Settings
DJANGO_SETTINGS_MODULE=volta.settings.production
SECRET_KEY=$SECRET_KEY
DEBUG=False

# Allowed Hosts
ALLOWED_HOSTS=$EC2_IP,localhost,127.0.0.1

# CORS Origins
CORS_ALLOWED_ORIGINS=http://$EC2_IP

# AWS RDS PostgreSQL
DATABASE_URL=postgresql://postgres:$RDS_PASSWORD@$RDS_ENDPOINT:5432/volta

# AWS ElastiCache Redis
REDIS_URL=redis://$REDIS_ENDPOINT:6379/0

# CloudAMQP RabbitMQ
CELERY_BROKER_URL=$CLOUDAMQP_URL
CELERY_RESULT_BACKEND=redis://$REDIS_ENDPOINT:6379/0
CELERY_TASK_ALWAYS_EAGER=False

# Admin User
DJANGO_SUPERUSER_USERNAME=$ADMIN_USERNAME
DJANGO_SUPERUSER_EMAIL=$ADMIN_EMAIL
DJANGO_SUPERUSER_PASSWORD=$ADMIN_PASSWORD

# File Upload
MAX_UPLOAD_SIZE=104857600

# Security Settings
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# Logging
LOG_LEVEL=INFO

# Deployment
DEPLOYMENT_ENV=production
DEPLOYMENT_PLATFORM=aws-ec2
EOF

print_success ".env.production created!"
echo ""

# Stop existing containers
print_info "Stopping existing containers..."
docker-compose -f docker-compose.aws.yml down 2>/dev/null || true
print_success "Stopped!"
echo ""

# Build containers
print_info "Building containers... (this may take 5-10 minutes)"
docker-compose -f docker-compose.aws.yml build --no-cache
print_success "Build complete!"
echo ""

# Start services
print_info "Starting services..."
docker-compose -f docker-compose.aws.yml up -d
print_success "Services started!"
echo ""

# Wait for health
print_info "Waiting for services to be healthy..."
sleep 10

HEALTHY=$(docker-compose -f docker-compose.aws.yml ps | grep -c "healthy" || echo "0")
if [ "$HEALTHY" -ge 2 ]; then
    print_success "Services are healthy!"
else
    print_warning "Services may still be starting. Check logs: docker-compose -f docker-compose.aws.yml logs"
fi

echo ""
echo "================================================"
echo "   Deployment Complete!"
echo "================================================"
echo ""
print_success "Volta deployed successfully with AWS managed services!"
echo ""
echo "Access your application:"
echo "  Frontend:  http://$EC2_IP/"
echo "  API:       http://$EC2_IP/api/"
echo "  Admin:     http://$EC2_IP/admin/"
echo ""
echo "Admin Credentials:"
echo "  Username:  $ADMIN_USERNAME"
echo "  Email:     $ADMIN_EMAIL"
echo ""
echo "Useful Commands:"
echo "  View logs:    docker-compose -f docker-compose.aws.yml logs -f"
echo "  Restart:      docker-compose -f docker-compose.aws.yml restart"
echo "  Stop:         docker-compose -f docker-compose.aws.yml down"
echo "  Status:       docker-compose -f docker-compose.aws.yml ps"
echo ""
print_info "All credentials saved in backend/.env.production"
echo "================================================"
