#!/bin/bash

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Backup MongoDB
mongodump --out "$BACKUP_DIR/db_$TIMESTAMP" --username admin --password password --authenticationDatabase admin
tar -czf "$BACKUP_DIR/db_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "db_$TIMESTAMP"
rm -rf "$BACKUP_DIR/db_$TIMESTAMP"

# Backup images
tar -czf "$BACKUP_DIR/images_$TIMESTAMP.tar.gz" -C /app uploads

# Clean old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed"
