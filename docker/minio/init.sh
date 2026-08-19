#!/bin/sh
# Wait for MinIO to start
sleep 5

# Configure mc
mc alias set myminio http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# Create buckets
mc mb myminio/qc-photos --ignore-existing
mc mb myminio/exports --ignore-existing
mc mb myminio/avatars --ignore-existing
mc mb myminio/scan-thumbnails --ignore-existing

# Set public policy on buckets that need public read access
mc anonymous set download myminio/qc-photos
mc anonymous set download myminio/avatars
mc anonymous set download myminio/scan-thumbnails
