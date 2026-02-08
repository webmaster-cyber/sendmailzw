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

---

## 2026-01-25 — Phase 6: Funnels ✅

### Funnels Feature Complete
Automated email sequence management for tag-based and responder triggers.

**Pages Created:**
- `FunnelsPage.tsx` - List view with search, status toggle, duplicate, delete
- `FunnelSettingsPage.tsx` - Create/edit with type selection (tags/responders)
- `FunnelMessagesPage.tsx` - Message sequence with timing indicators and stats
- `FunnelMessageEditPage.tsx` - Full-width Beefree editor with tabs (Message, Settings, Tagging, Suppression)
- `FunnelMessageStatsPage.tsx` - Analytics with domain breakdown table

**Types Added:**
- `funnel.ts` - Funnel, FunnelMessage, FunnelMessageRef, MessageDomainStats interfaces

**Key Implementation Details:**
- Tag-based funnels: contacts enter when tagged, exit when receiving exit tags
- Responder funnels: triggered from broadcast review page or form contacts tab
- Full-width editor on Message tab, constrained width on other tabs
- Beefree save triggered before API calls using ref for immediate access
- Messages stored in funnel.messages array for proper duplication support

**Fixes During Implementation:**
- Use `/api/userroutes` instead of admin-only `/api/routes`
- Save `rawText` (not `parts`) for beefree message type
- Load `rawText` when reopening messages for editing
- Maintain `funnel.messages` array on add/duplicate/delete
- Info boxes explaining trigger mechanisms for both funnel types

---

## 2026-01-25 — Phase 6b: Transactional Templates ✅

### Transactional Feature Complete
API-triggered transactional email management with templates, analytics, and activity logging.

**Pages Created:**
- `TransactionalPage.tsx` - Dashboard with tag stats chart, date range filter
- `TransactionalTemplatesPage.tsx` - Template list with grid cards, search, CRUD actions
- `TransactionalTemplateEditPage.tsx` - Template editor with Beefree/HTML toggle, test email modal
- `TransactionalTagPage.tsx` - Tag detail view with stats cards and activity chart
- `TransactionalDomainsPage.tsx` - Domain breakdown table for a tag
- `TransactionalMessagesPage.tsx` - Bounce messages with hard/soft/complaint tabs
- `TransactionalLogPage.tsx` - Activity log with pagination, filters, export
- `TransactionalSettingsPage.tsx` - Default route and open tracking settings

**Types Added:**
- `transactional.ts` - TransactionalTemplate, TransactionalTag, TransactionalStats, TransactionalDomainStats, TransactionalBounceMessage, TransactionalLogEntry, TransactionalSettings

**Key Implementation Details:**
- Date range filters (7/30/90 days) on all analytics pages
- Recharts BarChart for send activity visualization
- Tabs for bounce message types (hard/soft/complaint)
- Pagination on activity log (10 per page)
- Export functionality for log data
- Test email modal with JSON variable substitution
- Beefree editor reused from funnels with `transactional` prop

**Routes Added:**
- `/transactional` - Dashboard
- `/transactional/templates` - Template list
- `/transactional/template?id=` - Template editor
- `/transactional/tag?id=` - Tag detail
- `/transactional/domains?tag=` - Domain breakdown
- `/transactional/messages?tag=&domain=` - Bounce messages
- `/transactional/log` - Activity log
- `/transactional/settings` - Settings

---

## 2026-01-25 — Campaign Activity API ✅

### API Endpoint Created
Added `/api/contactactivity/{email}` endpoint to fetch campaign activity for a specific contact.

**Backend Changes:**
- Added `ContactActivity` class to `/api/campaigns.py`
- Queries `camplogs` table joined with `campaigns` for rich data
- Returns: campaign_id, campaign_name, subject, sent_at, event_type, timestamp, code
- Supports pagination (100 records per page)
- Optional `event_type` filter parameter

**Frontend Changes:**
- Updated `src/types/contact.ts` with `ContactActivityRecord` and `ContactActivityResponse` types
- Updated `src/features/contacts/ContactEditPage.tsx`:
  - Fetches activity from new API endpoint
  - Displays activity in table with campaign name, event badge, timestamp
  - Pagination for large activity lists
  - Event type color-coded badges (send/open/click/bounce/etc.)

**Route Added:**
- `GET /api/contactactivity/{email}` - Returns paginated campaign activity

---

## 2026-01-25 — Phase 7: Forms + Integrations ✅

### Forms Feature Complete
Subscription form builder with embed code generation.

**Pages Created:**
- `FormsPage.tsx` - Form list with search, CRUD actions
- `FormSettingsPage.tsx` - Form editor with field configuration, styling, embed code

### Integrations Feature Complete
API/SMTP credentials and webhook management.

**Pages Created:**
- `ConnectPage.tsx` - API keys, SMTP credentials display
- `WebhooksPage.tsx` - Webhook list with status toggle
- `WebhookEditPage.tsx` - Webhook configuration (events, URL, headers)

### Suppression Feature Complete
Bounce and exclusion list management.

**Pages Created:**
- `SuppressionPage.tsx` - Suppression list with tabs (Bounced/Unsubscribed/Complained/Exclusions)
- `SuppressionEditPage.tsx` - View/edit suppression entry details
- `ExclusionAddPage.tsx` - Add emails to exclusion list

### Additional Features
- `ThrottlesPage.tsx` / `ThrottleEditPage.tsx` - Domain throttle management
- `ChangePasswordPage.tsx` - Password change form
- `ExportsPage.tsx` - Data export management

---

## 2026-01-27 — Phase 8: Admin Backend ✅

### Admin Infrastructure Management Complete
Full admin backend for managing servers, policies, routes, connections, warmups, and reports.

**Servers Management:**
- `ServersPage.tsx` - Server list with status indicators
- `ServerEditPage.tsx` - Server configuration with IP/domain settings, DKIM entries

**Delivery Policies:**
- `PoliciesPage.tsx` - Policy list with publish status badges
- `PolicyEditPage.tsx` - Full policy editor (connection settings, deferral handling, server allocation)
- Publish/revert functionality with dirty state tracking

**Postal Routes:**
- `RoutesPage.tsx` - Route list with publish/unpublish actions
- `RouteEditPage.tsx` - Route rules editor with domain groups and policy splits
- Added unpublish endpoint (`/api/routes/{id}/unpublish`) for taking routes offline temporarily

**Connections:**
- `MailgunPage.tsx` / `MailgunEditPage.tsx` - Mailgun API connections
- `SESPage.tsx` / `SESEditPage.tsx` - Amazon SES connections
- `SMTPRelaysPage.tsx` / `SMTPRelayEditPage.tsx` - Custom SMTP relay connections
- Removed deprecated SparkPost and Easylink integrations

**IP Warmups:**
- `WarmupsPage.tsx` - Warmup list with status badges and progress indicators
- `WarmupEditPage.tsx` - Warmup schedule editor with preview, day overrides, server/IP selection

**Reports:**
- `AdminLogPage.tsx` - Activity log with user actions, timestamps, clickable entity links
- `EmailDeliveryPage.tsx` - Delivery charts (daily/hourly) with date range filters using recharts
- `IPDeliveryPage.tsx` - Per-IP delivery statistics table with sortable columns
- `CustomerBroadcastsPage.tsx` - Cross-customer broadcast stats (By Customer / By Broadcast views)

**Admin Dashboard Improvements:**
- Service stat cards (Customers, Servers, Policies, Routes, Warmups, Connections)
- Today's Delivery section with delivery rate percentage and breakdown
- Server Status section with health badges
- Recent Activity section (5 most recent actions, newest first)

**Backend Changes:**
- Added `RouteUnpublish` class to `backends.py`
- Registered `/api/routes/{id}/unpublish` endpoint in `app.py`

**Fixes:**
- Activity log field names corrected (snake_case: user_name, pre_msg, link_msg, etc.)
- Activity sorted newest-first on both dashboard and log page
- Removed SparkPost/Easylink from sidebar, routes, and types

**Types Added:**
- Extended `admin.ts` with Warmup, DeliveryPolicy, MailgunConnection, SESConnection, SMTPRelayConnection interfaces

---

## 2026-01-27 — Phase 9: Multi-Brand Polish ✅

### Theme Editor in FrontendEditPage
Added visual theme editor with color pickers instead of requiring raw CSS knowledge.

**Features:**
- Color pickers for: Primary, Primary Hover, Accent, Sidebar (4-column grid)
- Live preview showing sidebar and button colors
- Additional CSS textarea for custom styles beyond theme colors
- Generated CSS preview showing the final output
- Theme colors stored as CSS variables in `customcss` field
- Removed "Top Navigation" color (not used - TopBar uses bg-surface)
- Removed "Use Brand Image on Login Screen" checkbox (login always shows SendMail)

**Sidebar Logo Fix:**
- Updated `Sidebar.tsx` to use `userFrontend?.image || loginFrontend?.image`
- Fixed `getImagePath()` to preserve base64 data URLs (was stripping `data:` prefix)
- Users now see their assigned frontend's logo after login

**Collapsible Sidebar:**
- Added collapse/expand toggle at bottom of sidebar (desktop only)
- Collapsed state shows icons only with tooltips on hover
- State persisted in localStorage
- Smooth transition animation

**Login Page Simplification:**
- Login page always shows static `/logo.svg` (SendMail branding)
- Removed brand-specific logo/CSS from login - branding only after login
- Fixed CSS clearing on logout (`applyFrontend(null)` now called)

**Vite Proxy Fix:**
- Fixed `/l` proxy matching `/logo.svg` - changed to regex `^/l(\\?.*)?$`
- Static files in `public/` now served correctly

**Nginx Config Update:**
- Updated `nginx.server.conf` to proxy to Vite dev server on port 5173
- Added `/i/` location for image proxying

**How it works:**
1. Admin edits a Frontend and sets theme colors via color pickers
2. Colors are saved as CSS variable overrides in the `customcss` field
3. When user logs in, `App.tsx` calls `applyFrontend(user.frontend)`
4. `BrandContext` injects the customcss into the page
5. All Tailwind classes using CSS variables update automatically
6. On logout, `applyFrontend(null)` clears the custom CSS

---

## 2026-02-08 — Pre-Deployment Audit & Gap Fixes

### Full Codebase Audit ✅
Ran 5 parallel audit agents across the entire codebase:
- Routes & navigation: 86 routes, 80 page components, all sidebar links verified
- Feature pages: all pages fully implemented, no stubs or placeholders
- Shared components & hooks: comprehensive coverage, all core components present
- Backend API: all 18 new endpoints registered, billing schema complete, webhook handlers in place
- Marketing site & deployment: all 7 pages, SEO setup, deployment scripts ready

### Auth Pages Added ✅
- `ResetPasswordPage.tsx` - Forgot password (enter email) and reset with key (from email link) flows
- `ActivatePage.tsx` - Account activation for self-signup users with resend code support
- `WelcomePage.tsx` - Post-signup password setup, redirects to dashboard on completion
- Routes: `/reset`, `/emailreset` (public), `/activate` (public), `/welcome` (protected)
- All pages match LoginPage styling (centered card on branded background)

### ErrorBoundary Added ✅
- `src/components/feedback/ErrorBoundary.tsx` - React class component for crash handling
- Shows friendly error card with reload button and dashboard link
- Wraps entire app in `App.tsx`

### Route Constants Fixed ✅
- Fixed 14 stale path constants (e.g. `/customers` → `/admin/customers`)
- Removed 3 dead constants (ZAPIER, PABBLY, old WELCOME)
- Added 50+ missing constants for all sub-routes
- Every constant now has 1:1 match with App.tsx routes

### Marketing Site .env Fixed ✅
- `PUBLIC_APP_URL` and `PUBLIC_API_URL` corrected from `localhost:5173` to `localhost:3000`
- Added documentation comments for `PUBLIC_SIGNUP_ID` configuration

### TypeScript Fixes ✅
- Fixed unused `gateways` variable in `PaymentGatewaysPage.tsx`
- Removed unused `toast` import in `BillingPage.tsx`
- Both projects compile cleanly (zero errors)

---

## Production Server Reference
- IP: `92.119.124.102`
- Install path: `/root/edcom-install/`
- Restart: `cd /root/edcom-install && ./restart.sh`
- License: `E246BF-CC8F7D-F6234E-E24C9B-E148B7-V3`
