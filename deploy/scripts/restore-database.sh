#!/bin/bash

# Restore PostgreSQL database from backup

BACKUP_DIR="../../backups"

echo "Available backups:"
echo ""
ls -lh $BACKUP_DIR/volta_backup_*.sql.gz 2>/dev/null

if [ $? -ne 0 ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 1
fi

echo ""
read -p "Enter backup filename to restore (e.g., volta_backup_20250101_120000.sql.gz): " BACKUP_FILE

BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$BACKUP_PATH" ]; then
    echo "Error: Backup file not found: $BACKUP_PATH"
    exit 1
fi

echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Restoring database from $BACKUP_FILE..."

# Decompress and restore
gunzip -c $BACKUP_PATH | docker exec -i volta_db_prod psql -U volta_user -d volta

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully!"
else
    echo "✗ Restore failed!"
    exit 1
fi

echo ""
echo "Restarting services to apply changes..."
docker-compose -f ../../docker-compose.prod.yml restart web celery_worker

echo "✓ Restore complete!"
