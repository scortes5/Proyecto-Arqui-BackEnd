#!/bin/bash
set -e

echo "=== Installing Dependencies ==="

# Asegurar Docker está corriendo
sudo service docker start

# Login a ECR
aws ecr-public get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin public.ecr.aws

echo "=== Dependencies Installed ==="