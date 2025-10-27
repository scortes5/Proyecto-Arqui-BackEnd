#!/bin/bash
set -e

echo "=== Validating Services ==="

sleep 15

# Verificar que contenedores están corriendo
if ! docker ps | grep -q "api-service"; then
  echo "ERROR: API container not running"
  exit 1
fi

if ! docker ps | grep -q "mqtt-service"; then
  echo "ERROR: MQTT container not running"
  exit 1
fi

echo "✓ Containers are running"

# Health check de API
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ API health check passed"
    break
  fi
  
  echo "Waiting for API... ($((attempt+1))/$max_attempts)"
  sleep 2
  attempt=$((attempt+1))
done

if [ $attempt -eq $max_attempts ]; then
  echo "ERROR: API health check failed"
  docker logs api-service --tail 50
  exit 1
fi

# Verificar MQTT está escuchando
if netstat -tuln | grep -q ":1883"; then
  echo "✓ MQTT service is listening"
else
  echo "ERROR: MQTT service not listening on port 1883"
  docker logs mqtt-service --tail 50
  exit 1
fi

echo "=== All Services Validated ==="

