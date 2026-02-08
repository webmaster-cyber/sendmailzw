#!/bin/bash

# SendMail Upgrade Script
# Pulls latest code, runs migrations, builds client, and restarts services

set -e

echo ""
echo "======================================"
echo "      SendMail Upgrade Script"
echo "======================================"
echo ""

# Check we're in the right directory
if [[ ! -f "docker-compose.yml" ]]; then
    echo "Error: Must be run from the edcom-install directory"
    exit 1
fi

# Check if running as root
if [[ $UID -ne 0 ]]; then
    echo "Warning: Not running as root. You may need sudo for some operations."
fi

echo "Step 1: Pulling latest code..."
git pull origin main

echo ""
echo "Step 2: Backing up database..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T database pg_dump -U edcom edcom > "$BACKUP_FILE"
echo "  Backup saved to: $BACKUP_FILE"

echo ""
echo "Step 3: Running database migrations..."
if [[ -f "schema/billing.sql" ]]; then
    docker compose cp schema/billing.sql database:/tmp/billing.sql
    docker compose exec -T database psql -U edcom edcom -f /tmp/billing.sql 2>/dev/null || true
    echo "  Billing schema applied"
fi

echo ""
echo "Step 4: Building client-next..."
if [[ -d "client-next" ]]; then
    cd client-next
    npm install
    npm run build
    cd ..
    echo "  Client built to client-next/dist"
else
    echo "  Warning: client-next directory not found"
fi

# Update marketing site if it exists
if [[ -d "marketing" ]]; then
    echo ""
    echo "Step 5: Updating marketing site..."
    cd marketing
    git pull origin main 2>/dev/null || echo "  Marketing site not a git repo, skipping pull"
    npm install
    npm run build 2>/dev/null || true
    cd ..
fi

echo ""
echo "Step 6: Restarting services..."
docker compose restart

echo ""
echo "Step 7: Waiting for services to start..."
for i in $(seq 1 30); do
    if docker compose exec -T database pg_isready -U edcom > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

echo ""
echo "Step 8: Health check..."
if docker compose ps | grep -q "unhealthy\|Restarting"; then
    echo "  Warning: Some containers report issues"
    docker compose ps
else
    echo "  All containers running"
fi

echo ""
echo "======================================"
echo "      Upgrade Complete!"
echo "======================================"
echo ""
echo "Backup file: $BACKUP_FILE"
echo ""
echo "If something went wrong, restore with:"
echo "  docker compose exec -T database psql -U edcom edcom < $BACKUP_FILE"
echo ""
