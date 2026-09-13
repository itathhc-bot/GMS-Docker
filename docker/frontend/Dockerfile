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
RUN npm ci

# Copy source files needed for build
COPY resources/ ./resources/
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js ./
COPY public/ ./public/

ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME

ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
ENV VITE_REVERB_HOST=$VITE_REVERB_HOST
ENV VITE_REVERB_PORT=$VITE_REVERB_PORT
ENV VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

# Build
RUN npm run build

# ── Stage 2: NGINX static server ──────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:1.27-alpine AS frontend

LABEL org.opencontainers.image.title="Garage Guardian — Frontend (NGINX Static)"

# Remove default config
USER root
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=frontend-build --chown=101:101 /app/public /usr/share/nginx/html

# Copy NGINX SPA config
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# OpenShift Group 0 permissions
RUN chgrp -R 0 /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx \
    && chmod -R g=u /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx
USER 101

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
