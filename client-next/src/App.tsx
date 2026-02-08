import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useBrand } from './contexts/BrandContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { ActivatePage } from './features/auth/ActivatePage'
import { WelcomePage } from './features/auth/WelcomePage'
import { AdminDashboard } from './features/dashboard/AdminDashboard'
import { CustomerDashboard } from './features/dashboard/CustomerDashboard'
import { BroadcastsPage } from './features/broadcasts/BroadcastsPage'
import { BroadcastSettingsPage } from './features/broadcasts/BroadcastSettingsPage'
import { BroadcastTemplateSelectorPage } from './features/broadcasts/BroadcastTemplateSelectorPage'
import { BroadcastTemplatePage } from './features/broadcasts/BroadcastTemplatePage'
import { BroadcastRecipientsPage } from './features/broadcasts/BroadcastRecipientsPage'
import { BroadcastReviewPage } from './features/broadcasts/BroadcastReviewPage'
import { BroadcastSummaryPage } from './features/broadcasts/BroadcastSummaryPage'
import { BroadcastHeatmapPage } from './features/broadcasts/BroadcastHeatmapPage'
import { BroadcastDomainsPage } from './features/broadcasts/BroadcastDomainsPage'
import { BroadcastDetailsPage } from './features/broadcasts/BroadcastDetailsPage'
import { BroadcastMessagesPage } from './features/broadcasts/BroadcastMessagesPage'
import { BroadcastSummarySettingsPage } from './features/broadcasts/BroadcastSummarySettingsPage'
import { ContactsPage } from './features/contacts/ContactsPage'
import { ContactListEditPage } from './features/contacts/ContactListEditPage'
import { ContactsAddPage } from './features/contacts/ContactsAddPage'
import { ContactsFindPage } from './features/contacts/ContactsFindPage'
import { ContactEditPage } from './features/contacts/ContactEditPage'
import { ContactsDomainsPage } from './features/contacts/ContactsDomainsPage'
import { ContactsTagsPage } from './features/contacts/ContactsTagsPage'
import { ListCustomFieldsPage } from './features/contacts/ListCustomFieldsPage'
import { ListSettingsPage } from './features/contacts/ListSettingsPage'
import { ListSubscribeFormPage } from './features/contacts/ListSubscribeFormPage'
import { SegmentsPage } from './features/contacts/SegmentsPage'
import { SegmentEditorPage } from './features/contacts/SegmentEditorPage'
import { FormsPage } from './features/forms/FormsPage'
import { FormSettingsPage } from './features/forms/FormSettingsPage'
import { FunnelsPage } from './features/funnels/FunnelsPage'
import { FunnelSettingsPage } from './features/funnels/FunnelSettingsPage'
import { FunnelMessagesPage } from './features/funnels/FunnelMessagesPage'
import { FunnelMessageEditPage } from './features/funnels/FunnelMessageEditPage'
import { FunnelMessageStatsPage } from './features/funnels/FunnelMessageStatsPage'
import { TransactionalPage } from './features/transactional/TransactionalPage'
import { TransactionalTemplatesPage } from './features/transactional/TransactionalTemplatesPage'
import { TransactionalTemplateEditPage } from './features/transactional/TransactionalTemplateEditPage'
import { TransactionalTagPage } from './features/transactional/TransactionalTagPage'
import { TransactionalDomainsPage } from './features/transactional/TransactionalDomainsPage'
import { TransactionalMessagesPage } from './features/transactional/TransactionalMessagesPage'
import { TransactionalLogPage } from './features/transactional/TransactionalLogPage'
import { TransactionalSettingsPage } from './features/transactional/TransactionalSettingsPage'
import { WebhooksPage } from './features/integrations/WebhooksPage'
import { WebhookEditPage } from './features/integrations/WebhookEditPage'
import { ConnectPage } from './features/integrations/ConnectPage'
import { SuppressionPage } from './features/suppression/SuppressionPage'
import { SuppressionEditPage } from './features/suppression/SuppressionEditPage'
import { ExclusionAddPage } from './features/suppression/ExclusionAddPage'
import { ThrottlesPage } from './features/throttles/ThrottlesPage'
import { ThrottleEditPage } from './features/throttles/ThrottleEditPage'
import { ChangePasswordPage } from './features/settings/ChangePasswordPage'
import { ExportsPage } from './features/settings/ExportsPage'
import { CustomersPage } from './features/admin/CustomersPage'
import { CustomerEditPage } from './features/admin/CustomerEditPage'
import { CustomerUsersPage } from './features/admin/CustomerUsersPage'
import { CustomerListApprovalPage } from './features/admin/CustomerListApprovalPage'
import { UserEditPage } from './features/admin/UserEditPage'
import { FrontendsPage } from './features/admin/FrontendsPage'
import { FrontendEditPage } from './features/admin/FrontendEditPage'
import { ServersPage } from './features/admin/ServersPage'
import { ServerEditPage } from './features/admin/ServerEditPage'
import { PoliciesPage } from './features/admin/PoliciesPage'
import { PolicyEditPage } from './features/admin/PolicyEditPage'
import { RoutesPage } from './features/admin/RoutesPage'
import { RouteEditPage } from './features/admin/RouteEditPage'
import { MailgunPage } from './features/admin/MailgunPage'
import { MailgunEditPage } from './features/admin/MailgunEditPage'
import { SESPage } from './features/admin/SESPage'
import { SESEditPage } from './features/admin/SESEditPage'
import { SMTPRelaysPage } from './features/admin/SMTPRelaysPage'
import { SMTPRelayEditPage } from './features/admin/SMTPRelayEditPage'
import { AdminLogPage } from './features/admin/AdminLogPage'
import { EmailDeliveryPage } from './features/admin/EmailDeliveryPage'
import { IPDeliveryPage } from './features/admin/IPDeliveryPage'
import { CustomerBroadcastsPage } from './features/admin/CustomerBroadcastsPage'
import { WarmupsPage } from './features/admin/WarmupsPage'
import { WarmupEditPage } from './features/admin/WarmupEditPage'
import { PlansPage } from './features/admin/PlansPage'
import { PlanEditPage } from './features/admin/PlanEditPage'
import { PaymentGatewaysPage } from './features/admin/PaymentGatewaysPage'
import { ContactMessagesPage } from './features/admin/ContactMessagesPage'
import { SignupPage } from './features/admin/SignupPage'
import { BillingPage } from './features/billing/BillingPage'
import { InvoicesPage } from './features/billing/InvoicesPage'
import { CheckoutPage } from './features/billing/CheckoutPage'
import { Spinner } from './components/ui/Spinner'
import ErrorBoundary from './components/feedback/ErrorBoundary'
import { useEffect } from 'react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { uid, isLoading } = useAuth()

  if (!uid) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}

function Dashboard() {
  const { user, impersonate } = useAuth()

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Admin not impersonating sees admin dashboard
  if (user.admin && !impersonate) {
    return <AdminDashboard />
  }

  // Customer (or admin impersonating) sees customer dashboard
  return <CustomerDashboard />
}

function ApplyUserBrand() {
  const { user } = useAuth()
  const { applyFrontend } = useBrand()

  useEffect(() => {
    // Apply user's frontend after login, clear it on logout
    applyFrontend(user?.frontend || null)
  }, [user, applyFrontend])

  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <ApplyUserBrand />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/emailreset" element={<ResetPasswordPage />} />
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/broadcasts" element={<BroadcastsPage />} />
                  <Route path="/broadcasts/settings" element={<BroadcastSettingsPage />} />
                  <Route path="/broadcasts/templates" element={<BroadcastTemplateSelectorPage />} />
                  <Route path="/broadcasts/template" element={<BroadcastTemplatePage />} />
                  <Route path="/broadcasts/rcpt" element={<BroadcastRecipientsPage />} />
                  <Route path="/broadcasts/review" element={<BroadcastReviewPage />} />
                  <Route path="/broadcasts/summary" element={<BroadcastSummaryPage />} />
                  <Route path="/broadcasts/heatmap" element={<BroadcastHeatmapPage />} />
                  <Route path="/broadcasts/domains" element={<BroadcastDomainsPage />} />
                  <Route path="/broadcasts/details" element={<BroadcastDetailsPage />} />
                  <Route path="/broadcasts/messages" element={<BroadcastMessagesPage />} />
                  <Route path="/broadcasts/summarysettings" element={<BroadcastSummarySettingsPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/edit" element={<ContactListEditPage />} />
                  <Route path="/contacts/add" element={<ContactsAddPage />} />
                  <Route path="/contacts/find" element={<ContactsFindPage />} />
                  <Route path="/contacts/contact" element={<ContactEditPage />} />
                  <Route path="/contacts/domains" element={<ContactsDomainsPage />} />
                  <Route path="/contacts/tags" element={<ContactsTagsPage />} />
                  <Route path="/contacts/fields" element={<ListCustomFieldsPage />} />
                  <Route path="/contacts/settings" element={<ListSettingsPage />} />
                  <Route path="/contacts/subscribe" element={<ListSubscribeFormPage />} />
                  <Route path="/segments" element={<SegmentsPage />} />
                  <Route path="/segments/edit" element={<SegmentEditorPage />} />
                  <Route path="/forms" element={<FormsPage />} />
                  <Route path="/forms/new" element={<FormSettingsPage />} />
                  <Route path="/forms/settings" element={<FormSettingsPage />} />
                  <Route path="/funnels" element={<FunnelsPage />} />
                  <Route path="/funnels/settings" element={<FunnelSettingsPage />} />
                  <Route path="/funnels/messages" element={<FunnelMessagesPage />} />
                  <Route path="/funnels/message" element={<FunnelMessageEditPage />} />
                  <Route path="/funnels/message/stats" element={<FunnelMessageStatsPage />} />
                  <Route path="/transactional" element={<TransactionalPage />} />
                  <Route path="/transactional/templates" element={<TransactionalTemplatesPage />} />
                  <Route path="/transactional/template" element={<TransactionalTemplateEditPage />} />
                  <Route path="/transactional/tag" element={<TransactionalTagPage />} />
                  <Route path="/transactional/domains" element={<TransactionalDomainsPage />} />
                  <Route path="/transactional/messages" element={<TransactionalMessagesPage />} />
                  <Route path="/transactional/log" element={<TransactionalLogPage />} />
                  <Route path="/transactional/settings" element={<TransactionalSettingsPage />} />
                  <Route path="/integrations/webhooks" element={<WebhooksPage />} />
                  <Route path="/integrations/webhooks/edit" element={<WebhookEditPage />} />
                  <Route path="/connect" element={<ConnectPage />} />
                  <Route path="/suppression" element={<SuppressionPage />} />
                  <Route path="/suppression/new" element={<SuppressionEditPage />} />
                  <Route path="/suppression/edit" element={<SuppressionEditPage />} />
                  <Route path="/exclusion/add" element={<ExclusionAddPage />} />
                  <Route path="/domainthrottles" element={<ThrottlesPage />} />
                  <Route path="/domainthrottles/edit" element={<ThrottleEditPage />} />
                  <Route path="/changepass" element={<ChangePasswordPage />} />
                  <Route path="/exports" element={<ExportsPage />} />
                  {/* Admin routes */}
                  <Route path="/admin/customers" element={<CustomersPage />} />
                  <Route path="/admin/customers/edit" element={<CustomerEditPage />} />
                  <Route path="/admin/customers/users" element={<CustomerUsersPage />} />
                  <Route path="/admin/customers/approval" element={<CustomerListApprovalPage />} />
                  <Route path="/admin/users/edit" element={<UserEditPage />} />
                  <Route path="/admin/frontends" element={<FrontendsPage />} />
                  <Route path="/admin/frontends/edit" element={<FrontendEditPage />} />
                  <Route path="/admin/servers" element={<ServersPage />} />
                  <Route path="/admin/servers/edit" element={<ServerEditPage />} />
                  <Route path="/admin/policies" element={<PoliciesPage />} />
                  <Route path="/admin/policies/edit" element={<PolicyEditPage />} />
                  <Route path="/admin/routes" element={<RoutesPage />} />
                  <Route path="/admin/routes/edit" element={<RouteEditPage />} />
                  <Route path="/admin/mailgun" element={<MailgunPage />} />
                  <Route path="/admin/mailgun/edit" element={<MailgunEditPage />} />
                  <Route path="/admin/ses" element={<SESPage />} />
                  <Route path="/admin/ses/edit" element={<SESEditPage />} />
                  <Route path="/admin/smtprelays" element={<SMTPRelaysPage />} />
                  <Route path="/admin/smtprelays/edit" element={<SMTPRelayEditPage />} />
                  <Route path="/admin/log" element={<AdminLogPage />} />
                  <Route path="/admin/emaildelivery" element={<EmailDeliveryPage />} />
                  <Route path="/admin/ipdelivery" element={<IPDeliveryPage />} />
                  <Route path="/admin/custbcs" element={<CustomerBroadcastsPage />} />
                  <Route path="/admin/warmups" element={<WarmupsPage />} />
                  <Route path="/admin/warmups/edit" element={<WarmupEditPage />} />
                  <Route path="/admin/signup" element={<SignupPage />} />
                  <Route path="/admin/plans" element={<PlansPage />} />
                  <Route path="/admin/plans/edit" element={<PlanEditPage />} />
                  <Route path="/admin/gateways" element={<PaymentGatewaysPage />} />
                  <Route path="/admin/contact-messages" element={<ContactMessagesPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/billing/invoices" element={<InvoicesPage />} />
                  <Route path="/billing/checkout" element={<CheckoutPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  )
}
