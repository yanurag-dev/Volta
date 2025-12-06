# Stage 1: Builder - Install dependencies
FROM python:3.11-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt


# Stage 2: Runtime - Final lightweight image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"

# Set work directory
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy entrypoint script and project files
COPY entrypoint.sh /app/entrypoint.sh
COPY . /app/

# Create media and static directories, set permissions, and make entrypoint executable
# All in one RUN command to optimize layers
RUN mkdir -p /app/media/uploads /app/staticfiles && \
    chmod +x /app/entrypoint.sh && \
    useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Use entrypoint for migrations and admin creation
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["gunicorn", "volta.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
