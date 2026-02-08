#!/bin/bash
set -euo pipefail

# SendMail.co.zw — Install from source
# Run as root from the edcom-install directory

if [[ $UID -ne 0 ]]; then
    echo "This script must be run as root"
    exit 1
fi

if [[ ! -f "install.sh" ]]; then
    echo "Run this script from the edcom-install directory"
    exit 1
fi

echo ""
echo "=============================="
echo "  SendMail Install"
echo "=============================="
echo ""

# Install system dependencies
echo ">>> Checking dependencies..."

apt update -qq

if ! command -v git &> /dev/null; then
    echo "    Installing git..."
    apt install -y -qq git
fi

if ! command -v docker &> /dev/null; then
    echo "    Installing Docker..."
    curl -fsSL https://get.docker.com | bash
fi

if ! docker info > /dev/null 2>&1; then
    echo "    Starting Docker..."
    systemctl start docker
    systemctl enable docker
fi

if ! command -v node &> /dev/null; then
    echo "    Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y -qq nodejs
fi

echo "    All dependencies installed."
echo ""

# Collect all configuration upfront
read -rp "Enter server IP address: " IP_ADDRESS
read -rp "Enter app domain (e.g. app.sendmail.co.zw): " DOMAIN
echo ""
read -rp "Beefree license key (leave blank to skip): " LICENSE_KEY

echo ""
echo "  IP: $IP_ADDRESS"
echo "  Domain: $DOMAIN"
if [[ -n "$LICENSE_KEY" ]]; then
echo "  License: $LICENSE_KEY"
fi
echo ""
read -rp "Correct? [y/n]: " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    echo "Exiting. Run again."
    exit 1
fi

# Create directories
echo ""
echo ">>> Creating data directories..."
mkdir -p data/logs/postgres data/logs/nginx data/database data/cache
mkdir -p data/buckets/images data/buckets/transfer data/buckets/blocks data/buckets/data
mkdir -p data/setup data/smtpcert data/letsencrypt-challenge/.well-known/acme-challenge
chown -R 70:70 data/logs/postgres

# Create config
echo ">>> Creating configuration..."
cat > config/edcom.json << ENDJSON
{
  "app": {
    "admin_url": "http://$DOMAIN",
    "pixabay_key": "",
    "mg_validate_key": "",
    "zendesk_host": "",
    "zendesk_user": "",
    "zendesk_key": "",
    "support_email": "",
    "debug": "",
    "sql_trace": "",
    "segment_trace": "",
    "max_send_limit": "1000",
    "beefree_proxy_url": "https://beefree.emaildelivery.com",
    "beefree_client_id": "",
    "beefree_client_secret": "",
    "beefree_cs_api_key": ""
  },
  "smtprelay": {
    "smtphost": "$DOMAIN"
  }
}
ENDJSON

echo "PLATFORM_IP=$IP_ADDRESS" > .env
echo "PLATFORM_IP=$IP_ADDRESS" > config/edcom.env

if [[ -n "$LICENSE_KEY" ]]; then
    echo "$LICENSE_KEY" > config/commercial_license.key
    echo "    License key saved."
fi

# Remove dev override files (they add profiles that prevent production startup)
rm -f docker-compose.override.yml docker-compose.override.amd64.yml

# Write production nginx server config (dev config proxies to Vite which doesn't exist in prod)
echo ">>> Writing production nginx config..."
cat > config/nginx.server.conf << 'ENDNGINX'
server {
    listen       80;
    listen  [::]:80;
    server_name  _;

    location /api/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass   http://api:8000;
    }

    location /signup/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass   http://api:8000;
    }

    location = /l {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass   http://api:8000;
    }

    location /i/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass   http://api:8000;
    }

    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }
}
ENDNGINX

# Redis optimization
echo "vm.overcommit_memory=1" | tee /etc/sysctl.d/99-edcom.conf >/dev/null
sysctl -w vm.overcommit_memory=1 >/dev/null 2>&1 || true

# Build base images
echo ""
echo ">>> Building base images..."
docker build -t python-base -f services/python-base.Dockerfile .

# Build service images
echo ""
echo ">>> Building service images..."
docker build -t edcom/database -f services/database.Dockerfile .
docker build -t edcom/api -f services/api.Dockerfile .
docker build -t edcom/smtprelay smtprelay/
docker build -t edcom/screenshot screenshot/
docker build -t edcom/proxy -f services/proxy.Dockerfile .

# Build client-next
echo ""
echo ">>> Building client-next..."
cd client-next
npm install
npm run build
cd ..

# Create client-next/dist if build didn't (shouldn't happen, but safety)
mkdir -p client-next/dist

# Start containers
echo ""
echo ">>> Starting containers..."
docker compose up -d

# Wait for database to be healthy
echo ""
echo ">>> Waiting for database..."
for i in $(seq 1 30); do
    if docker compose exec -T database pg_isready -U edcom > /dev/null 2>&1; then
        echo "    Database ready."
        break
    fi
    sleep 2
done

# Run billing schema migration
echo ""
echo ">>> Running billing schema migration..."
docker compose cp schema/billing.sql database:/tmp/billing.sql
docker compose exec -T database psql -U edcom edcom -f /tmp/billing.sql 2>/dev/null || true

# Create admin account
echo ""
echo "=============================="
echo "  Create Administrator Account"
echo "=============================="
echo ""
read -rp "Admin email address: " ADMIN_EMAIL
read -rp "Your name: " ADMIN_NAME
read -rp "Company name: " ADMIN_COMPANY
read -srp "Password: " ADMIN_PASS
echo ""

docker exec -i edcom-api python /scripts/create_admin.py "$ADMIN_EMAIL" "$ADMIN_NAME" "$ADMIN_COMPANY" --password "$ADMIN_PASS"

echo ""
echo "=============================="
echo "  Setup Complete!"
echo "=============================="
echo ""
echo "  App URL: http://$DOMAIN"
echo "  IP URL:  http://$IP_ADDRESS"
echo ""
echo "  Next steps:"
echo "    1. Import database from old server (see docs/cutover-plan.md)"
echo "    2. Run ./enable_multisite.sh for marketing site"
echo "    3. Set up SSL with ./generate_multisite_certificate.sh"
echo ""
