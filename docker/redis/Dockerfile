# ─────────────────────────────────────────────────────────────────────────────
#  docker/redis/Dockerfile
#  Redis 7 — queue backend for Horizon + session/cache store
# ─────────────────────────────────────────────────────────────────────────────
FROM redis:7-alpine

LABEL org.opencontainers.image.title="Garage Guardian — Redis 7"

COPY docker/redis/redis.conf /usr/local/etc/redis/redis.conf

EXPOSE 6379

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD redis-cli ping | grep -q PONG || exit 1

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
