#!/bin/bash

# Generate SSL certificate for multiple domains (SAN certificate)
# Usage: ./generate_multisite_certificate.sh domain1.com domain2.com ...

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 domain1.com [domain2.com] [domain3.com] ..."
  echo "Example: $0 sendmail.co.zw app.sendmail.co.zw www.sendmail.co.zw"
  exit 1
fi

if [[ $UID -ne 0 ]]; then
    echo ""
    echo "This script must be run as root"
    echo "Exiting. Become root by running 'sudo su' and then run this script again."
    echo ""
    exit 1
fi

if [[ ! -f "generate_multisite_certificate.sh" ]]; then
    echo ""
    echo "This script must be run from the edcom-install directory."
    echo ""
    exit 1
fi

CWD=$(pwd)

set -x

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y certbot

# Build domain arguments for certbot
DOMAIN_ARGS=""
PRIMARY_DOMAIN=""
for domain in "$@"; do
    domain=$(echo "$domain" | tr '[:upper:]' '[:lower:]')
    DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
    if [ -z "$PRIMARY_DOMAIN" ]; then
        PRIMARY_DOMAIN="$domain"
    fi
done

echo ""
echo "Generating certificate for: $@"
echo "Primary domain: $PRIMARY_DOMAIN"
echo ""

certbot -v certonly --agree-tos --register-unsafely-without-email --webroot -w $CWD/data/letsencrypt-challenge $DOMAIN_ARGS \
  --deploy-hook "cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem $CWD/config/certificate_chain.crt; \
                 cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem $CWD/data/smtpcert/server.crt; \
                 cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem $CWD/config/private.key; \
                 cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem $CWD/data/smtpcert/server.key"

set +x

# Enable SSL mode
echo "1" > $CWD/config/use_ssl
echo ""
echo ">>> SSL mode enabled"

# Restart proxy to load certificate
docker compose restart proxy 2>/dev/null || true
echo ">>> Proxy restarted with SSL"

# Set up cron jobs (if not already present)
CRON_UPDATED=false
CRON_CONTENT=$(crontab -l 2>/dev/null || true)

if ! echo "$CRON_CONTENT" | grep -q "certbot renew"; then
    CRON_CONTENT="$CRON_CONTENT
0 0 */30 * * cd $CWD && certbot renew --quiet"
    CRON_UPDATED=true
    echo ">>> Added certificate auto-renewal cron job"
fi

if ! echo "$CRON_CONTENT" | grep -q "pg_dump"; then
    mkdir -p /root/backups
    CRON_CONTENT="$CRON_CONTENT
0 3 * * * cd $CWD && docker compose exec -T database pg_dump -U edcom edcom > /root/backups/edcom_\$(date +\\%Y\\%m\\%d).sql
0 4 * * * find /root/backups -name \"edcom_*.sql\" -mtime +7 -delete"
    CRON_UPDATED=true
    echo ">>> Added daily database backup cron job"
fi

if [ "$CRON_UPDATED" = true ]; then
    echo "$CRON_CONTENT" | crontab -
fi

echo ""
echo "======================================"
echo "    SSL Certificate Installed!"
echo "======================================"
echo ""
echo "  Domains: $@"
echo "  Auto-renewal: enabled (cron)"
echo ""
