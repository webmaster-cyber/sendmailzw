// Route path constants for use across the application
// Keep in sync with route definitions in App.tsx
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  RESET_PASSWORD: '/reset',
  EMAIL_RESET: '/emailreset',
  ACTIVATE: '/activate',
  WELCOME: '/welcome',

  // Broadcasts
  BROADCASTS: '/broadcasts',
  BROADCAST_SETTINGS: '/broadcasts/settings',
  BROADCAST_TEMPLATES: '/broadcasts/templates',
  BROADCAST_TEMPLATE: '/broadcasts/template',
  BROADCAST_RECIPIENTS: '/broadcasts/rcpt',
  BROADCAST_REVIEW: '/broadcasts/review',
  BROADCAST_SUMMARY: '/broadcasts/summary',
  BROADCAST_HEATMAP: '/broadcasts/heatmap',
  BROADCAST_DOMAINS: '/broadcasts/domains',
  BROADCAST_DETAILS: '/broadcasts/details',
  BROADCAST_MESSAGES: '/broadcasts/messages',
  BROADCAST_SUMMARY_SETTINGS: '/broadcasts/summarysettings',

  // Contacts
  CONTACTS: '/contacts',
  CONTACTS_EDIT: '/contacts/edit',
  CONTACTS_ADD: '/contacts/add',
  CONTACTS_FIND: '/contacts/find',
  CONTACT_EDIT: '/contacts/contact',
  CONTACTS_DOMAINS: '/contacts/domains',
  CONTACTS_TAGS: '/contacts/tags',
  CONTACTS_FIELDS: '/contacts/fields',
  CONTACTS_SETTINGS: '/contacts/settings',
  CONTACTS_SUBSCRIBE: '/contacts/subscribe',

  // Segments
  SEGMENTS: '/segments',
  SEGMENT_EDIT: '/segments/edit',

  // Forms
  FORMS: '/forms',
  FORM_NEW: '/forms/new',
  FORM_SETTINGS: '/forms/settings',

  // Funnels
  FUNNELS: '/funnels',
  FUNNEL_SETTINGS: '/funnels/settings',
  FUNNEL_MESSAGES: '/funnels/messages',
  FUNNEL_MESSAGE_EDIT: '/funnels/message',
  FUNNEL_MESSAGE_STATS: '/funnels/message/stats',

  // Transactional
  TRANSACTIONAL: '/transactional',
  TRANSACTIONAL_TEMPLATES: '/transactional/templates',
  TRANSACTIONAL_TEMPLATE: '/transactional/template',
  TRANSACTIONAL_TAG: '/transactional/tag',
  TRANSACTIONAL_DOMAINS: '/transactional/domains',
  TRANSACTIONAL_MESSAGES: '/transactional/messages',
  TRANSACTIONAL_LOG: '/transactional/log',
  TRANSACTIONAL_SETTINGS: '/transactional/settings',

  // Integrations
  WEBHOOKS: '/integrations/webhooks',
  WEBHOOK_EDIT: '/integrations/webhooks/edit',
  CONNECT: '/connect',

  // Suppression
  SUPPRESSION: '/suppression',
  SUPPRESSION_NEW: '/suppression/new',
  SUPPRESSION_EDIT: '/suppression/edit',
  EXCLUSION_ADD: '/exclusion/add',

  // Throttles
  THROTTLES: '/domainthrottles',
  THROTTLE_EDIT: '/domainthrottles/edit',

  // Settings
  CHANGE_PASSWORD: '/changepass',
  EXPORTS: '/exports',

  // Admin
  CUSTOMERS: '/admin/customers',
  CUSTOMER_EDIT: '/admin/customers/edit',
  CUSTOMER_USERS: '/admin/customers/users',
  CUSTOMER_LIST_APPROVAL: '/admin/customers/approval',
  USER_EDIT: '/admin/users/edit',
  FRONTENDS: '/admin/frontends',
  FRONTEND_EDIT: '/admin/frontends/edit',
  SERVERS: '/admin/servers',
  SERVER_EDIT: '/admin/servers/edit',
  POLICIES: '/admin/policies',
  POLICY_EDIT: '/admin/policies/edit',
  ROUTES: '/admin/routes',
  ROUTE_EDIT: '/admin/routes/edit',
  MAILGUN: '/admin/mailgun',
  MAILGUN_EDIT: '/admin/mailgun/edit',
  SES: '/admin/ses',
  SES_EDIT: '/admin/ses/edit',
  SMTP_RELAYS: '/admin/smtprelays',
  SMTP_RELAY_EDIT: '/admin/smtprelays/edit',
  ADMIN_LOG: '/admin/log',
  EMAIL_DELIVERY: '/admin/emaildelivery',
  IP_DELIVERY: '/admin/ipdelivery',
  CUST_BROADCASTS: '/admin/custbcs',
  WARMUPS: '/admin/warmups',
  WARMUP_EDIT: '/admin/warmups/edit',
  SIGNUP_SETTINGS: '/admin/signup',
  PLANS: '/admin/plans',
  PLAN_EDIT: '/admin/plans/edit',
  GATEWAYS: '/admin/gateways',
  CONTACT_MESSAGES: '/admin/contact-messages',

  // Billing
  BILLING: '/billing',
  INVOICES: '/billing/invoices',
  CHECKOUT: '/billing/checkout',
} as const
