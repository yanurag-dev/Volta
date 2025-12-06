#!/bin/bash

# View logs for all Volta services

echo "Viewing logs for all Volta services..."
echo "Press Ctrl+C to exit"
echo ""

docker-compose -f ../../docker-compose.prod.yml logs -f --tail=100
