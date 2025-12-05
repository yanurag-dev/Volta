from .base import *

DEBUG = True

# Development-specific settings
INSTALLED_APPS += [
    'django_extensions',
]

# Allow all hosts in development
ALLOWED_HOSTS = ['*']

# Console email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
