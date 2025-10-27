#!/bin/bash
set -e

echo "=== Stopping Application ==="

cd /home/ec2-user/app

# Detener solo api y mqtt, mantener db corriendo
if [ -f docker-compose.prod.yml ]; then
  docker-compose -f docker-compose.prod.yml stop api mqtt || true
  docker-compose -f docker-compose.prod.yml rm -f api mqtt || true
fi

# Limpiar contenedores detenidos
docker container prune -f || true

echo "=== Application Stopped ==="