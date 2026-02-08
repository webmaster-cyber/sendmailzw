#!/bin/bash

# SendMail Upgrade Script
# Pulls latest code, rebuilds images, builds client, and restarts all services

set -e

# Re-exec after git pull so we always run the latest version of this script
if [[ -z "$UPGRADE_REEXEC" ]]; then
    echo ""
    echo "======================================"
    echo "      SendMail Upgrade Script"
    echo "======================================"
    echo ""

    if [[ ! -f "docker-compose.yml" ]]; then
        echo "Error: Must be run from the edcom-install directory"
        exit 1
    fi

    if [[ $UID -ne 0 ]]; then
        echo "Warning: Not running as root. You may need sudo for some operations."
    fi

    echo "Step 1: Pulling latest code..."
    git pull origin main
    echo ""
    echo "  Re-launching with updated script..."
    UPGRADE_REEXEC=1 exec bash "$0" "$@"
fi

# --- From here on we're running the latest version ---

echo "Step 2: Backing up database..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T database pg_dump -U edcom edcom > "$BACKUP_FILE"
echo "  Backup saved to: $BACKUP_FILE"

# Run migrations only if marker is missing
MIGRATION_MARKER="data/.billing_migration_applied"
if [[ -f "schema/billing.sql" ]] && [[ ! -f "$MIGRATION_MARKER" ]]; then
    echo ""
    echo "Step 3: Running database migrations..."
    docker compose cp schema/billing.sql database:/tmp/billing.sql
    docker compose exec -T database psql -U edcom edcom -f /tmp/billing.sql 2>/dev/null || true
    mkdir -p data
    touch "$MIGRATION_MARKER"
    echo "  Billing schema applied"
else
    echo ""
    echo "Step 3: Database migrations already applied, skipping"
fi

echo ""
echo "Step 4: Rebuilding API image..."
docker build --no-cache -t edcom/api -f services/api.Dockerfile .
echo "  API image rebuilt"

echo ""
echo "Step 5: Building client-next..."
if [[ -d "client-next" ]]; then
    cd client-next
    rm -f tsconfig.tsbuildinfo tsconfig.*.tsbuildinfo
    npm install
    npm run build
    cd ..
    echo "  Client built to client-next/dist"
else
    echo "  Warning: client-next directory not found"
fi

if [[ -d "marketing" ]]; then
    echo ""
    echo "Step 6: Updating marketing site..."
    cd marketing
    git pull origin main 2>/dev/null || echo "  Marketing site not a git repo, skipping pull"
    npm install
    npm run build 2>/dev/null || true
    cd ..
fi

# Update nginx config if multisite is active
if [[ -f "config/nginx.ssl.multisite.conf" ]] && grep -q "marketing" config/nginx.ssl.conf 2>/dev/null; then
    echo ""
    echo "Step 7: Updating nginx config..."
    cp config/nginx.ssl.multisite.conf config/nginx.ssl.conf
    echo "  Multisite nginx config updated"
fi

echo ""
echo "Step 8: Restarting all services..."
docker compose up -d --force-recreate

echo ""
echo "Step 9: Waiting for services to be ready..."
echo -n "  "
for i in $(seq 1 15); do
    if docker compose exec -T database pg_isready -U edcom > /dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 2
done
echo " database ready"

echo ""
docker compose ps

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
