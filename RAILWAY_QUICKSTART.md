# 🚂 Railway Deployment Quick Start

**Deploy Volta to Railway in 15 minutes!**

## 🎯 Overview

You'll deploy **5 services**:
1. PostgreSQL (managed database)
2. Redis (managed cache)
3. RabbitMQ (message broker via CloudAMQP)
4. Django Backend (web + API)
5. Celery Worker (background tasks)
6. React Frontend (optional - can deploy to Vercel/Netlify instead)

---

## 🚀 Step-by-Step (Fast Track)

### 1️⃣ Prepare (2 min)

```bash
# Generate Django SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Save this key - you'll need it!
```

### 2️⃣ Create Railway Project (2 min)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Connect your GitHub repository
4. Select the `Volta` repository

### 3️⃣ Add Databases (1 min)

**Add PostgreSQL:**
- Click "+ New" → "Database" → "PostgreSQL"

**Add Redis:**
- Click "+ New" → "Database" → "Redis"

### 4️⃣ Add RabbitMQ (3 min)

**CloudAMQP (Recommended):**
1. Go to [cloudamqp.com](https://www.cloudamqp.com/)
2. Sign up (free)
3. Create "Little Lemur" instance (100 connections, free forever)
4. Copy the AMQP URL (looks like `amqps://user:pass@host/vhost`)

### 5️⃣ Deploy Backend (4 min)

1. In Railway: "+ New" → "GitHub Repo" → Select `Volta`
2. Name: `volta-web`
3. Settings → Root Directory: `backend`
4. Settings → Variables → Add these:

```bash
DJANGO_SETTINGS_MODULE=volta.settings.production
SECRET_KEY=<paste-key-from-step-1>
DEBUG=False
ALLOWED_HOSTS=.railway.app,.up.railway.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=<paste-cloudamqp-url>
CORS_ALLOWED_ORIGINS=https://localhost:3000
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@volta.app
DJANGO_SUPERUSER_PASSWORD=ChangeMe123!
MAX_UPLOAD_SIZE=104857600
SECURE_SSL_REDIRECT=True
```

5. Click "Deploy"
6. Settings → Networking → "Generate Domain"
7. Copy the URL (e.g., `volta-web-production.railway.app`)

### 6️⃣ Deploy Celery Worker (2 min)

1. In Railway: "+ New" → "GitHub Repo" → Select `Volta`
2. Name: `volta-celery-worker`
3. Settings → Root Directory: `backend`
4. Settings → Custom Start Command:
```bash
celery -A volta worker --loglevel=info --concurrency=4
```
5. Settings → Variables → **Copy all variables from volta-web**
6. Click "Deploy"

### 7️⃣ Deploy Frontend (OPTIONAL - 3 min)

**Option A: Deploy to Railway**
1. In Railway: "+ New" → "GitHub Repo" → Select `Volta`
2. Name: `volta-frontend`
3. Settings → Root Directory: `frontend`
4. Settings → Variables:
```bash
VITE_API_URL=https://volta-web-production.railway.app/api
```
5. Deploy
6. Generate domain
7. **Go back to volta-web** → Update `CORS_ALLOWED_ORIGINS` with frontend URL
8. Redeploy volta-web

**Option B: Deploy to Vercel (Free)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod

# When asked for build command: npm run build
# When asked for output dir: dist
```

---

## ✅ Verify Deployment

### Test Backend
```bash
# Visit admin panel
https://your-backend.railway.app/admin

# Login with credentials from DJANGO_SUPERUSER_USERNAME/PASSWORD

# Test API
curl https://your-backend.railway.app/api/products/
```

### Test Frontend
```bash
# Visit frontend URL
https://your-frontend.railway.app

# Try uploading a CSV file
# Check if progress bar updates
```

### Check Celery Worker
```bash
# In Railway dashboard → volta-celery-worker → Logs
# You should see: "celery@worker ready"
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check logs: Railway dashboard → volta-web → Logs
- Common issue: DATABASE_URL not set → Use reference `${{Postgres.DATABASE_URL}}`
- Common issue: Invalid SECRET_KEY → Regenerate and update

### Celery worker not processing
- Check RabbitMQ URL is correct
- Verify CloudAMQP instance is running
- Check worker logs for connection errors

### Frontend can't connect to backend
- Update `VITE_API_URL` with correct backend URL
- Update backend `CORS_ALLOWED_ORIGINS` with frontend URL
- Redeploy both services after changes

### CORS errors
- Make sure frontend URL is in backend `CORS_ALLOWED_ORIGINS`
- Include `https://` in the URL
- Redeploy backend after updating CORS

---

## 💰 Cost Breakdown

| Service | Cost |
|---------|------|
| PostgreSQL | $5/month |
| Redis | $5/month |
| Backend (Web) | ~$5/month |
| Celery Worker | ~$5/month |
| Frontend (Railway) | ~$5/month |
| CloudAMQP | **FREE** |
| **Total** | **~$25/month** |
| Railway credit | -$5/month |
| **Actual cost** | **~$20/month** |

**Budget Alternative:**
- Deploy frontend to Vercel (free)
- Use smaller Railway instances
- **Total: ~$15/month**

---

## 🎓 Next Steps

- [ ] Set up custom domain
- [ ] Configure database backups
- [ ] Set up monitoring/alerts  
- [ ] Change admin password
- [ ] Review security settings
- [ ] Test with large CSV files (500k rows)

---

## 📚 Resources

- **Full deployment guide**: See `RAILWAY_DEPLOYMENT.md`
- **Environment variables**: See `DEPLOYMENT_ENV_VARIABLES.txt`
- **Railway docs**: https://docs.railway.app
- **Support**: https://discord.gg/railway

---

**🎉 Done! Your app is live!**

Frontend: `https://your-frontend.railway.app`  
Backend: `https://your-backend.railway.app`  
Admin: `https://your-backend.railway.app/admin`
