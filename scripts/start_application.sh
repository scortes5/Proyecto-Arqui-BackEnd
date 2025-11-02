#!/bin/bash
set -e

echo "=== Starting Application ==="

cd /home/ubuntu/app

# Cargar variables de entorno principales (DB, etc)
if [ -f .env ]; then
  echo "Loading main environment variables..."
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "⚠️ Warning: .env file not found"
fi

# Cargar variables de imagen del deployment
if [ -f .env.images ]; then
  echo "Loading image variables from deployment..."
  export $(cat .env.images | grep -v '^#' | xargs)
  echo "Using images:"
  echo "  IMAGE_TAG: $IMAGE_TAG"
  echo "  API: $API_IMAGE"
  echo "  MQTT: $MQTT_IMAGE"
else
  # Fallback a latest si no hay archivo
  echo "⚠️ Warning: .env.images not found, using fallback"
  export IMAGE_TAG=latest
  export API_IMAGE="public.ecr.aws/l6q0d4z8/grupo-04-api:${IMAGE_TAG}"
  export MQTT_IMAGE="public.ecr.aws/l6q0d4z8/grupo-04-mqtt:${IMAGE_TAG}"
fi

# Pull de nuevas imágenes (solo API y MQTT, no DB)
echo "Pulling new images..."
docker-compose -f docker-compose.prod.yml pull api mqtt

# Iniciar solo API y MQTT (la DB ya debería estar corriendo)
echo "Starting API and MQTT services..."
docker-compose -f docker-compose.prod.yml up -d api mqtt

# Esperar un momento para que los contenedores inicien
sleep 5

# Verificar que los servicios estén corriendo
echo "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "=== Application Started Successfully ==="