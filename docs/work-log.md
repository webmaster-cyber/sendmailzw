# Work Log

## 2026-01-24 — Project Setup

### Done
- Forked `emaildelivery/edcom-ce` to `webmaster-cyber/edcom-ce`
- Cloned to `/Users/davidmcallister/Desktop/sendmail/edcom-ce`
- Installed Docker Desktop
- Built base images (`dev/build_node_base.sh`, `dev/build_python_base.sh`)
- Built and started all services with `docker compose --profile=lite up --build -d`
- Created config: `config/edcom.json` (admin_url → localhost:3000), `.env` (PLATFORM_IP=0.0.0.0)
- Added commercial license key to `config/commercial_license.key`
- Created admin account: `david@kirbybrowne.com` / company: Sendmail.co.zw
- Fixed password hash (shell escaping mangled `??P4r4n01d!!` during initial create)
- All 8 containers running: database, cache, api, tasks, cron, smtprelay, client, proxy

### Codebase Assessment
- Backend (Python/Falcon): solid, modern, well-typed
- Frontend (React 15.6.2): severely outdated, needs full modernization
- Decision: fresh Vite + React 18 + TypeScript + Tailwind app, port screens incrementally

### Migration Plan Created
- See `docs/migration-plan.md` for full details
- 10 phases, starting with login → dashboard proof of concept
- Multi-brand theming via CSS custom properties + Tailwind
- Headless UI for accessible, unstyled component primitives

### Decisions Made
- UI library: Tailwind CSS + Headless UI (maximum whitelabel flexibility)
- Migration approach: Fresh Vite app, port screens incrementally
- Payment gateways: Paynow/EcoCash (ZW) + Stripe (international), abstracted interface
- Future roadmap documented: SMS/WhatsApp, agency model, A/B testing, landing pages, etc.

---

## 2026-01-25 — Phases 1-5 Complete + Contacts Enhancements

### Phase 1: Foundation + Login → Dashboard ✅
- Scaffolded `client-next/` with Vite + React 18 + TypeScript + Tailwind
- Implemented AuthContext and BrandContext
- Built AppShell (sidebar + topbar navigation)
- Created Login page with brand theming
- Core UI components: Button, Input, Modal, Tabs, Select, Badge
- Docker service running on port 5173

### Phase 2: Broadcasts List ✅
- DataTable, Tabs, SearchInput, Pagination, ConfirmDialog components
- Broadcasts list with Sent/Scheduled/Drafts tabs
- Polling hook, toast notifications (sonner)
- Empty/loading states

### Phase 3: Broadcast Create/Edit ✅
- Broadcast wizard (Settings → Template → Recipients → Review)
- BeefreeEditor component wrapping window.BeePlugin
- Code editor for raw HTML
- react-hook-form integration

### Phase 4: Broadcast Reports ✅
- Summary, Heatmap, Domains, Messages, Details pages
- Chart components using recharts 2.x
- Full analytics for sent broadcasts

### Phase 5: Contacts + Segments ✅
- Contact lists page with grid/table views
- List detail page with subscriber table
- Add contacts (manual + CSV upload)
- Find/search contacts with filters
- Edit contact page with properties

### Contacts Feature Enhancements ✅
Extended Phase 5 with additional features based on reference designs:

**New Shared Components:**
- `Badge.tsx` - Reusable status badges (success/warning/danger/info)
- `AreaChart.tsx` - Recharts-based growth visualization
- `NoticeBanner.tsx` - Dismissible info/warning banners

**Lists Page (ContactsPage.tsx):**
- Table view (now default) with sortable columns
- Search filter for lists by name
- Grid/table view toggle
- Correct active subscriber calculation

**List Detail Page (ContactsFindPage.tsx):**
- Status donut chart (Active/Unsub/Bounced/Complained breakdown)
- Subscriber growth area chart
- Action bar (Add Subscribers, Mass Unsubscribe, Export, Delete)
- Sortable columns (Name, Email, Last Activity, Status)
- Default sort by most recent activity
- Status badges per row
- Inline unsubscribe/delete buttons

**Contact Edit Page (ContactEditPage.tsx):**
- Contact info card with avatar, email, list memberships
- Notes field with yellow notepad styling
- Campaign activity placeholder section

**API Enhancements:**
- Added `!!lastactivity` field to segments.py (greatest of: added, last open, last click)
- Updated lists.py `fix_row()` to include `!!lastactivity` and `!!added` in responses

### Phase 6: Funnels ✅
- Funnels list page with status indicators
- Funnel settings page (create/edit)
- Funnel messages page with message list
- Funnel message edit page with template editor
- Funnel message stats page

### Phase 6b: Transactional ✅
- Transactional overview page with tag stats
- Templates list and edit pages
- Tag detail page with message stats
- Domains management page
- Messages log with filtering
- Settings page

### Phase 7: Subscribe Forms ✅
- Forms list page (table layout)
- Form settings page (create/edit with tags, success messages)
- List subscribe form page (forms filtered by list)
- Backend form rendering with card-style layout (version 3)
- Form preview and embed code generation
- Mobile-responsive form design with centered card layout

### Campaign Activity API ✅
- API endpoint for contact campaign activity
- Shows campaigns received and interactions (opens, clicks)

### Integrations - Webhooks ✅
- Webhooks list page (table layout)
- Webhook create/edit page with name, URL, event type
- Test webhook modal with custom payload and response display
- Example payload preview for each event type
- 14 event types supported (form_submit, list_add, tag_add, etc.)
- Sidebar navigation updated

### API & SMTP Connection Page ✅
- API key display with copy button
- Reset API key functionality with confirmation
- SMTP relay configuration display (host, port, credentials)
- REST API curl example with copy button
- Links to API documentation
- Info boxes for authentication and Cloudflare notes

### Suppression & Exclusion Lists ✅
- Suppression lists page with card layout and circular count badges
- Tabs for switching between Suppression and Exclusion lists
- Suppression lists: user-created, supports create/edit/delete, CSV import via S3
- Exclusion lists: fixed system lists (Do Not Email, Malicious, Domains), add-only
- ExclusionAddPage for adding emails/domains to exclusion lists

### Domain Throttles ✅
- Throttles list page with route and limit display
- Create/edit throttle with domain wildcards support (e.g., `yahoo.*`, `*.edu`)
- Activate/deactivate toggle

### Settings Pages ✅
- Change Password page with current password verification before allowing change
- Data Exports page with download buttons, processing status, auto-refresh

### Sidebar & Navigation ✅
- Added "Data" section with Exports link (was hidden in user menu)
- Fixed `brand-primary` → `primary` color class across multiple files

---

## 2026-01-26 — Phase 8: Admin Backend (In Progress)

### Customers Management ✅
- `CustomersPage.tsx` - List customers with filtering (all, banned, waiting approval, free trial, ended, paid, paused, probation)
- `CustomerEditPage.tsx` - Create/edit customer settings (name, frontend, routes, send limits, trial expiration, credits)
- `CustomerUsersPage.tsx` - Manage users for a customer (list, create, edit, delete, reset API key, password reset)
- `CustomerListApprovalPage.tsx` - Approve pending contact lists with validation results
- `UserEditPage.tsx` - Create/edit user accounts with password strength validation
- Bulk actions: approve, ban, unban, pause, unpause, purge queues (BC/funnel/trans), delete
- Action bar on all customer tabs (Settings, Users, List Approval) for consistent UX
- Impersonation opens in new tab (sessionStorage per-tab isolation)
- Password strength validation with visual indicator and generator
- Admin types defined in `src/types/admin.ts`

### Frontend Configuration ✅
- `FrontendsPage.tsx` - List frontend configurations with approval/trial status
- `FrontendEditPage.tsx` - Create/edit frontend with 6 tabbed sections:
  - Profile (name, brand image, favicon, use on login)
  - Custom CSS (custom stylesheet rules)
  - Alert Thresholds (global bounce/complaint rates, per-domain settings up to 5)
  - Send Limits (approval required, trial settings, default limits, auto-pause thresholds)
  - Header Template (custom email headers with variables, encoding options)
  - Email Settings (password reset/signup email from name/email, API connection)
- Routes: `/admin/frontends`, `/admin/frontends/edit`

### New Shared Components
- `Checkbox.tsx` - Checkbox with label and description
- `DataTable.tsx` - Generic sortable data table with selection support
- Updated `Input.tsx` - Added multiline/textarea support
- Updated `Tabs.tsx` - Added onClick and onChange support for navigation/state tabs
- Updated `ConfirmDialog.tsx` - Added children prop and variant alias

### Admin Sidebar Navigation
- Updated all admin routes to use `/admin/` prefix
- Customer Accounts → `/admin/customers`
- Advanced Config button → `/admin/frontends`

---

## 2026-01-28 — Phase 12: Marketing Site Complete

### Marketing Site (sendmail-marketing) ✅
- Astro + Keystatic CMS project scaffolded in `../sendmail-marketing/`
- Hybrid rendering mode with Node.js adapter for CMS admin
- Tailwind CSS styling with CSS custom properties for brand colors

### CMS Content Management ✅
- **Singletons**: Homepage, About, Contact, Site Settings
- **Collections**: Features, Feature Groups, FAQs, Testimonials
- All content editable via `/keystatic` admin UI

### Site Settings (CMS-Driven Branding) ✅
- Logo, white logo, and favicon uploadable via CMS
- Brand colors (primary, hover, dark) configurable as hex values
- Site name, description, app URL, API URL, signup ID
- Contact email, social links (Twitter, LinkedIn)

### Pages ✅
- Homepage with hero, features, CTA sections
- Features page loading from CMS feature groups
- Pricing page fetching plans from `/api/public/plans`
- About page with story, mission, values
- Contact page with form and contact info
- Privacy Policy and Terms of Service pages

### Contact Form ✅
- Form submits to `/api/public/contact` endpoint
- Honeypot field for basic spam prevention
- Rate limiting (5 requests per IP per hour)
- Phone number field (optional)
- Email obfuscation (base64 encoded, decoded client-side)

### Admin Contact Messages ✅
- `ContactMessagesPage.tsx` in main app for viewing submissions
- Table view with status (new/read/replied), search, filtering
- Modal detail view with reply via email button
- Bulk actions: mark read, mark replied, delete
- Route: `/admin/contact-messages`

### Backend Additions ✅
- `contact_messages` table in `schema/billing.sql`
- `PublicContact` endpoint in `api/billing.py` (public, no auth)
- `ContactMessages` and `ContactMessage` admin endpoints
- Custom SQL (not CRUDCollection) to avoid company ID filtering

### SEO Optimization ✅
- Open Graph tags (og:title, og:description, og:image, og:url)
- Twitter Card tags (summary_large_image) with configurable handle
- Canonical URLs on all pages
- Google Site Verification meta tag support
- robots.txt (allows all, blocks /keystatic/)
- sitemap.xml (static, 7 public pages)

### CMS-Editable SEO ✅
- **Site Settings**: Social share image, Twitter handle, Google verification code
- **Page SEO singleton**: Per-page titles and descriptions for homepage, features, pricing, about, contact

### Deployment Infrastructure ✅
- Created `upgrade.sh` script for safe VPS upgrades
- Automatic database backup before changes
- Runs schema migrations (billing.sql)
- Rebuilds and restarts containers
- Includes rollback instructions if needed

---

## Remaining Migration Phases

### Phase 8: Admin Backend ✅
- [x] Customers management (list, create, edit, impersonate)
- [x] Frontend configuration
- [x] Servers management (ServersPage, ServerEditPage)
- [x] Delivery Policies (PoliciesPage, PolicyEditPage)
- [x] Postal Routes (RoutesPage, RouteEditPage)
- [x] Connections (SMTP Relay, Mailgun, SES)
- [x] Reports (Customer Broadcasts, Email Delivery, IP Delivery, Admin Log)
- [x] Sign-up page settings (SignupPage)
- [x] IP Warmups (WarmupsPage, WarmupEditPage)

### Phase 9: Multi-Brand Polish ✅
- [x] Brand theming via CSS custom properties
- [x] Feature flags per brand
- [x] Brand-specific logos/favicons

### Phase 10: Plans + Subscriptions ✅
- [x] Plan CRUD (PlansPage, PlanEditPage)
- [x] Subscription model with trial support
- [x] BillingPage (customer plan & usage view)
- [x] InvoicesPage (invoice history)
- [x] Subscription cron job (check_subscriptions)

### Phase 11: Payment Gateways ✅
- [x] Payment gateway abstraction (PaymentGateway ABC)
- [x] Paynow/EcoCash integration
- [x] Stripe integration
- [x] PaymentGatewaysPage (admin config)
- [x] CheckoutPage (customer payment flow)
- [x] Webhook handlers (Paynow, Stripe)

### Phase 12: Marketing Site ✅
- [x] Astro project for sendmail.co.zw
- [x] Keystatic CMS for content editing
- [x] Contact form with spam prevention
- [x] SEO optimization (OG tags, Twitter cards, sitemap, robots.txt)
- [x] CMS-editable SEO (per-page titles/descriptions, social image, Google verification)

### Phase 13: Cutover ✅
- [x] Created `upgrade.sh` for safe deployments (backup, migrate, rebuild, restart)
- [x] Added client-next build step to `upgrade.sh`
- [x] Updated `docker-compose.yml` to mount `client-next/dist` as nginx html root
- [x] Added multisite support for marketing + main app on same server
- [x] Created `enable_multisite.sh` script
- [x] Created `generate_multisite_certificate.sh` for SAN SSL certs
- [x] Created `config/nginx.ssl.multisite.conf` for domain-based routing
- [x] Created comprehensive `docs/cutover-plan.md` with 7 phases
- [x] Provision new server (89.167.22.171)
- [x] Export data from old server (92.119.124.102)
- [x] Run install on new server
- [x] Build client-next (`npm run build`)
- [x] Import database
- [x] Deploy marketing site (`./enable_multisite.sh`)
- [x] Update DNS records
- [x] Generate SSL certificate
- [x] Verify production — both sites live

---

## 2026-02-08 — Pre-Deployment Audit & Gap Fixes

### Full Codebase Audit ✅
- 5 parallel audit agents verified routes, feature pages, shared components, backend API, and deployment infrastructure
- 86 routes, 80 page components, all fully implemented — no stubs or placeholders
- Backend API complete: all billing/payment/subscription endpoints, webhook handlers, schema

### Gaps Fixed ✅
- [x] Added auth pages: ResetPasswordPage, ActivatePage, WelcomePage (required for self-signup flow)
- [x] Added ErrorBoundary component for crash resilience
- [x] Fixed 14 stale route constants, removed 3 dead ones, added 50+ missing
- [x] Fixed marketing site .env URLs (were pointing to wrong port)
- [x] Fixed 2 TypeScript errors (unused variables)
- [x] Both client-next and marketing site compile cleanly

---

## 2026-02-08 — Phase 13: Production Cutover Complete

### Repo Cleanup ✅
- Deleted old `client/` directory (82,711 lines removed)
- Removed `services/node-base.Dockerfile`, `services/client.Dockerfile`, `services/client-build.Dockerfile`
- Updated `services/proxy.Dockerfile` to copy from `client-next/dist/`
- Removed old client references from dev build scripts and CONTRIBUTING.md
- Renamed `setup_from_source.sh` → `install.sh`
- Renamed GitHub repo from `edcom-ce` → `sendmailzw`

### Install Script (install.sh) — Fully Automated ✅
- Auto-installs git, Docker, Node.js if missing
- Collects IP, domain, Beefree license key, admin credentials upfront
- Writes production nginx config (static file serving, not Vite proxy)
- Removes dev override files that block production startup
- Builds all Docker images and client-next
- Runs database migrations and creates admin account
- Uses `proxy.Dockerfile` (not `proxy-dev.Dockerfile`) for SSL support

### Production Deployment ✅
- New server: 89.167.22.171 (Ubuntu)
- Database imported from old server (92.119.124.102)
- Marketing site deployed via `enable_multisite.sh`
- SSL certificates generated for sendmail.co.zw, app.sendmail.co.zw, www.sendmail.co.zw
- Auto-renewal cron job and database backup cron configured

### Runtime Bugs Fixed ✅
- **crypto.randomUUID crash**: Requires HTTPS; added fallback `(crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))` in ContactsFindPage and RouteEditPage
- **toLocaleString crash**: 35 unguarded `.toLocaleString()` calls across 22 files; added `?? 0` null-coalescing
- **White screen (dev nginx config)**: install.sh now writes production nginx config with `try_files`
- **"no service selected"**: docker-compose.override.yml auto-loaded; install.sh now removes dev overrides
- **SSL not activating**: Changed install.sh to use proxy.Dockerfile (has SSL CMD); added nginx.ssl.conf volume mount
- **Admin creation failure**: Collect credentials in install.sh, pass as args to create_admin.py

### Deployment Scripts Updated ✅
- `upgrade.sh` — Fixed for production (no Dockerfile rebuilds, proper health checks)
- `generate_multisite_certificate.sh` — Now fully automated: enables SSL mode, restarts proxy, sets up cron jobs
- `docker-compose.yml` — Added nginx.ssl.conf volume mount to proxy service

### Key Commits
1. `9c92725` — Remove old client/ and clean up for standalone deployment
2. `288224f` — Make install.sh fully self-contained with dependency installation
3. `b1e78d4` — Prepare for repo rename to sendmailzw
4. `42bbb28` — Remove dev override files during install
5. `58d7d56` — Fix admin account creation in install.sh
6. `cd61070` — Add Beefree license key prompt to install.sh
7. `69dc52a` — Write production nginx config during install
8. `b151388` — Fix crypto.randomUUID crash on HTTP
9. `23fe5b8` — Guard all toLocaleString calls against undefined API values
10. `f4c1d52` — Fix upgrade.sh for production use
11. `6e9b105` — Mount nginx.ssl.conf into proxy container
12. `e2f361f` — Use production proxy.Dockerfile in install script
13. `b6bf5d4` — Automate SSL activation and cron setup in cert script

---

## Backlog (Lower Priority)
- [ ] Zapier/Pabbly integrations - verify if still supported
- [ ] Visual form builder (drag-and-drop)
- [ ] Additional reporting features

---

## Future Roadmap (Post-Migration)
See `docs/future-roadmap.md` for details:
- Priority 0: Universal Bounce Ingestion Service
- Priority 1: SMS + WhatsApp channels
- Priority 2: A/B Testing
- Priority 3: Contact Verification
- Priority 4: Reseller/Agency Model
- Priority 5: Landing Pages
- Priority 6: Automation Upgrades

---

## Production Server Reference
- **New server**: `89.167.22.171`
  - Install path: `/root/edcom-install/`
  - URLs: https://app.sendmail.co.zw (app), https://sendmail.co.zw (marketing)
  - Restart: `cd /root/edcom-install && docker compose restart`
  - Upgrade: `cd /root/edcom-install && ./upgrade.sh`
  - License: `E246BF-CC8F7D-F6234E-E24C9B-E148B7-V3`
- **Old server** (decommission after 1-2 weeks): `92.119.124.102`
