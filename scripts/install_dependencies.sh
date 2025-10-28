#!/bin/bash
set -e

echo "=== Installing Dependencies ==="

sudo systemctl start docker || true
sudo systemctl enable docker || true

# Login a ECR
aws ecr-public get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin public.ecr.aws || {
  echo "ERROR: ECR login failed"
  exit 1
}

echo "=== Dependencies Installed ==="