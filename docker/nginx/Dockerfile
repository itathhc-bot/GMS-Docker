# ─────────────────────────────────────────────────────────────────────────────
#  docker/nginx/Dockerfile
#  Main reverse proxy — routes traffic to frontend, backend, reverb, minio
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Garage Guardian — NGINX Reverse Proxy"

RUN apk add --no-cache curl

# Remove default site
RUN rm /etc/nginx/conf.d/default.conf

# Copy global NGINX config
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy site config
COPY docker/nginx/default.conf /etc/nginx/conf.d/app.conf

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
