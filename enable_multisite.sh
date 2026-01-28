#!/bin/bash

# Enable multisite mode with marketing site + main app on separate domains
# This switches nginx to use domain-based routing

set -e

echo ""
echo "======================================"
echo "    Enable Multisite Mode"
echo "======================================"
echo ""

if [[ ! -f "docker-compose.yml" ]]; then
    echo "Error: Must be run from the edcom-install directory"
    exit 1
fi

# Check if marketing site exists
if [[ ! -d "marketing" ]]; then
    echo "Error: Marketing site not found at ./marketing"
    echo ""
    echo "Clone it first:"
    echo "  git clone https://github.com/webmaster-cyber/sendmail-marketing.git marketing"
    echo ""
    exit 1
fi

# Backup current nginx config
echo "Step 1: Backing up current nginx config..."
cp config/nginx.ssl.conf config/nginx.ssl.conf.backup 2>/dev/null || true

# Switch to multisite nginx config
echo "Step 2: Switching to multisite nginx config..."
cp config/nginx.ssl.multisite.conf config/nginx.ssl.conf

# Create marketing env file if needed
if [[ ! -f "marketing/.env" ]]; then
    echo "Step 3: Creating marketing site .env..."
    cat > marketing/.env << 'EOF'
PUBLIC_APP_URL=https://app.sendmail.co.zw
PUBLIC_API_URL=https://app.sendmail.co.zw
EOF
fi

echo "Step 4: Starting marketing container..."
docker compose --profile marketing up -d marketing

echo "Step 5: Restarting proxy..."
docker compose restart proxy

echo ""
echo "======================================"
echo "    Multisite Mode Enabled!"
echo "======================================"
echo ""
echo "Domains configured:"
echo "  - sendmail.co.zw        → Marketing site"
echo "  - app.sendmail.co.zw    → Main application"
echo ""
echo "Next steps:"
echo "  1. Point DNS records to this server's IP"
echo "  2. Generate SSL certificate:"
echo "     ./generate_multisite_certificate.sh sendmail.co.zw app.sendmail.co.zw www.sendmail.co.zw"
echo "  3. Restart proxy: docker compose restart proxy"
echo ""
