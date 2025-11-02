#!/bin/bash
set -e

echo "=== Checking Dependencies ==="

# Asegurar Docker está corriendo
sudo systemctl start docker || true

# Verificar si docker-compose YA está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "Installing docker-compose..."
    sudo apt update
    sudo apt install -y docker-compose || {
        echo "Installing docker-compose-plugin instead..."
        sudo apt install -y docker-compose-plugin
    }
else
    echo "✓ docker-compose already installed"
fi

echo "=== Dependencies Ready ==="