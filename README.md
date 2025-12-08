# Volta - Product Importer System

A highly scalable web application for importing 500,000+ products from CSV files into PostgreSQL, with real-time progress tracking and webhook notifications.

## 🌐 Live Demo

**Deployed on AWS EC2**: [http://3.82.100.106](http://3.82.100.106)

- **Frontend**: [http://3.82.100.106](http://3.82.100.106)
- **API**: [http://3.82.100.106/api](http://3.82.100.106/api)
- **Django Admin**: [http://3.82.100.106/admin](http://3.82.100.106/admin)
  - Username: `admin`
  - Password: `Admin@123aws`

---

## 📋 Features

- **Bulk CSV Import**: Upload and process large CSV files (500k+ records) with optimized chunked processing
- **Real-Time Progress**: Server-Sent Events (SSE) for live upload progress tracking
- **Product Management**: Full CRUD operations with filtering, searching, and pagination
- **Webhook System**: Configurable webhooks for product and upload events with automatic retries
- **Async Processing**: Celery-based task queue with RabbitMQ for reliable job processing
- **High Performance**: Bulk operations, database indexing, and Redis caching for optimal performance

---

## 🏗️ Architecture

<img width="2601" height="2263" alt="Volta Architecture Diagram" src="https://github.com/user-attachments/assets/55e98178-8573-4f69-9485-28ee2d0b46c6" />

## 🛠 Tech Stack

### Backend

- **Framework**: Django 5.0 + Django REST Framework
- **Database**: PostgreSQL 16 with optimized indexes
- **Task Queue**: Celery with RabbitMQ broker
- **Cache**: Redis for result backend and progress tracking
- **Web Server**: Gunicorn with Whitenoise

### Frontend

- **Framework**: React 19 with Vite
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios

### DevOps

- **Containerization**: Docker + Docker Compose
- **Deployment**: AWS EC2 with Docker Compose
- **Reverse Proxy**: Nginx

---

## ⚡ Prerequisites

- Docker and Docker Compose
- Git

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Volta.git
cd Volta
```

### 2. Start Services with Docker Compose

**Note**: No `.env` file needed! The project uses sensible defaults for local development.

```bash
docker-compose up --build
```

**Optional**: Create a `backend/.env` file to override defaults:

```env
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
DATABASE_URL=postgresql://volta_user:volta_password@db:5432/volta
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=amqp://volta:volta_password@rabbitmq:5672//
```

### 3. What Gets Started

Docker Compose will start all services:

- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **RabbitMQ** (ports 5672, 15672 for management UI)
- **Django Web App** (port 8000)
- **Celery Worker** (2 concurrent workers)
- **Celery Beat** (for scheduled tasks)
- **React Frontend** (port 3000)

**Database migrations run automatically on startup!**

### 4. Create Admin User (First Time Only)

The admin user is created automatically on first startup.

**Default credentials for local development:**
- Username: `admin`
- Password: `admin`

**Production (EC2) credentials:**
- Username: `admin`
- Password: `Admin@123aws`

**To create additional users:**

```bash
docker-compose exec web python manage.py createsuperuser
```

**To customize admin credentials locally**, set environment variables:

```bash
export DJANGO_SUPERUSER_USERNAME=yourusername
export DJANGO_SUPERUSER_PASSWORD=yourpassword
docker-compose up --build
```

### 5. Access the Application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000/api>
- **Django Admin**: <http://localhost:8000/admin>
  - Username: `admin`
  - Password: `Admin@123aws`
- **RabbitMQ Management**: <http://localhost:15672> (user: `volta`, pass: `volta_password`)

---

## 💻 Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Running Celery Worker Locally

```bash
cd backend
celery -A volta worker --loglevel=info --concurrency=4
```

### Running Celery Beat Locally

```bash
cd backend
celery -A volta beat --loglevel=info
```

---

## 📚 API Documentation

### Product Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/` | List products (paginated, filtered) |
| POST | `/api/products/` | Create single product |
| GET | `/api/products/{id}/` | Retrieve product details |
| PUT | `/api/products/{id}/` | Update product |
| PATCH | `/api/products/{id}/` | Partial update |
| DELETE | `/api/products/{id}/` | Delete product |
| DELETE | `/api/products/bulk-delete/` | Delete all products |

**Query Parameters**:

- `?search=keyword` - Search in SKU, name, description
- `?active=true` - Filter by active status
- `?ordering=-created_at` - Sort by field
- `?page=2&page_size=100` - Pagination

### Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/` | Upload CSV file |
| GET | `/api/upload/{task_id}/` | Get upload status |
| GET | `/api/upload/{task_id}/stream/` | SSE progress stream |
| GET | `/api/upload/history/` | List recent uploads |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks/` | List webhooks |
| POST | `/api/webhooks/` | Create webhook |
| GET | `/api/webhooks/{id}/` | Retrieve webhook |
| PUT | `/api/webhooks/{id}/` | Update webhook |
| DELETE | `/api/webhooks/{id}/` | Delete webhook |
| POST | `/api/webhooks/{id}/test/` | Test webhook |

---

## 📄 CSV Upload Format

Your CSV file should have the following columns:

```csv
sku,name,description,active
PROD-001,Product Name,Product description here,true
PROD-002,Another Product,Description text,false
```

**Required Fields**:

- `sku` - Unique product identifier (case-insensitive)
- `name` - Product name

**Optional Fields**:

- `description` - Product description
- `active` - Boolean (true/false, defaults to true)

### How CSV Processing Works

1. **Upload**: File is saved and queued to Celery
2. **Async Processing**: Celery worker processes the file in background
3. **Deduplication**: Duplicate SKUs are automatically handled (last entry wins)
4. **Bulk Import**: Uses PostgreSQL UPSERT for maximum speed (50,000 products per batch)
5. **Progress Tracking**: Real-time updates via Server-Sent Events (SSE)
6. **Webhooks**: Notifications sent on completion

**Processing Speed**: ~250,000 products/minute with default configuration

---

## 🎯 Performance Benchmarks

| Metric | Performance |
|--------|-------------|
| Upload 500k products | **< 2 minutes per file** ⚡ |
| Concurrent uploads | **Up to 2 simultaneous files** (optimized for 4GB RAM) |
| CSV processing | Async via Celery + PostgreSQL UPSERT |
| Processing speed | ~250,000 products/minute |
| API response (list products) | < 100ms (with pagination) |
| Progress update frequency | Real-time (1-2 seconds) via SSE |
| Database query time | < 50ms (with indexes) |
| Webhook delivery | < 3 seconds (with retries) |

---

## 💻 Resource Requirements

### Minimum (Development)
- **RAM**: 2 GB
- **CPU**: 2 cores
- **Storage**: 5 GB

### Recommended (Production)
- **RAM**: 4 GB (current EC2 configuration)
- **CPU**: 2-4 cores
- **Storage**: 20 GB
- **Network**: Standard bandwidth

### Production Configuration (4GB RAM)
- **Gunicorn Workers**: 2 (Django API)
- **Celery Workers**: 2 (CSV processing)
- **Concurrent CSV Uploads**: Up to 2 simultaneous files
- **Database Connections**: Pooled with max 20 connections

### Scaling Recommendations
- **8GB RAM**: Increase to 4 Celery workers for 4 concurrent uploads
- **16GB RAM**: Increase to 8 Celery workers for 8 concurrent uploads
- **High Traffic**: Add load balancer + multiple app instances

---

## 🗄️ Database Optimization

The system includes the following database optimizations:

1. **Case-insensitive unique SKU index**
2. **Active status index** for filtering
3. **Composite indexes** for common queries
4. **Trigram indexes** for full-text search (name field)

---

## 🔔 Webhook Events

The system supports the following webhook events:

- `product.created` - Fired when a product is created
- `product.updated` - Fired when a product is updated
- `product.deleted` - Fired when a product is deleted
- `upload.completed` - Fired when CSV upload completes

---

## 🔧 Environment Variables

### Django Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | - |
| `DEBUG` | Enable debug mode | `False` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins | - |

### Database

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | - |

### Cache & Queue

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | - |
| `CELERY_BROKER_URL` | RabbitMQ/Redis broker URL | - |

### File Upload

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_UPLOAD_SIZE` | Max file size in bytes | `104857600` (100MB) |

---

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
python manage.py test
```

### Run Frontend Tests

```bash
cd frontend
npm run test
```

---

## 📁 Project Structure

```text
Volta/
├── backend/
│   ├── volta/              # Main Django project
│   │   ├── settings/       # Split settings (base, dev, prod)
│   │   ├── api/            # REST API endpoints
│   │   │   ├── views/      # API views (products, uploads, webhooks)
│   │   │   └── serializers/ # DRF serializers
│   │   ├── db/             # Database models and admin
│   │   │   ├── models/     # Models (Product, UploadTask, Webhook)
│   │   │   ├── migrations/ # Database migrations
│   │   │   ├── management/ # Custom management commands
│   │   │   └── admin.py    # Django admin configuration
│   │   ├── bg_tasks/       # Celery background tasks
│   │   │   ├── csv_tasks.py    # CSV processing tasks
│   │   │   └── webhook_tasks.py # Webhook delivery tasks
│   │   ├── utils/          # Utility functions
│   │   ├── celery.py       # Celery configuration
│   │   ├── urls.py         # URL routing
│   │   ├── wsgi.py         # WSGI application
│   │   └── asgi.py         # ASGI application
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Products/   # Product management components
│   │   │   ├── Upload/     # CSV upload components
│   │   │   ├── Webhooks/   # Webhook management components
│   │   │   └── common/     # Shared components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # React context providers
│   │   └── App.jsx
│   ├── package.json
│   ├── Dockerfile.dev
│   └── Dockerfile.prod
├── deploy/                 # Deployment scripts
│   ├── deploy-ec2.sh
│   └── scripts/
├── nginx/                  # Nginx configuration
├── docker-compose.yml
└── README.md
```

---

## 🔍 Troubleshooting

### Docker Issues

**Services not starting:**

```bash
docker-compose down -v
docker-compose up --build
```

**Check service logs:**

```bash
docker-compose logs web
docker-compose logs celery_worker
docker-compose logs rabbitmq
```

### Database Issues

**Reset database:**

```bash
docker-compose down -v
docker-compose up -d db
docker-compose exec web python manage.py migrate
```

### Celery Issues

**Check RabbitMQ queues:**

Visit <http://localhost:15672> and check the "Queues" tab

**Purge all tasks:**

```bash
docker-compose exec celery_worker celery -A volta purge
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 💬 Support

For issues and questions:

- Open an issue on GitHub
- Check the CLAUDE.md file for detailed architecture documentation

---

## 🗺️ Roadmap

- [ ] Excel file support (.xlsx)
- [ ] Export products to CSV
- [ ] Product categories/tags
- [ ] Duplicate detection during upload
- [ ] Scheduled imports (cron jobs)
- [ ] Admin dashboard analytics
- [ ] Webhook delivery logs
- [ ] Multi-tenant support
- [ ] GraphQL API
- [ ] Elasticsearch for full-text search

---

## 🙏 Acknowledgments

- Built with Django REST Framework
- UI powered by React and Vite
- Task processing by Celery
- Real-time updates via Server-Sent Events
