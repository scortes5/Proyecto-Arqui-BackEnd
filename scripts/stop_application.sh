#!/bin/bash
set -e

echo "=== Stopping Application ==="

cd /home/ubuntu/app || exit 0

# Solo detener API y MQTT, NO la base de datos
if [ -f docker-compose.prod.yml ]; then
  echo "Stopping API and MQTT services..."
  docker-compose -f docker-compose.prod.yml stop api mqtt || true
  
  echo "Removing API and MQTT containers..."
  docker-compose -f docker-compose.prod.yml rm -f api mqtt || true
  
  echo "Services stopped successfully"
else
  echo "⚠️ docker-compose.prod.yml not found, skipping stop"
fi

echo "=== Application Stopped ==="