#!/bin/bash
# SafeCon Deployment Script
# Usage: ./scripts/deploy.sh

set -e

# Configuration
SERVER_USER="ubuntu"
SERVER_HOST="trendy.storydot.kr"
SERVER_PATH="/mnt/storage/law"
SSH_KEY="c:/server/firstkeypair.pem"

echo "=== SafeCon Deployment Script ==="
echo "Target: $SERVER_USER@$SERVER_HOST:$SERVER_PATH"

# Step 1: Build locally
echo ""
echo "[1/4] Building production bundle..."
npm run build

# Step 2: Create deployment package
echo ""
echo "[2/4] Creating deployment package..."
tar -czf deploy.tar.gz dist/ docker-compose.yml Dockerfile nginx.conf

# Step 3: Upload to server
echo ""
echo "[3/4] Uploading to server..."
scp -i "$SSH_KEY" deploy.tar.gz "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

# Step 4: Deploy on server
echo ""
echo "[4/4] Deploying on server..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /mnt/storage/law

# Extract deployment package
tar -xzf deploy.tar.gz

# Stop existing container if running
docker-compose down 2>/dev/null || true

# Build and start new container
docker-compose up -d --build

# Clean up
rm deploy.tar.gz

# Show status
echo ""
echo "Deployment complete! Container status:"
docker ps | grep safecon
ENDSSH

# Cleanup local
rm deploy.tar.gz

echo ""
echo "=== Deployment Complete ==="
echo "Access the application at: http://trendy.storydot.kr:3000"
