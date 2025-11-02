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


