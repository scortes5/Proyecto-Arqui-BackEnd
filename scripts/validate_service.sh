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

# Verificar MQTT está escuchando
if netstat -tuln | grep -q ":1883"; then
  echo "✓ MQTT service is listening"
else
  echo "ERROR: MQTT service not listening on port 1883"
  docker logs mqtt-service --tail 50
  exit 1
fi

echo "=== All Services Validated ==="

