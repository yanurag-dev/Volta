#!/bin/bash

# Backup PostgreSQL database

BACKUP_DIR="../../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/volta_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "Creating database backup..."

# Run pg_dump inside the PostgreSQL container
docker exec volta_db_prod pg_dump -U volta_user volta > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully: $BACKUP_FILE"

    # Compress the backup
    gzip $BACKUP_FILE
    echo "✓ Backup compressed: ${BACKUP_FILE}.gz"

    # Show backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "  Backup size: $BACKUP_SIZE"
else
    echo "✗ Backup failed!"
    exit 1
fi

# Keep only the last 7 backups
echo ""
echo "Cleaning up old backups (keeping last 7)..."
cd $BACKUP_DIR
ls -t volta_backup_*.sql.gz | tail -n +8 | xargs -r rm
echo "✓ Cleanup complete!"

echo ""
echo "Available backups:"
ls -lh volta_backup_*.sql.gz
