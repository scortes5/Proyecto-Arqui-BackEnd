#!/bin/bash
set -e

echo "=== Starting Application ==="

cd /home/ubuntu/app

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Obtener image tags del deployment
export IMAGE_TAG=${IMAGE_TAG:-latest}

# REEMPLAZAR ESTOS VALORES CON TUS URIs DE ECR
export API_IMAGE="public.ecr.aws/l6q0d4z8/grupo-04-api:${IMAGE_TAG}"
export MQTT_IMAGE="public.ecr.aws/l6q0d4z8/grupo-04-mqtt:${IMAGE_TAG}"

# Pull de nuevas imágenes
docker-compose -f docker-compose.prod.yml pull api mqtt

# Iniciar servicios (db ya está corriendo)
docker-compose -f docker-compose.prod.yml up -d api mqtt

echo "=== Application Started ==="