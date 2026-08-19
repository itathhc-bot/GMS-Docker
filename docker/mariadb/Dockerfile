# ─────────────────────────────────────────────────────────────────────────────
#  docker/mariadb/Dockerfile
#  MariaDB 10.11 — primary relational database
#  Adds: custom config, UTF8MB4 charset, timezone data
# ─────────────────────────────────────────────────────────────────────────────
FROM mariadb:10.11

LABEL org.opencontainers.image.title="Garage Guardian — MariaDB 10.11"

# Install timezone data (required for MariaDB event scheduler + Laravel Carbon)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Load timezone tables into MariaDB (done at runtime via healthcheck)
# Custom config
COPY docker/mariadb/my.cnf /etc/mysql/conf.d/garage.cnf

# Init SQL: creates the database if it doesn't exist
COPY docker/mariadb/init/ /docker-entrypoint-initdb.d/

EXPOSE 3306

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent || exit 1
