##############################################################################
#  Makefile — Garage Guardian
#  Microservices Docker stack management
##############################################################################

.PHONY: help \
        setup setup-dev setup-prod \
        dev dev-full prod down restart \
        build build-backend build-frontend build-horizon build-reverb \
        build-scheduler build-mariadb build-redis build-tesseract build-nginx \
        fresh migrate seed rollback \
        test test-unit test-feature \
        shell shell-backend shell-frontend shell-mariadb shell-redis shell-horizon \
        logs logs-backend logs-frontend logs-nginx logs-horizon logs-reverb logs-scheduler \
        artisan key \
        horizon-status horizon-pause horizon-resume horizon-terminate \
        npm-install npm-build npm-dev \
        cache-clear queue-restart \
        backup restore \
        lint format security-check \
        ps ps-all \
        certbot-issue certbot-renew

COMPOSE       := docker-compose
COMPOSE_PROD  := docker-compose -f docker-compose.yml -f docker-compose.prod.yml
APP           := $(COMPOSE) exec backend

# ─────────────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  ┌─────────────────────────────────────────────────────────┐"
	@echo "  │         Garage Guardian — Docker Command Centre          │"
	@echo "  └─────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "  ── SETUP ─────────────────────────────────────────────────"
	@echo "    make setup          First-time full setup (dev + migrate + seed)"
	@echo "    make setup-prod     First-time production setup"
	@echo ""
	@echo "  ── STACK CONTROL ─────────────────────────────────────────"
	@echo "    make dev            Start core services (no mailpit/phpmyadmin)"
	@echo "    make dev-full       Start all services including dev tools"
	@echo "    make prod           Start production stack"
	@echo "    make down           Stop all services"
	@echo "    make restart        Restart all services"
	@echo "    make ps             Show running containers (compact)"
	@echo "    make ps-all         Show all containers with details"
	@echo ""
	@echo "  ── BUILD ─────────────────────────────────────────────────"
	@echo "    make build          Rebuild all images"
	@echo "    make build-backend  Rebuild backend (PHP-FPM) only"
	@echo "    make build-frontend Rebuild frontend (React/Vite) only"
	@echo "    make build-horizon  Rebuild horizon (queue worker) only"
	@echo "    make build-reverb   Rebuild reverb (WebSocket) only"
	@echo "    make build-nginx    Rebuild nginx (proxy) only"
	@echo ""
	@echo "  ── DATABASE ──────────────────────────────────────────────"
	@echo "    make migrate        Run pending migrations"
	@echo "    make seed           Run database seeders"
	@echo "    make fresh          Drop all, re-migrate + seed"
	@echo "    make rollback       Rollback last migration batch"
	@echo ""
	@echo "  ── SHELL ACCESS ──────────────────────────────────────────"
	@echo "    make shell          Shell into backend container"
	@echo "    make shell-frontend Shell into frontend container"
	@echo "    make shell-mariadb  MySQL CLI in mariadb container"
	@echo "    make shell-redis    Redis CLI in redis container"
	@echo "    make shell-horizon  Shell into horizon container"
	@echo ""
	@echo "  ── LOGS ──────────────────────────────────────────────────"
	@echo "    make logs           Tail all container logs"
	@echo "    make logs-backend   Tail backend logs only"
	@echo "    make logs-frontend  Tail frontend logs only"
	@echo "    make logs-nginx     Tail nginx logs only"
	@echo "    make logs-horizon   Tail horizon logs only"
	@echo "    make logs-reverb    Tail reverb logs only"
	@echo ""
	@echo "  ── HORIZON ───────────────────────────────────────────────"
	@echo "    make horizon-status  Show Horizon status"
	@echo "    make horizon-pause   Pause all queue workers"
	@echo "    make horizon-resume  Resume all queue workers"
	@echo ""
	@echo "  ── FRONTEND ──────────────────────────────────────────────"
	@echo "    make npm-install    npm ci in backend container"
	@echo "    make npm-build      Build frontend assets in backend container"
	@echo "    make npm-dev        Start Vite dev server (port 5173)"
	@echo ""
	@echo "  ── MAINTENANCE ───────────────────────────────────────────"
	@echo "    make cache-clear    Clear all Laravel caches"
	@echo "    make key            Generate APP_KEY"
	@echo "    make backup         Run database + storage backup"
	@echo "    make lint           Run ESLint + PHP-CS-Fixer"
	@echo "    make security-check Run composer audit + npm audit"
	@echo "    make certbot-issue  Issue TLS cert from Let's Encrypt"
	@echo "    make certbot-renew  Renew TLS certificates"
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────────────────────────────────────

setup:
	@echo "⚡ Garage Guardian — First-time dev setup"
	@[ -f .env ] || (cp .env.example .env && echo "  ✓ .env created from .env.example")
	$(COMPOSE) --profile dev build --parallel
	$(COMPOSE) --profile dev up -d
	@echo "  ⏳ Waiting for MariaDB to be healthy..."
	@sleep 15
	$(APP) php artisan key:generate --ansi
	$(APP) php artisan migrate:fresh --seed --force
	$(APP) php artisan storage:link
	$(APP) php artisan horizon:publish
	$(APP) php artisan telescope:publish 2>/dev/null || true
	@echo ""
	@echo "  ✅ Setup complete!"
	@echo ""
	@echo "  🌐 App:         http://localhost"
	@echo "  📊 Horizon:     http://localhost/horizon"
	@echo "  🔭 Telescope:   http://localhost/telescope"
	@echo "  📧 Mailpit:     http://localhost:8025"
	@echo "  🗄️  MinIO:       http://localhost:9001"
	@echo "  🐬 phpMyAdmin:  http://localhost:8081"
	@echo ""
	@echo "  🔑 Login: admin@techaura-projects.com / Change@Me1234!"
	@echo ""

setup-prod:
	@echo "🚀 Garage Guardian — Production setup"
	@[ -f .env ] || (echo "ERROR: .env not found. Copy .env.example and configure it." && exit 1)
	$(COMPOSE_PROD) build --parallel --no-cache
	$(COMPOSE_PROD) up -d
	@echo "  ⏳ Waiting for services..."
	@sleep 20
	$(COMPOSE_PROD) exec backend php artisan key:generate --ansi 2>/dev/null || true
	$(COMPOSE_PROD) exec backend php artisan migrate --force
	$(COMPOSE_PROD) exec backend php artisan db:seed --force
	$(COMPOSE_PROD) exec backend php artisan storage:link
	$(COMPOSE_PROD) exec backend php artisan config:cache
	$(COMPOSE_PROD) exec backend php artisan route:cache
	$(COMPOSE_PROD) exec backend php artisan view:cache
	$(COMPOSE_PROD) exec backend php artisan event:cache
	@echo ""
	@echo "  ✅ Production stack is running!"
	@echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STACK CONTROL
# ─────────────────────────────────────────────────────────────────────────────

dev:
	$(COMPOSE) up -d
	@echo "  ✅ Core stack running (without mailpit/phpmyadmin)"
	@echo "     Use 'make dev-full' to include dev tools"

dev-full:
	$(COMPOSE) --profile dev up -d
	@echo "  ✅ Full dev stack running"

prod:
	$(COMPOSE_PROD) up -d

down:
	$(COMPOSE) --profile dev down

restart:
	$(COMPOSE) --profile dev restart

ps:
	$(COMPOSE) --profile dev ps

ps-all:
	$(COMPOSE) --profile dev ps -a

# ─────────────────────────────────────────────────────────────────────────────
# BUILD — rebuild individual services
# ─────────────────────────────────────────────────────────────────────────────

build:
	$(COMPOSE) --profile dev build --parallel

build-backend:
	$(COMPOSE) build backend

build-frontend:
	$(COMPOSE) build frontend

build-horizon:
	$(COMPOSE) build horizon

build-reverb:
	$(COMPOSE) build reverb

build-scheduler:
	$(COMPOSE) build scheduler

build-mariadb:
	$(COMPOSE) build mariadb

build-redis:
	$(COMPOSE) build redis

build-tesseract:
	$(COMPOSE) build tesseract

build-nginx:
	$(COMPOSE) build nginx

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────────────────────────

migrate:
	$(APP) php artisan migrate --ansi

seed:
	$(APP) php artisan db:seed --ansi

fresh:
	$(APP) php artisan migrate:fresh --seed --force --ansi

rollback:
	$(APP) php artisan migrate:rollback --ansi

# ─────────────────────────────────────────────────────────────────────────────
# SHELL ACCESS
# ─────────────────────────────────────────────────────────────────────────────

shell:
	$(COMPOSE) exec backend bash

shell-frontend:
	$(COMPOSE) exec frontend sh

shell-mariadb:
	$(COMPOSE) exec mariadb mysql -u${DB_USERNAME:-garage} -p${DB_PASSWORD:-garage_secret_change_me} ${DB_DATABASE:-garage_guardian}

shell-redis:
	$(COMPOSE) exec redis redis-cli

shell-horizon:
	$(COMPOSE) exec horizon bash

shell-reverb:
	$(COMPOSE) exec reverb bash

# ─────────────────────────────────────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────────────────────────────────────

logs:
	$(COMPOSE) --profile dev logs -f --tail=100

logs-backend:
	$(COMPOSE) logs -f --tail=100 backend

logs-frontend:
	$(COMPOSE) logs -f --tail=100 frontend

logs-nginx:
	$(COMPOSE) logs -f --tail=100 nginx

logs-horizon:
	$(COMPOSE) logs -f --tail=100 horizon

logs-reverb:
	$(COMPOSE) logs -f --tail=100 reverb

logs-scheduler:
	$(COMPOSE) logs -f --tail=100 scheduler

logs-mariadb:
	$(COMPOSE) logs -f --tail=100 mariadb

# ─────────────────────────────────────────────────────────────────────────────
# ARTISAN
# ─────────────────────────────────────────────────────────────────────────────

artisan:
	$(APP) php artisan $(filter-out $@,$(MAKECMDGOALS))

key:
	$(APP) php artisan key:generate --ansi

cache-clear:
	$(APP) php artisan config:clear
	$(APP) php artisan route:clear
	$(APP) php artisan view:clear
	$(APP) php artisan cache:clear
	$(APP) php artisan event:clear
	@echo "  ✓ All caches cleared"

cache-warm:
	$(APP) php artisan config:cache
	$(APP) php artisan route:cache
	$(APP) php artisan view:cache
	$(APP) php artisan event:cache
	@echo "  ✓ All caches warmed"

queue-restart:
	$(APP) php artisan horizon:terminate
	@sleep 3
	$(COMPOSE) restart horizon
	@echo "  ✓ Horizon restarted"

# ─────────────────────────────────────────────────────────────────────────────
# HORIZON
# ─────────────────────────────────────────────────────────────────────────────

horizon-status:
	$(APP) php artisan horizon:status

horizon-pause:
	$(APP) php artisan horizon:pause
	@echo "  ⏸  Horizon paused"

horizon-resume:
	$(APP) php artisan horizon:continue
	@echo "  ▶  Horizon resumed"

horizon-terminate:
	$(APP) php artisan horizon:terminate

# ─────────────────────────────────────────────────────────────────────────────
# FRONTEND (run inside a temporary node container or backend)
# ─────────────────────────────────────────────────────────────────────────────

npm-install:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine npm ci

npm-build:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine sh -c "npm ci && npm run build"
	@echo "  ✓ Frontend built — rebuild frontend container: make build-frontend"

npm-dev:
	docker run --rm -it \
		-v $(PWD):/app \
		-w /app \
		-p 5173:5173 \
		--network garage-guardian_garage-net \
		node:20-alpine \
		npm run dev -- --host 0.0.0.0

# ─────────────────────────────────────────────────────────────────────────────
# TESTING
# ─────────────────────────────────────────────────────────────────────────────

test:
	$(APP) php artisan test --parallel --ansi

test-unit:
	$(APP) php artisan test --testsuite=Unit --ansi

test-feature:
	$(APP) php artisan test --testsuite=Feature --ansi

# ─────────────────────────────────────────────────────────────────────────────
# MAINTENANCE
# ─────────────────────────────────────────────────────────────────────────────

backup:
	$(COMPOSE) exec mariadb sh -c 'mysqldump -u root -p"$$MYSQL_ROOT_PASSWORD" $$MYSQL_DATABASE | gzip > /backup/garage_$$(date +%Y%m%d_%H%M%S).sql.gz'
	@echo "  ✓ Database backup saved to mariadb container /backup/"

lint:
	$(APP) ./vendor/bin/php-cs-fixer fix --dry-run --diff 2>/dev/null || true
	docker run --rm -v $(PWD):/app -w /app node:20-alpine sh -c "npm ci --silent && npx eslint resources/js --ext .ts,.tsx" 2>/dev/null || true

format:
	$(APP) ./vendor/bin/php-cs-fixer fix 2>/dev/null || true

security-check:
	$(APP) composer audit
	docker run --rm -v $(PWD):/app -w /app node:20-alpine sh -c "npm audit --audit-level=moderate" 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# TLS / CERTBOT
# ─────────────────────────────────────────────────────────────────────────────

certbot-issue:
	docker run --rm \
		-v certbot-certs:/etc/letsencrypt \
		-v certbot-www:/var/www/certbot \
		certbot/certbot certonly \
		--webroot --webroot-path=/var/www/certbot \
		--email admin@techaura-projects.com \
		--agree-tos --no-eff-email \
		-d techaura-projects.com \
		-d www.techaura-projects.com
	@echo "  ✓ Cert issued — restart nginx: make restart"

certbot-renew:
	docker run --rm \
		-v certbot-certs:/etc/letsencrypt \
		-v certbot-www:/var/www/certbot \
		certbot/certbot renew --quiet
	$(COMPOSE) exec nginx nginx -s reload
	@echo "  ✓ Cert renewed and nginx reloaded"

# ─────────────────────────────────────────────────────────────────────────────
# Catch-all (allows: make artisan "tinker")
# ─────────────────────────────────────────────────────────────────────────────
%:
	@:
