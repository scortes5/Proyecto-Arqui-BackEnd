#!/bin/bash
set -e

echo "=== Starting Application ==="

cd /home/ec2-user/app

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Cargar variables de imagen del deployment
if [ -f .env.images ]; then
  export $(cat .env.images | grep -v '^#' | xargs)
  echo "Using images from deployment:"
  echo "  API: $API_IMAGE"
  echo "  MQTT: $MQTT_IMAGE"
else
  # Fallback a latest si no hay archivo
  export IMAGE_TAG=latest
  export API_IMAGE="public.ecr.aws/XXXXXXXX/grupo-XX-api:${IMAGE_TAG}"
  export MQTT_IMAGE="public.ecr.aws/XXXXXXXX/grupo-XX-mqtt:${IMAGE_TAG}"
  echo "Using latest images (fallback)"
fi

# Pull de nuevas imágenes
echo "Pulling images..."
docker-compose -f docker-compose.prod.yml pull api mqtt

# Iniciar servicios (db ya está corriendo)
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d api mqtt

echo "=== Application Started ==="