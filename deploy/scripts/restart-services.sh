#!/bin/bash

# Restart all Volta services

echo "Restarting all Volta services..."

docker-compose -f ../../docker-compose.prod.yml restart

echo ""
echo "Services restarted successfully!"
echo "Check status with: docker-compose -f docker-compose.prod.yml ps"
