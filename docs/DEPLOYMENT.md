# Deployment Guide

## Hostinger VPS (Ubuntu 24.04)

### 1. Prerequisites
- Docker & Docker Compose installed.
- Git installed.
- UFW configured (allow ports 80, 443, 22).

### 2. DNS Setup
Point `techaura-projects.com` and `*.techaura-projects.com` (if needed) to your VPS IP address.

### 3. Clone Repository
```bash
git clone <repository_url> /var/www/garage-system
cd /var/www/garage-system
```

### 4. Configure .env
```bash
cp .env.example .env
nano .env
# Set APP_ENV=production, APP_DEBUG=false, and configure DB/Redis/MinIO secrets.
```

### 5. SSL Certificate Setup
Install certbot and generate certificates:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d techaura-projects.com
```

### 6. Start Production Environment
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 7. Run Migrations & Seed
```bash
docker-compose -f docker-compose.prod.yml exec app php artisan migrate --seed
```

### 8. Backups
Set up a cron job for automated backups (refer to `BACKUP_RESTORE.md`).

### 9. Health Checks
Verify application is running by visiting `https://techaura-projects.com/api/health`.

### 10. Monitoring
Access Grafana dashboard configured at `monitoring.techaura-projects.com` (if set up) to check system metrics.
