# Volta EC2 Deployment Guide

This guide explains how to deploy Volta to AWS EC2 using Docker Compose.

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04+ or Amazon Linux 2)
- Docker and Docker Compose installed on EC2
- Security group allowing inbound traffic on port 80
- At least 5GB free disk space

## Quick Start

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

2. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Volta
   ```

3. **Run the deployment script:**
   ```bash
   chmod +x deploy/deploy-ec2.sh
   ./deploy/deploy-ec2.sh
   ```

4. **Follow the prompts:**
   - Enter your EC2 public IP address
   - Set admin username, email, and password
   - Wait for deployment to complete (~10-15 minutes)

## What the Script Does

1. ✅ Checks prerequisites (Docker, Docker Compose)
2. 🔐 Generates secure credentials (SECRET_KEY, DB password, RabbitMQ password)
3. 📝 Creates `.env.production` and `.env` files
4. 🧹 Cleans up existing containers and volumes
5. 🐳 Pulls and builds Docker images
6. 🚀 Starts all services (PostgreSQL, Redis, RabbitMQ, Django, Celery, Frontend, Nginx)
7. ⏳ Waits for services to be healthy
8. ✨ Displays access URLs and credentials

## Generated Files

### `.env` (root directory)
Contains passwords for Docker Compose variable substitution:
```env
DB_PASSWORD=<generated-32-char-alphanumeric>
RABBITMQ_PASSWORD=<generated-32-char-alphanumeric>
```

### `backend/.env.production`
Contains all Django application settings:
```env
DJANGO_SETTINGS_MODULE=volta.settings.production
SECRET_KEY=<generated-64-char-secret>
DATABASE_URL=postgresql://volta_user:PASSWORD@db:5432/volta
CELERY_BROKER_URL=amqp://volta:PASSWORD@rabbitmq:5672//
ALLOWED_HOSTS=<your-ec2-ip>,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://<your-ec2-ip>
# ... and more
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Nginx (Port 80)                      │
│  Routes: /, /api/, /admin/, /static/, /media/    │
└──────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ React Frontend   │  │ Django Backend   │
│   (Port 80)      │  │  (Port 8000)     │
└──────────────────┘  └──────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │PostgreSQL│       │  Redis   │       │ RabbitMQ │
    │          │       │          │       │          │
    └──────────┘       └──────────┘       └──────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │Celery Worker │
                       └──────────────┘
```

## Service URLs

After deployment, access your application at:

- **Frontend**: `http://<your-ec2-ip>/`
- **API**: `http://<your-ec2-ip>/api/`
- **Admin Panel**: `http://<your-ec2-ip>/admin/`
- **Health Check**: `http://<your-ec2-ip>/health`

## Troubleshooting

### Issue: "Password authentication failed for user 'volta_user'"

**Cause**: PostgreSQL container was started with one password, but the Django app is trying to connect with a different password.

**Solution**:
```bash
# Stop containers and remove volumes
docker-compose -f docker-compose.prod.yml down -v

# Remove old environment files
rm .env backend/.env.production

# Re-run deployment script
./deploy/deploy-ec2.sh
```

### Issue: "Port could not be cast to integer value"

**Cause**: Database password contains URL-unsafe characters (like `@`, `#`, `*`).

**Solution**: This has been fixed in the latest version of the script. Passwords are now alphanumeric only. Update your deployment script:
```bash
git pull origin main
./deploy/deploy-ec2.sh
```

### Issue: Services not starting / health checks failing

**Check logs**:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**Check specific service**:
```bash
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs db
docker-compose -f docker-compose.prod.yml logs celery_worker
```

**Restart services**:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Issue: "Connection refused" errors

**Check if services are running**:
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Check service health**:
```bash
docker inspect volta_db_prod | grep -A 10 Health
docker inspect volta_redis_prod | grep -A 10 Health
docker inspect volta_rabbitmq_prod | grep -A 10 Health
```

### Issue: Insufficient disk space

**Check disk usage**:
```bash
df -h
docker system df
```

**Clean up Docker resources**:
```bash
docker system prune -a --volumes
```

### Issue: Admin user not created

**Manually create admin user**:
```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

## Useful Commands

### View all running containers
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f celery_worker
```

### Restart services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart web
```

### Stop services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Stop and remove volumes (CAUTION: Deletes data)
```bash
docker-compose -f docker-compose.prod.yml down -v
```

### Access Django shell
```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py shell
```

### Run migrations
```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
```

### Collect static files
```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

### Access PostgreSQL
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U volta_user -d volta
```

## Security Recommendations

### 1. Keep credentials secure
- Never commit `.env` or `.env.production` files to Git
- Store credentials in a secure password manager
- Rotate passwords regularly

### 2. Enable HTTPS
- Obtain SSL certificate (Let's Encrypt recommended)
- Update nginx configuration to use HTTPS
- Set `SECURE_SSL_REDIRECT=True` in `.env.production`

### 3. Configure firewall
```bash
# Allow only SSH and HTTP/HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Regular updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Database backups
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U volta_user volta > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20250101.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U volta_user -d volta
```

## Performance Tuning

### Increase Celery workers
Edit `docker-compose.prod.yml`:
```yaml
celery_worker:
  command: celery -A volta worker --loglevel=info --concurrency=8  # Increase from 4
```

### Increase Gunicorn workers
Edit `docker-compose.prod.yml`:
```yaml
web:
  command: gunicorn volta.wsgi:application --bind 0.0.0.0:8000 --workers 8 --timeout 120  # Increase from 4
```

### Optimize PostgreSQL
Add to `docker-compose.prod.yml` under `db` service:
```yaml
command:
  - "postgres"
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=256MB"
```

## Monitoring

### Check resource usage
```bash
docker stats
```

### Monitor logs in real-time
```bash
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

### Health check
```bash
curl http://your-ec2-ip/health
```

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Docker logs
3. Check the main README.md for architecture details
4. Open an issue on the repository

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key (64 chars) | Auto-generated |
| `DEBUG` | Debug mode (always False in prod) | `False` |
| `ALLOWED_HOSTS` | Allowed hostnames | `1.2.3.4,localhost` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `CELERY_BROKER_URL` | RabbitMQ connection string | `amqp://...` |
| `DJANGO_SUPERUSER_USERNAME` | Admin username | `admin` |
| `DJANGO_SUPERUSER_EMAIL` | Admin email | `admin@volta.app` |
| `DJANGO_SUPERUSER_PASSWORD` | Admin password | User-provided |
| `MAX_UPLOAD_SIZE` | Max file upload size (bytes) | `104857600` (100MB) |
| `LOG_LEVEL` | Logging level | `INFO` |

## Files Created by Deployment

```
Volta/
├── .env                          # Docker Compose passwords (gitignored)
├── backend/
│   └── .env.production          # Django settings (gitignored)
├── docker-compose.prod.yml      # Production compose file
└── deploy/
    ├── deploy-ec2.sh            # Deployment script
    └── README.md                # This file
```

---

**Last Updated**: 2025-12-06
