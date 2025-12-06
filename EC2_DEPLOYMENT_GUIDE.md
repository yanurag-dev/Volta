# Volta - EC2 Deployment Guide (All-Docker)

Complete guide for deploying Volta on AWS EC2 using Docker Compose with all services containerized.

---

## 📋 Prerequisites

### AWS Requirements
- **AWS Account** with EC2 access
- **EC2 Instance**:
  - **AMI**: Ubuntu 22.04 LTS (free tier eligible)
  - **Instance Type**: t2.micro (1 vCPU, 1 GB RAM) - sufficient for testing
  - **Storage**: Minimum 8 GB (recommend 20 GB for production)
  - **Region**: Any (recommend us-east-1 for free tier)

### Local Requirements
- SSH client
- Git (to clone repository on EC2)

---

## 🚀 Quick Start (5 Steps)

### Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name**: volta-production
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance type**: t2.micro (free tier)
   - **Key pair**: Create new or select existing (.pem file)
   - **Storage**: 20 GB gp3

3. **Configure Security Group** (IMPORTANT):
   - Click "Edit" next to Network settings
   - Add these inbound rules:

   | Type | Protocol | Port Range | Source |
   |------|----------|------------|--------|
   | SSH | TCP | 22 | My IP (or 0.0.0.0/0) |
   | HTTP | TCP | 80 | 0.0.0.0/0 |
   | Custom TCP | TCP | 8000 | 0.0.0.0/0 (optional, for direct API access) |

4. Click **Launch Instance**

5. **Note your EC2 Public IP**:
   - Go to EC2 Instances
   - Select your instance
   - Copy **Public IPv4 address** (e.g., 3.89.123.45)

---

### Step 2: Connect to EC2

```bash
# On your local machine
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Replace:
- `your-key.pem` with your downloaded key file
- `YOUR_EC2_PUBLIC_IP` with your actual EC2 IP

---

### Step 3: Install Docker & Docker Compose

Run these commands on EC2:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (to run docker without sudo)
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# IMPORTANT: Logout and login again for group changes to take effect
exit
```

**SSH back in:**
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

### Step 4: Clone and Deploy

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/Volta.git
cd Volta

# Make deployment script executable
chmod +x deploy/deploy-ec2.sh

# Run deployment script
./deploy/deploy-ec2.sh
```

**The script will prompt you for:**
1. EC2 Public IP (enter the IP you noted earlier)
2. Admin username (default: admin)
3. Admin email (default: admin@volta.app)
4. Admin password (minimum 12 characters)

The script will automatically:
- Generate secure SECRET_KEY, database, and RabbitMQ passwords
- Create production environment configuration
- Pull and build Docker images (10-15 minutes)
- Start all services
- Run database migrations
- Create admin user

---

### Step 5: Access Your Application

Once deployment completes, access your app at:

- **Frontend**: `http://YOUR_EC2_IP/`
- **API**: `http://YOUR_EC2_IP/api/`
- **Admin Panel**: `http://YOUR_EC2_IP/admin/`

Login to admin with the credentials you provided during deployment.

---

## 📦 What Gets Deployed

The deployment includes **7 Docker containers**:

1. **PostgreSQL 16** - Database
2. **Redis 7** - Cache and Celery result backend
3. **RabbitMQ 3** - Message broker for Celery
4. **Django Web** - API and admin (Gunicorn with 4 workers)
5. **Celery Worker** - Background task processing (4 concurrent workers)
6. **React Frontend** - User interface (Nginx)
7. **Nginx** - Reverse proxy (entry point on port 80)

All services run on an internal Docker network. Only Nginx exposes port 80 externally.

---

## 🔧 Management Commands

### View Service Status
```bash
cd ~/Volta
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f celery_worker

# Or use helper script
./deploy/scripts/view-logs.sh
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart web

# Or use helper script
./deploy/scripts/restart-services.sh
```

### Stop All Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start All Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Rebuild After Code Changes
```bash
git pull origin main
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💾 Database Backup & Restore

### Create Backup
```bash
./deploy/scripts/backup-database.sh
```

Backups are stored in `backups/` directory with timestamp.
The script automatically:
- Creates compressed backup (.sql.gz)
- Keeps last 7 backups
- Deletes older backups

### Restore from Backup
```bash
./deploy/scripts/restore-database.sh
```

Follow the prompts to select a backup file.

---

## 🐛 Troubleshooting

### Services Won't Start

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs
```

**Common issues:**
1. **Port 80 already in use**: Stop other web servers (Apache, Nginx)
   ```bash
   sudo systemctl stop apache2
   sudo systemctl stop nginx
   ```

2. **Out of disk space**: Check available space
   ```bash
   df -h
   ```

3. **Out of memory**: Reduce worker counts in docker-compose.prod.yml

### Can't Access Application

1. **Check security group**: Ensure port 80 is open in AWS Security Group
2. **Check Nginx status**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   ```
3. **Verify all containers are healthy**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

### Database Connection Errors

**Restart database service:**
```bash
docker-compose -f docker-compose.prod.yml restart db
```

**Check database logs:**
```bash
docker-compose -f docker-compose.prod.yml logs db
```

### CSV Upload Fails

1. **Check Celery worker**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs celery_worker
   ```

2. **Check RabbitMQ**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs rabbitmq
   ```

3. **Verify disk space for media uploads**:
   ```bash
   df -h
   ```

### 502 Bad Gateway

**This means Nginx can't reach the backend:**
```bash
# Restart web service
docker-compose -f docker-compose.prod.yml restart web nginx

# Check if web service is healthy
docker-compose -f docker-compose.prod.yml ps web
```

---

## 🔒 Security Best Practices

### Change Default Passwords

After deployment, consider changing:
1. Admin password (Django admin panel)
2. Database password (in .env file)
3. RabbitMQ password (in .env file)

After changing .env:
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Firewall Configuration

**Restrict SSH access to your IP only:**
1. Go to AWS Console → EC2 → Security Groups
2. Edit inbound rules for SSH (port 22)
3. Change source from `0.0.0.0/0` to `My IP`

### Keep Systems Updated

```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring

### Check Container Resource Usage
```bash
docker stats
```

### Check Disk Usage
```bash
# Overall disk usage
df -h

# Docker disk usage
docker system df
```

### Clean Up Unused Docker Resources
```bash
# Remove unused images, containers, volumes
docker system prune -a --volumes

# WARNING: This will delete stopped containers and unused images
```

---

## 💰 Cost Estimate (AWS Free Tier)

| Resource | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| EC2 t2.micro | FREE (12 months) | ~$8.50/month |
| EBS Storage (20 GB) | FREE (30 GB) | ~$2.00/month |
| Data Transfer Out | 15 GB/month free | $0.09/GB |
| **Total** | **$0/month** | **~$10-15/month** |

**Note**: All services (PostgreSQL, Redis, RabbitMQ) run in Docker, so no additional AWS service costs!

---

## ⚡ Performance Tuning

### For t2.micro (1 GB RAM):

**Reduce worker counts in docker-compose.prod.yml:**
```yaml
web:
  command: gunicorn volta.wsgi:application --bind 0.0.0.0:8000 --workers 2

celery_worker:
  command: celery -A volta worker --loglevel=info --concurrency=2
```

### For Larger Instances (t2.small, t2.medium):

Keep default settings or increase:
```yaml
web:
  command: gunicorn volta.wsgi:application --bind 0.0.0.0:8000 --workers 4

celery_worker:
  command: celery -A volta worker --loglevel=info --concurrency=8
```

---

## 🔐 HTTPS/SSL Upgrade

Currently, the application runs on HTTP (port 80).

**To upgrade to HTTPS**, see: **HTTPS_UPGRADE_GUIDE.md**

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production service configuration |
| `backend/.env.production` | Production environment variables (sensitive!) |
| `.env` | Docker Compose passwords (sensitive!) |
| `nginx/nginx.conf` | Nginx reverse proxy configuration |
| `deploy/deploy-ec2.sh` | Automated deployment script |
| `backups/` | Database backups |

**⚠️ NEVER commit `.env` or `.env.production` to Git!**

---

## 🆘 Getting Help

### Check Logs First
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Common Log Locations
- Django: `docker-compose logs web`
- Celery: `docker-compose logs celery_worker`
- PostgreSQL: `docker-compose logs db`
- Nginx: `docker-compose logs nginx`

### Still Stuck?

1. Check container status: `docker-compose -f docker-compose.prod.yml ps`
2. Check container health: `docker inspect volta_web_prod | grep Health`
3. SSH into container: `docker exec -it volta_web_prod bash`

---

## 🎯 Next Steps

1. ✅ Test CSV upload with sample file
2. ✅ Configure webhooks
3. ✅ Set up automated backups (cron job)
4. ✅ Upgrade to HTTPS (see HTTPS_UPGRADE_GUIDE.md)
5. ✅ Configure domain name (optional)
6. ✅ Set up monitoring (Prometheus/Grafana)

---

## 📝 Notes

- **Data Persistence**: All data is stored in Docker volumes and persists across container restarts
- **Automatic Restarts**: Containers automatically restart on failures or EC2 reboot
- **No External Dependencies**: Everything runs in Docker (no AWS RDS, ElastiCache, etc.)
- **Easy Scaling**: Upgrade EC2 instance type for more resources

---

**Deployment completed successfully? Access your app at `http://YOUR_EC2_IP/` 🎉**
