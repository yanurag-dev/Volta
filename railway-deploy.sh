#!/bin/bash

# Railway Deployment Helper Script
# This script helps you deploy Volta to Railway using the CLI

set -e

echo "=================================================="
echo "🚂 Volta Railway Deployment Helper"
echo "=================================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "✅ Railway CLI is installed"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 You need to login to Railway"
    echo ""
    railway login
    echo ""
fi

echo "✅ Logged in to Railway"
echo ""

# Function to create and deploy a service
deploy_service() {
    local service_name=$1
    local root_dir=$2
    local start_command=$3
    
    echo "=================================================="
    echo "📦 Deploying: $service_name"
    echo "=================================================="
    
    if [ -n "$start_command" ]; then
        echo "Root Directory: $root_dir"
        echo "Start Command: $start_command"
    else
        echo "Root Directory: $root_dir"
        echo "Using Dockerfile CMD"
    fi
    
    echo ""
    read -p "Deploy this service? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -n "$start_command" ]; then
            railway up --service "$service_name" --detach
        else
            railway up --service "$service_name" --detach
        fi
        echo "✅ $service_name deployment started"
    else
        echo "⏭️  Skipped $service_name"
    fi
    echo ""
}

# Main deployment flow
echo "=================================================="
echo "📋 Deployment Checklist"
echo "=================================================="
echo ""
echo "Before proceeding, make sure you have:"
echo "  ✅ Created a Railway project"
echo "  ✅ Added PostgreSQL service"
echo "  ✅ Added Redis service"
echo "  ✅ Set up RabbitMQ (CloudAMQP or template)"
echo "  ✅ Configured environment variables"
echo ""
read -p "Have you completed the checklist above? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please complete the setup first:"
    echo "  1. Go to https://railway.app"
    echo "  2. Create a new project"
    echo "  3. Add PostgreSQL and Redis"
    echo "  4. Set up RabbitMQ (see RAILWAY_DEPLOYMENT.md)"
    echo ""
    echo "Then run this script again!"
    exit 0
fi

echo ""
echo "=================================================="
echo "🚀 Starting Deployment"
echo "=================================================="
echo ""

# Link to project
echo "Linking to Railway project..."
railway link

echo ""
echo "=================================================="
echo "Which services do you want to deploy?"
echo "=================================================="
echo ""
echo "1. Backend (Django Web)"
echo "2. Celery Worker"
echo "3. Frontend (React)"
echo "4. All services"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        deploy_service "volta-web" "backend" ""
        ;;
    2)
        deploy_service "volta-celery-worker" "backend" "celery -A volta worker --loglevel=info --concurrency=4"
        ;;
    3)
        deploy_service "volta-frontend" "frontend" ""
        ;;
    4)
        deploy_service "volta-web" "backend" ""
        deploy_service "volta-celery-worker" "backend" "celery -A volta worker --loglevel=info --concurrency=4"
        deploy_service "volta-frontend" "frontend" ""
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Check deployment status: railway status"
echo "  2. View logs: railway logs"
echo "  3. Get service URL: railway domain"
echo "  4. Open Railway dashboard: railway open"
echo ""
echo "📖 For troubleshooting, see RAILWAY_DEPLOYMENT.md"
echo ""
