# SendMail Cutover Plan

## Overview

Migrate from existing VPS to a fresh server with the new codebase, preserving all data.

**Old Server:** 92.119.124.102
**New Server:** [TO BE PROVISIONED]
**Domains:** sendmail.co.zw, app.sendmail.co.zw

---

## Phase 1: Provision New Server

### 1.1 Server Requirements
- Ubuntu 22.04 LTS (recommended)
- Minimum 4GB RAM, 2 vCPU, 50GB SSD
- Dedicated IP address
- Ports open: 80, 443, 587, 2525, 8025

### 1.2 Initial Setup
```bash
# SSH to new server
ssh root@NEW_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | bash

# Install git
apt install -y git

# Clone the repo
git clone https://github.com/webmaster-cyber/edcom-ce.git edcom-install
cd edcom-install
```

---

## Phase 2: Export Data from Old Server

### 2.1 Database Export
```bash
# SSH to OLD server
ssh root@92.119.124.102
cd /root/edcom-install

# Create full database export
docker compose exec -T database pg_dump -U edcom edcom > edcom_export_$(date +%Y%m%d).sql

# Check file size (should be reasonable)
ls -lh edcom_export_*.sql

# Copy to new server
scp edcom_export_*.sql root@NEW_SERVER_IP:/root/
```

### 2.2 Copy Configuration (optional - or reconfigure fresh)
```bash
# From old server, copy config files if you want to preserve settings
scp config/edcom.json root@NEW_SERVER_IP:/root/edcom-install/config/
scp config/commercial_license.key root@NEW_SERVER_IP:/root/edcom-install/config/
```

### 2.3 Copy Uploaded Files
```bash
# Copy images and attachments
rsync -avz data/buckets/ root@NEW_SERVER_IP:/root/edcom-install/data/buckets/
```

---

## Phase 3: Setup New Server

### 3.1 Run Initial Setup
```bash
# On NEW server
cd /root/edcom-install

# Run the setup wizard
./ez_setup.sh
```

This will:
- Prompt for IP address and domain
- Create initial configuration
- Start all containers
- Create an admin account (temporary - will be replaced by imported data)

### 3.1b Build Client-Next
```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Build the new React client
cd /root/edcom-install/client-next
npm install
npm run build
cd ..

# Verify build output exists
ls -la client-next/dist/
```

The built client is automatically served by nginx via volume mount in docker-compose.yml.

### 3.2 Import Database
```bash
# Stop services except database
docker compose stop api tasks cron webhooks segments client proxy

# Drop the fresh database and import your data
docker compose exec -T database psql -U edcom -c "DROP DATABASE edcom;"
docker compose exec -T database psql -U edcom -c "CREATE DATABASE edcom;"
docker compose exec -T database psql -U edcom edcom < /root/edcom_export_*.sql

# Run new schema migrations
docker cp schema/billing.sql edcom-database:/tmp/
docker compose exec -T database psql -U edcom edcom -f /tmp/billing.sql

# Restart all services
docker compose up -d
```

### 3.3 Setup Marketing Site
```bash
# Clone marketing site
git clone https://github.com/webmaster-cyber/sendmail-marketing.git marketing

# Enable multisite mode
./enable_multisite.sh
```

---

## Phase 4: Local Testing (Before DNS Change)

### 4.1 Edit Your Hosts File

**On macOS/Linux:**
```bash
sudo nano /etc/hosts
```

**On Windows:**
```
notepad C:\Windows\System32\drivers\etc\hosts
```

**Add these lines (replace NEW_SERVER_IP):**
```
NEW_SERVER_IP    sendmail.co.zw
NEW_SERVER_IP    www.sendmail.co.zw
NEW_SERVER_IP    app.sendmail.co.zw
```

### 4.2 Test Checklist

After editing hosts file, test in your browser:

**Marketing Site (http://sendmail.co.zw):**
- [ ] Homepage loads
- [ ] Features page loads
- [ ] Pricing page loads (fetches plans from API)
- [ ] Contact form submits successfully
- [ ] All images/logos display correctly

**Main App (http://app.sendmail.co.zw) - New React Client:**
- [ ] Login page loads (new React UI)
- [ ] Can log in with existing credentials
- [ ] Dashboard shows correct data
- [ ] Can view existing campaigns
- [ ] Can view contact lists
- [ ] Can create a test campaign (don't send)
- [ ] Admin section works (if admin user)
- [ ] Plans management page works (admin)
- [ ] API endpoints respond (`/api/me`)

**Note:** SSL won't work yet (certificate is for old server). Test on HTTP first.

### 4.3 Remove Hosts File Entries
After testing, remove or comment out the hosts file entries:
```bash
sudo nano /etc/hosts
# Comment out or delete the lines you added
```

---

## Phase 5: SSL Certificate

### 5.1 Pre-DNS Certificate (optional)
You can generate a certificate before DNS switch using DNS validation, but it's more complex.

### 5.2 Post-DNS Certificate (easier)
Wait until DNS is pointing to new server, then:
```bash
./generate_multisite_certificate.sh sendmail.co.zw app.sendmail.co.zw www.sendmail.co.zw

# Restart proxy to load new certificate
docker compose restart proxy
```

---

## Phase 6: DNS Cutover

### 6.1 Reduce TTL (1 day before)
In your DNS provider, reduce TTL to 300 seconds (5 minutes) for:
- sendmail.co.zw
- www.sendmail.co.zw
- app.sendmail.co.zw

This allows faster rollback if needed.

### 6.2 Final Data Sync
Just before switching DNS, do a final database sync:
```bash
# On OLD server - export latest data
docker compose exec -T database pg_dump -U edcom edcom > edcom_final_export.sql
scp edcom_final_export.sql root@NEW_SERVER_IP:/root/

# On NEW server - import
docker compose stop api tasks cron webhooks segments
docker compose exec -T database psql -U edcom -c "DROP DATABASE edcom;"
docker compose exec -T database psql -U edcom -c "CREATE DATABASE edcom;"
docker compose exec -T database psql -U edcom edcom < /root/edcom_final_export.sql
docker cp schema/billing.sql edcom-database:/tmp/
docker compose exec -T database psql -U edcom edcom -f /tmp/billing.sql
docker compose up -d
```

### 6.3 Update DNS Records
Change A records to point to NEW_SERVER_IP:
- sendmail.co.zw → NEW_SERVER_IP
- www.sendmail.co.zw → NEW_SERVER_IP
- app.sendmail.co.zw → NEW_SERVER_IP

### 6.4 Generate SSL Certificate
Once DNS propagates (check with `dig sendmail.co.zw`):
```bash
./generate_multisite_certificate.sh sendmail.co.zw app.sendmail.co.zw www.sendmail.co.zw
docker compose restart proxy
```

### 6.5 Verify
- [ ] https://sendmail.co.zw loads with valid SSL
- [ ] https://app.sendmail.co.zw loads with valid SSL
- [ ] All functionality works

---

## Phase 7: Post-Cutover

### 7.1 Monitor
- Watch logs: `docker compose logs -f`
- Check for errors in nginx: `tail -f data/logs/nginx/error.log`
- Verify emails are sending

### 7.2 Keep Old Server (1-2 weeks)
Don't terminate the old server immediately. Keep it as a backup:
- If issues arise, point DNS back to old server
- After 1-2 weeks of stable operation, terminate old server

### 7.3 Set Up Backups
```bash
# Add to crontab
crontab -e

# Daily database backup at 3am
0 3 * * * cd /root/edcom-install && docker compose exec -T database pg_dump -U edcom edcom > /root/backups/edcom_$(date +\%Y\%m\%d).sql

# Keep last 7 days
0 4 * * * find /root/backups -name "edcom_*.sql" -mtime +7 -delete
```

### 7.4 SSL Auto-Renewal
```bash
# Add to crontab for certificate renewal
0 0 */30 * * cd /root/edcom-install && certbot renew --quiet
```

### 7.5 Old Client Cleanup (Optional)
The old `client/` directory is no longer used. The new React client (`client-next/`) is built and served via volume mount. You can safely ignore or remove the old client:
```bash
# Remove old client (optional - keeps repo cleaner)
rm -rf /root/edcom-install/client/
```

**Note:** The old client is still in the git repo for reference but is not deployed.

---

## Rollback Procedure

If something goes wrong after DNS switch:

### Quick Rollback (DNS)
1. Point DNS back to old server (92.119.124.102)
2. Wait for propagation (5 min if TTL was lowered)
3. Old server is live again

### Data Rollback (if new server corrupted data)
The old server's database is untouched, so pointing DNS back restores everything.

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Phase 1: Provision server | 30 min |
| Phase 2: Export data | 15 min |
| Phase 3: Setup new server | 45 min |
| Phase 4: Testing | 1-2 hours |
| Phase 5: SSL (post-DNS) | 10 min |
| Phase 6: DNS cutover | 30 min + propagation |
| Phase 7: Monitoring | Ongoing |

**Total: ~3-4 hours** (plus DNS propagation time)

---

## Checklist Summary

### Pre-Cutover
- [ ] New server provisioned
- [ ] Docker installed
- [ ] Node.js installed
- [ ] Code cloned
- [ ] Database exported from old server
- [ ] Database imported to new server
- [ ] Client-next built (`npm run build` in client-next/)
- [ ] Marketing site deployed
- [ ] Local testing passed (via hosts file)
- [ ] TTL reduced on DNS records

### Cutover Day
- [ ] Final database sync
- [ ] DNS records updated
- [ ] SSL certificate generated
- [ ] HTTPS working on all domains
- [ ] Full functionality verified

### Post-Cutover
- [ ] Monitoring in place
- [ ] Backups configured
- [ ] SSL auto-renewal configured
- [ ] Old server kept for 1-2 weeks
- [ ] Old server terminated
