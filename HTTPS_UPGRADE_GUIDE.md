# HTTPS/SSL Upgrade Guide for Volta

This guide explains how to upgrade your HTTP deployment to HTTPS with SSL certificates.

---

## 🔐 Overview

Your current deployment runs on HTTP (port 80). This guide will help you add HTTPS (port 443) using:

**Option 1**: Let's Encrypt (Free, Auto-Renewing) - **Recommended**
**Option 2**: Self-Signed Certificates (For testing only)

---

## Prerequisites

Before upgrading to HTTPS, you need:

1. ✅ A **domain name** pointing to your EC2 IP
   - HTTPS requires a domain (not just an IP address)
   - Examples: volta.yourdomain.com, app.example.com
   - Set up an A record in your DNS provider pointing to your EC2 IP

2. ✅ **Port 443 open** in AWS Security Group
   - Add inbound rule: HTTPS (TCP port 443) from 0.0.0.0/0

---

## Option 1: Let's Encrypt (Recommended)

Let's Encrypt provides free SSL certificates that auto-renew every 90 days.

### Step 1: Update Security Group

Add port 443 to your EC2 security group:
- Go to AWS Console → EC2 → Security Groups
- Add inbound rule: **HTTPS, TCP, 443, 0.0.0.0/0**

### Step 2: Set Up Domain

Point your domain to EC2:
1. Go to your domain registrar (GoDaddy, Namecheap, Route 53, etc.)
2. Add an **A Record**:
   - Name: `@` or `volta` (for subdomain)
   - Value: Your EC2 Public IP
   - TTL: 300 (5 minutes)

Wait 5-10 minutes for DNS propagation.

**Verify DNS:**
```bash
nslookup yourdomain.com
# Should return your EC2 IP
```

### Step 3: Install Certbot

SSH into your EC2 instance:

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Step 4: Stop Nginx Container

```bash
cd ~/Volta
docker-compose -f docker-compose.prod.yml stop nginx
```

### Step 5: Generate SSL Certificate

```bash
# Replace yourdomain.com with your actual domain
sudo certbot certonly --standalone -d yourdomain.com

# Follow the prompts:
# - Enter email address (for renewal notifications)
# - Agree to terms of service
# - Optionally share email with EFF
```

**Certificates will be saved to:**
- Certificate: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

### Step 6: Update Nginx Configuration

Edit `nginx/nginx.conf`:

```nginx
# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Django API
    location /api/ {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Static files
    location /static/ {
        alias /usr/share/nginx/html/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /usr/share/nginx/html/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # SSE
    location /events/ {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }

    # React Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# HTTP to HTTPS Redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### Step 7: Update docker-compose.prod.yml

Mount SSL certificates in Nginx container:

```yaml
nginx:
  image: nginx:alpine
  container_name: volta_nginx_prod
  ports:
    - "80:80"
    - "443:443"  # Add HTTPS port
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - static_files:/usr/share/nginx/html/static:ro
    - media_files:/usr/share/nginx/html/media:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Mount SSL certificates
  depends_on:
    - web
    - frontend
  restart: unless-stopped
  networks:
    - volta_network
```

### Step 8: Update Django Settings

Edit `backend/.env.production`:

```env
# Update CORS to use HTTPS
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Update ALLOWED_HOSTS
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,YOUR_EC2_IP

# Enable SSL security settings
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

Update `backend/volta/settings/production.py` (if using SECURE_PROXY_SSL_HEADER):

```python
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

### Step 9: Restart Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 10: Test HTTPS

Visit: `https://yourdomain.com`

**Check SSL certificate:**
```bash
curl -I https://yourdomain.com
```

### Step 11: Set Up Auto-Renewal

Certbot certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Set up cron job for auto-renewal
sudo crontab -e

# Add this line (runs twice daily at 3am and 3pm):
0 3,15 * * * certbot renew --quiet --post-hook "docker-compose -f /home/ubuntu/Volta/docker-compose.prod.yml restart nginx"
```

---

## Option 2: Self-Signed Certificate (Testing Only)

⚠️ **Not recommended for production** - browsers will show security warnings.

### Step 1: Generate Self-Signed Certificate

```bash
# Create directory for certificates
mkdir -p ~/Volta/nginx/ssl

# Generate certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/Volta/nginx/ssl/selfsigned.key \
  -out ~/Volta/nginx/ssl/selfsigned.crt

# You'll be prompted for certificate details:
# - Country: US
# - State: California
# - City: San Francisco
# - Organization: Your Company
# - Common Name: YOUR_EC2_IP (important!)
# - Email: your@email.com

# Set permissions
sudo chmod 600 ~/Volta/nginx/ssl/selfsigned.key
sudo chmod 644 ~/Volta/nginx/ssl/selfsigned.crt
```

### Step 2: Update Nginx Configuration

Use the self-signed certificates in `nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # ... rest of configuration
}
```

### Step 3: Mount Certificates in Docker

Update `docker-compose.prod.yml`:

```yaml
nginx:
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl:ro
    # ... other volumes
```

### Step 4: Restart Services

```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

### Step 5: Access with HTTPS

Visit: `https://YOUR_EC2_IP`

**You'll see a browser warning** - click "Advanced" → "Proceed to site" to bypass.

---

## Troubleshooting

### Certificate Errors

**Check certificate files exist:**
```bash
sudo ls -la /etc/letsencrypt/live/yourdomain.com/
```

**Test Nginx configuration:**
```bash
docker run --rm -v $(pwd)/nginx:/etc/nginx nginx:alpine nginx -t
```

### Domain Not Resolving

**Check DNS:**
```bash
nslookup yourdomain.com
dig yourdomain.com
```

### Port 443 Not Accessible

**Check security group** in AWS Console:
- EC2 → Security Groups
- Verify HTTPS (port 443) is open

**Check if Nginx is listening:**
```bash
docker-compose -f docker-compose.prod.yml logs nginx | grep 443
```

### Mixed Content Warnings

If your site loads but some resources fail:

**Update frontend `.env`:**
```env
VITE_API_URL=https://yourdomain.com/api
```

**Rebuild frontend:**
```bash
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d
```

---

## Security Best Practices

1. ✅ Use Let's Encrypt (not self-signed) for production
2. ✅ Enable HSTS after SSL is working
3. ✅ Keep certificates auto-renewed
4. ✅ Use strong cipher suites (TLS 1.2+)
5. ✅ Enable HTTP/2 for better performance
6. ✅ Redirect all HTTP to HTTPS

---

## SSL Certificate Monitoring

**Check certificate expiry:**
```bash
sudo certbot certificates
```

**Manual renewal:**
```bash
sudo certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## Cost

- **Let's Encrypt**: FREE ✅
- **Self-Signed**: FREE ✅
- **Commercial SSL** (optional): $10-100/year

---

## Next Steps After HTTPS

1. ✅ Submit site to [SSL Labs](https://www.ssllabs.com/ssltest/) for grade
2. ✅ Enable HSTS Preload at [hstspreload.org](https://hstspreload.org/)
3. ✅ Configure CSP (Content Security Policy) for extra security
4. ✅ Set up CloudFlare for CDN and DDoS protection (optional)

---

**Questions? Check the main EC2_DEPLOYMENT_GUIDE.md or open an issue!**
