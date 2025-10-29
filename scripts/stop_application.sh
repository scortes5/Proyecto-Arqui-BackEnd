#!/bin/bash
set -e

echo "=== Stopping Application ==="

cd /home/ubuntu/app

# Detectar si necesita sudo
if docker ps > /dev/null 2>&1; then
    DOCKER_CMD=""
    COMPOSE_CMD="docker-compose"
else
    DOCKER_CMD="sudo"
    COMPOSE_CMD="sudo docker-compose"
fi

# 1. Detener y eliminar TODOS los contenedores
if [ -f docker-compose.prod.yml ]; then
    $COMPOSE_CMD -f docker-compose.prod.yml down --remove-orphans || true
fi

# 2. Eliminar contenedores específicos por nombre (por si acaso)
$DOCKER_CMD docker rm -f postgres-db api mqtt 2>/dev/null || true

# 3. Limpiar recursos Docker
$DOCKER_CMD docker container prune -f || true
$DOCKER_CMD docker image prune -af || true
$DOCKER_CMD docker network prune -f || true

echo "=== Application Stopped ==="