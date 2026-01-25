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

## Remaining Migration Phases

### Phase 8: Admin Backend 🔲
- [ ] Customers management (list, create, edit, impersonate)
- [ ] Servers management
- [ ] Delivery Policies
- [ ] Postal Routes
- [ ] Connections (SMTP Relay, Mailgun, SES, SparkPost, Easylink)
- [ ] Reports (Customer Broadcasts, Email Delivery, IP Delivery, Admin Log)
- [ ] Frontend/template management
- [ ] Sign-up page settings

### Phase 9: Multi-Brand Polish 🔲
- [ ] Brand CSS files (betting, fanzone, agriculture, mwosfc)
- [ ] Feature flags per brand
- [ ] Brand-specific logos/favicons

### Phase 10: Payment Gateway Abstraction 🔲
- [ ] Payment gateway interface (abstract provider)
- [ ] Paynow/EcoCash integration (Zimbabwe)
- [ ] Stripe integration (international)
- [ ] Plan definitions, usage metering

### Phase 11: Public Signup + Plans 🔲
- [ ] Self-service signup flow with email verification
- [ ] Free tier auto-provisioning
- [ ] Upgrade/downgrade UI
- [ ] Usage indicators and warning emails

### Phase 12: Marketing Site 🔲
- [ ] Astro project for sendmail.co.zw
- [ ] Keystatic CMS for content editing
- [ ] SEO optimization

### Phase 13: Cutover 🔲
- [ ] Update Docker/nginx to serve new client
- [ ] Remove old `client/` directory
- [ ] Performance + accessibility audit

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
- IP: `92.119.124.102`
- Install path: `/root/edcom-install/`
- Restart: `cd /root/edcom-install && ./restart.sh`
- License: `E246BF-CC8F7D-F6234E-E24C9B-E148B7-V3`
