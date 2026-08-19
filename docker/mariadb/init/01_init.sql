-- docker/mariadb/init/01_init.sql
-- Runs automatically on first start via /docker-entrypoint-initdb.d/
-- MariaDB already creates the DB from MYSQL_DATABASE env var,
-- but we add charset/collation and any initial grants here.

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Ensure the database uses utf8mb4
ALTER DATABASE garage_guardian
    CHARACTER SET = utf8mb4
    COLLATE = utf8mb4_unicode_ci;

-- Grant full privileges to app user on the database
GRANT ALL PRIVILEGES ON garage_guardian.* TO 'garage'@'%';
FLUSH PRIVILEGES;
