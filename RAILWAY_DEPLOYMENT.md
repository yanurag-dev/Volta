# Railway Deployment Guide for Volta

This guide will walk you through deploying the Volta application to Railway.app.

## 📋 Prerequisites

- [Railway account](https://railway.app/) (free to start)
- Git repository pushed to GitHub/GitLab/Bitbucket
- Railway CLI (optional but recommended): `npm i -g @railway/cli`

---

## 🚀 Quick Start Deployment

### Step 1: Create a New Railway Project

1. Go to [Railway.app](https://railway.app/)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your repository
5. Select the `Volta` repository

### Step 2: Add Required Services

You need to deploy **5 services** in total:

#### Service 1: PostgreSQL Database
1. Click "+ New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create `DATABASE_URL` environment variable

#### Service 2: Redis Cache
1. Click "+ New" → "Database" → "Add Redis"
2. Railway will automatically create `REDIS_URL` environment variable

#### Service 3: RabbitMQ (Message Broker)
**Option A: Use CloudAMQP (Recommended)**
1. Go to [CloudAMQP](https://www.cloudamqp.com/)
2. Create a free "Little Lemur" plan (100 connections, free)
3. Copy the AMQP URL
4. Add to Railway as `CELERY_BROKER_URL`

**Option B: Use Railway RabbitMQ Template**
1. Click "+ New" → "Template" → Search "RabbitMQ"
2. Deploy the RabbitMQ template
3. Copy the connection URL to `CELERY_BROKER_URL`

---

### Step 3: Deploy Backend (Django Web Service)

1. Click "+ New" → "GitHub Repo" → Select your repo
2. Configure the service:
   - **Name**: `volta-web`
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty, uses Dockerfile)
   - **Start Command**: (leave empty, uses Dockerfile CMD)

3. Add environment variables (Settings → Variables):

```bash
# Django Core
DJANGO_SETTINGS_MODULE=volta.settings.production
SECRET_KEY=<generate-a-strong-random-key>
DEBUG=False
ALLOWED_HOSTS=.railway.app,.up.railway.app

# Database (auto-set by Railway PostgreSQL)
# DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-set by Railway Redis)
# REDIS_URL=${{Redis.REDIS_URL}}

# RabbitMQ (from CloudAMQP or RabbitMQ template)
CELERY_BROKER_URL=<your-rabbitmq-url>

# CORS - Update after deploying frontend
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app

# Admin User
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@volta.app
DJANGO_SUPERUSER_PASSWORD=<strong-password>

# File Upload
MAX_UPLOAD_SIZE=104857600

# Security
SECURE_SSL_REDIRECT=True
```

4. Add **Railway References** for DATABASE_URL and REDIS_URL:
   - Click on `DATABASE_URL` → Use reference: `${{Postgres.DATABASE_URL}}`
   - Click on `REDIS_URL` → Use reference: `${{Redis.REDIS_URL}}`

5. Click "Deploy"

---

### Step 4: Deploy Celery Worker

1. Click "+ New" → "GitHub Repo" → Select your repo again
2. Configure the service:
   - **Name**: `volta-celery-worker`
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty, uses Dockerfile)
   - **Custom Start Command**: 
   ```bash
   celery -A volta worker --loglevel=info --concurrency=4
   ```

3. Add the **same environment variables** as the web service (copy from volta-web)

4. Click "Deploy"

---

### Step 5: Deploy Frontend (React App)

1. Click "+ New" → "GitHub Repo" → Select your repo
2. Configure the service:
   - **Name**: `volta-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: (leave empty, uses Dockerfile)

3. Add environment variables:

```bash
# Backend API URL - Update with your backend Railway URL
VITE_API_URL=https://your-backend-service.railway.app/api
```

4. Click "Deploy"

5. After deployment, go to "Settings" → "Networking":
   - Click "Generate Domain" to get a public URL
   - Copy this URL

6. **Update Backend CORS**: Go back to `volta-web` service:
   - Update `CORS_ALLOWED_ORIGINS` with your frontend URL
   - Redeploy the backend

---

## 🔧 Service Configuration Summary

| Service | Root Directory | Start Command | Port |
|---------|---------------|---------------|------|
| **PostgreSQL** | (managed) | - | 5432 |
| **Redis** | (managed) | - | 6379 |
| **RabbitMQ** | (external/template) | - | 5672 |
| **Web (Django)** | `backend` | `gunicorn volta.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120` | 8000 |
| **Celery Worker** | `backend` | `celery -A volta worker --loglevel=info --concurrency=4` | - |
| **Frontend (React)** | `frontend` | `nginx -g "daemon off;"` | 80 |

---

## 🌐 Environment Variables Reference

### Required for Web & Celery Worker

```bash
# Django
DJANGO_SETTINGS_MODULE=volta.settings.production
SECRET_KEY=<generate-strong-key>
DEBUG=False
ALLOWED_HOSTS=.railway.app,.up.railway.app

# Database (Railway reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Railway reference)
REDIS_URL=${{Redis.REDIS_URL}}

# RabbitMQ
CELERY_BROKER_URL=<your-rabbitmq-url>

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app

# Admin
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@volta.app
DJANGO_SUPERUSER_PASSWORD=<strong-password>

# Uploads
MAX_UPLOAD_SIZE=104857600

# Security
SECURE_SSL_REDIRECT=True
```

### Required for Frontend

```bash
VITE_API_URL=https://your-backend-service.railway.app/api
```

---

## 📊 Generate SECRET_KEY

Use this Python command to generate a secure secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Or use online generator: https://djecrety.ir/

---

## 🔍 Monitoring & Debugging

### View Logs

**Web Service:**
```bash
railway logs --service volta-web
```

**Celery Worker:**
```bash
railway logs --service volta-celery-worker
```

### Check Service Status

1. Go to Railway dashboard
2. Click on each service to see:
   - Deployment status
   - Logs
   - Metrics (CPU, Memory, Network)

### Common Issues

**1. Database Connection Error**
- Ensure `DATABASE_URL` is set correctly using Railway reference
- Check PostgreSQL service is running

**2. Celery Worker Not Processing Tasks**
- Verify `CELERY_BROKER_URL` is correct
- Check RabbitMQ service is running
- View celery worker logs for errors

**3. Frontend Can't Connect to Backend**
- Check `VITE_API_URL` is set correctly
- Verify backend CORS settings include frontend URL
- Ensure backend service is running and accessible

**4. Static Files Not Loading**
- Check `collectstatic` ran successfully in logs
- Verify WhiteNoise is configured correctly

---

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch.

### Manual Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Deploy specific service
railway up --service volta-web
```

---

## 💰 Cost Estimate

Railway pricing (as of 2024):

| Service | Usage | Cost |
|---------|-------|------|
| PostgreSQL | Shared | $5/month |
| Redis | Shared | $5/month |
| Web Service | 512MB RAM | ~$5/month |
| Celery Worker | 512MB RAM | ~$5/month |
| Frontend | Static | ~$5/month |
| CloudAMQP | Little Lemur | Free |

**Total: ~$25-30/month** (with $5 free credit monthly = ~$20-25/month)

### Free Tier Alternative

Use Railway's $5/month free credit:
- Deploy only Web + PostgreSQL + Redis initially
- Use Celery with Redis as broker (instead of RabbitMQ)
- Deploy frontend to Vercel/Netlify (free)
- **Total: Within free tier ($5 credit covers it)**

---

## 🔐 Security Checklist

- [ ] Change `DJANGO_SUPERUSER_PASSWORD` from default
- [ ] Set strong `SECRET_KEY` (50+ random characters)
- [ ] Set `DEBUG=False` in production
- [ ] Configure `ALLOWED_HOSTS` correctly
- [ ] Set up proper `CORS_ALLOWED_ORIGINS`
- [ ] Enable `SECURE_SSL_REDIRECT=True`
- [ ] Review and rotate RabbitMQ credentials
- [ ] Set up database backups (Railway Pro plan)

---

## 📈 Scaling (Optional)

### Vertical Scaling
1. Go to service settings
2. Increase memory/CPU allocation
3. Redeploy

### Horizontal Scaling (Celery Workers)
1. Duplicate the celery worker service
2. Increase `--concurrency` flag
3. Add more worker instances

### Database Scaling
1. Upgrade PostgreSQL to Railway Pro plan
2. Enable connection pooling
3. Add read replicas (for high traffic)

---

## 🎯 Post-Deployment Testing

1. **Test Web Service**: Visit `https://your-backend.railway.app/admin`
2. **Test API**: `curl https://your-backend.railway.app/api/products/`
3. **Test Frontend**: Visit `https://your-frontend.railway.app`
4. **Test Upload**: Upload a CSV file and watch progress
5. **Test Webhooks**: Configure a webhook and trigger an event
6. **Test Celery**: Upload a large CSV (500k rows) to verify worker processing

---

## 🆘 Support Resources

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- CloudAMQP Docs: https://www.cloudamqp.com/docs/
- Django Deployment: https://docs.djangoproject.com/en/5.0/howto/deployment/

---

## 🔄 Rollback Strategy

If deployment fails:

1. Go to Railway dashboard
2. Click on the service
3. Click "Deployments"
4. Find the last successful deployment
5. Click "Redeploy"

Or via CLI:
```bash
railway rollback
```

---

## 📝 Quick Deployment Checklist

- [ ] Create Railway account
- [ ] Add PostgreSQL service
- [ ] Add Redis service
- [ ] Add RabbitMQ (CloudAMQP or template)
- [ ] Deploy backend (volta-web)
- [ ] Configure environment variables
- [ ] Deploy celery worker
- [ ] Deploy frontend
- [ ] Update CORS settings
- [ ] Generate domain for frontend
- [ ] Test all functionality
- [ ] Set up monitoring/alerts

---

**Congratulations! 🎉** Your Volta application is now live on Railway!

**Next Steps:**
- Set up custom domain (Railway settings)
- Configure monitoring (Railway provides basic metrics)
- Set up database backups
- Configure alerts for service failures
- Review and optimize costs
