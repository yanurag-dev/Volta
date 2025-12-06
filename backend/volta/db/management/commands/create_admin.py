"""
Management command to create admin user automatically.
"""

import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create admin user if it does not exist'

    def handle(self, *args, **options):
        User = get_user_model()

        # Get credentials from environment variables
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@volta.local')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin')

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS('Admin user created successfully!'))
            self.stdout.write(self.style.WARNING(f'Username: {username}'))
            self.stdout.write(self.style.WARNING(f'Email: {email}'))
            # Don't print password in logs for security
        else:
            self.stdout.write(self.style.SUCCESS(f'Admin user "{username}" already exists.'))
