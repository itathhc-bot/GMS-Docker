#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: $0 YYYY-MM-DD"
    exit 1
fi

DATE=$1
DB_BACKUP="/backups/db/$DATE.sql.gz"
STORAGE_BACKUP="/backups/storage/$DATE.tar.gz"

if [ ! -f "$DB_BACKUP" ] || [ ! -f "$STORAGE_BACKUP" ]; then
    echo "Backup files for $DATE not found!"
    exit 1
fi

read -p "Are you sure you want to restore from $DATE? This will overwrite current data. (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # 1. Restore Database
    gunzip -c "$DB_BACKUP" | docker-compose exec -T mariadb mysql -u root -proot garage_guardian
    
    # 2. Restore Storage
    # Stop minio first
    docker-compose stop minio
    tar -xzf "$STORAGE_BACKUP" -C /var/lib/docker/volumes/
    docker-compose start minio

    echo "Restore completed successfully."
fi
