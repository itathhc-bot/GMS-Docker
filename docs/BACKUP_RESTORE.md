# Backup & Restore Procedures

## Automated Backups
The system is configured to run automated backups via Laravel Scheduler daily at 02:00 AM using `spatie/laravel-backup`.

## Manual Backup
To manually trigger a backup:
```bash
php artisan backup:run
```
For database only:
```bash
php artisan backup:run --only-db
```

## Restore from Backup
1. Locate the backup zip file in your configured storage disk (e.g., MinIO).
2. Download and extract the backup.
3. Import the SQL dump:
```bash
mysql -u root -p garage_db < backup.sql
```
4. Restore files by copying the extracted directories to their respective locations in `storage/app`.

## Testing Backup Integrity
It is recommended to test backups monthly by restoring to a staging environment.

## Off-site Backups
Backups are automatically mirrored to AWS S3 standard storage as configured in `filesystems.php`.
