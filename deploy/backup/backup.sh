#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups"
DB_DIR="$BACKUP_DIR/db"
STORAGE_DIR="$BACKUP_DIR/storage"

mkdir -p $DB_DIR
mkdir -p $STORAGE_DIR

# 1. Database backup
docker-compose exec -T mariadb mysqldump -u root -proot garage_guardian | gzip > "$DB_DIR/$DATE.sql.gz"

# 2. Storage backup (MinIO)
tar -czf "$STORAGE_DIR/$DATE.tar.gz" -C /var/lib/docker/volumes/ garage-guardian_minio_data/

# 3. Clean up older than 30 days
find $DB_DIR -type f -name "*.sql.gz" -mtime +30 -delete
find $STORAGE_DIR -type f -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed successfully for $DATE"
