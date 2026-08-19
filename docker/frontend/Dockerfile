# ─────────────────────────────────────────────────────────────────────────────
#  docker/frontend/Dockerfile
#  Builds React/Vite app and serves static files via lightweight NGINX
#  This container only serves /assets, / (SPA), and proxies /api → backend
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Node build ───────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

LABEL org.opencontainers.image.title="Garage Guardian — Frontend Builder"

WORKDIR /app

# Install deps first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source files needed for build
COPY resources/ ./resources/
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js ./
COPY public/ ./public/
COPY index.html ./
COPY components.json ./

# Build
RUN npm run build

# ── Stage 2: NGINX static server ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS frontend

LABEL org.opencontainers.image.title="Garage Guardian — Frontend (NGINX Static)"

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=frontend-build /app/public /usr/share/nginx/html

# Copy NGINX SPA config
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
