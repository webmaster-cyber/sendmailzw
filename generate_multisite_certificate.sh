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

echo ""
echo ""
echo "Certificate generated successfully!"
echo ""
echo "Add the following line to crontab -e for automatic 30 day renewal:"
echo ""
echo "0 0 */30 * * cd $CWD && certbot renew --quiet --deploy-hook \"cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem $CWD/config/certificate_chain.crt; cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem $CWD/data/smtpcert/server.crt; cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem $CWD/config/private.key; cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem $CWD/data/smtpcert/server.key\""
echo ""
echo ""
