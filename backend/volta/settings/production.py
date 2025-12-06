from .base import *
from decouple import config

DEBUG = False

# Security settings for production (HTTP deployment)
# Note: These are configured for HTTP-only deployment
# When upgrading to HTTPS, update these settings in .env.production:
# - SECURE_SSL_REDIRECT=True
# - SESSION_COOKIE_SECURE=True
# - CSRF_COOKIE_SECURE=True
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=False, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS settings (disabled for HTTP deployment)
# Enable these when upgrading to HTTPS
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)

# Trust proxy headers (for Nginx reverse proxy)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'http')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
