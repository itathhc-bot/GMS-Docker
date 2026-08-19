# Maintenance Runbook

## Daily Checks Checklist
- Check Horizon dashboard for failed jobs.
- Verify MinIO storage usage.
- Monitor application logs for critical errors.
- Check Grafana metrics for CPU/Memory spikes.

## Log Locations
- Laravel App: `storage/logs/laravel.log`
- NGINX: `/var/log/nginx/access.log` and `error.log`
- PHP-FPM: `/var/log/php-fpm/error.log`

## Common Error Resolution
- **500 Internal Server Error**: Check Laravel logs. Usually indicates a missing env variable or database issue.
- **WebSocket connection failed**: Ensure Reverb is running and NGINX proxy headers are correct.
- **Queue jobs not processing**: Restart Horizon (`php artisan horizon:terminate`).

## Database Maintenance
Periodically run optimize:
```bash
php artisan db:monitor
```

## Cache Clearing
```bash
php artisan optimize:clear
```
