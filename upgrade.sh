#!/bin/bash

# SendMail Upgrade Script
# Pulls latest code, runs migrations, and restarts services

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
    docker cp schema/billing.sql edcom-database:/tmp/billing.sql
    docker compose exec -T database psql -U edcom edcom -f /tmp/billing.sql
    echo "  Billing schema applied"
fi

echo ""
echo "Step 4: Rebuilding containers..."
docker compose build --pull api tasks client

# Update marketing site if it exists
if [[ -d "marketing" ]]; then
    echo ""
    echo "Step 4b: Updating marketing site..."
    cd marketing
    git pull origin main 2>/dev/null || echo "  Marketing site not a git repo, skipping pull"
    cd ..
fi

echo ""
echo "Step 5: Restarting services..."
docker compose down
docker compose up -d --scale tasks=1

echo ""
echo "Step 6: Waiting for services to start..."
sleep 10

echo ""
echo "Step 7: Health check..."
if docker compose ps | grep -q "unhealthy"; then
    echo "Warning: Some containers report unhealthy status"
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
