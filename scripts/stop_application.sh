#!/bin/bash
set -e

echo "=== Stopping Application ==="

cd /home/ubuntu/app

# Detener solo api y mqtt, mantener db corriendo
if [ -f docker-compose.prod.yml ]; then
  docker-compose -f docker-compose.prod.yml stop api mqtt || true
  docker-compose -f docker-compose.prod.yml rm -f api mqtt || true
fi

docker-compose -f /home/ubuntu/app/docker-compose.prod.yml down --remove-orphans || true
docker container prune -f
docker image prune -af
docker network prune -f

rm -rf ./*

echo "=== Application Stopped ==="