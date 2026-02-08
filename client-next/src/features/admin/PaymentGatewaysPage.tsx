import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, CreditCard, Smartphone } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Badge } from '../../components/ui/Badge'
import type { PaymentGatewayConfig } from '../../types/billing'

interface GatewayFormData {
  name: string
  type: 'paynow' | 'stripe'
  enabled: boolean
  // Paynow
  integration_id: string
  integration_key: string
  return_url: string
  result_url: string
  // Stripe
  secret_key: string
  publishable_key: string
  webhook_secret: string
  success_url: string
  cancel_url: string
}

const EMPTY_PAYNOW: GatewayFormData = {
  name: 'Paynow',
  type: 'paynow',
  enabled: false,
  integration_id: '',
  integration_key: '',
  return_url: '',
  result_url: '',
  secret_key: '',
  publishable_key: '',
  webhook_secret: '',
  success_url: '',
  cancel_url: '',
}

const EMPTY_STRIPE: GatewayFormData = {
  name: 'Stripe',
  type: 'stripe',
  enabled: false,
  integration_id: '',
  integration_key: '',
  return_url: '',
  result_url: '',
  secret_key: '',
  publishable_key: '',
  webhook_secret: '',
  success_url: '',
  cancel_url: '',
}

export function PaymentGatewaysPage() {
  const [, setGateways] = useState<PaymentGatewayConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paynow, setPaynow] = useState<GatewayFormData>(EMPTY_PAYNOW)
  const [stripe, setStripe] = useState<GatewayFormData>(EMPTY_STRIPE)
  const [paynowId, setPaynowId] = useState<string | null>(null)
  const [stripeId, setStripeId] = useState<string | null>(null)
  const [savingPaynow, setSavingPaynow] = useState(false)
  const [savingStripe, setSavingStripe] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<PaymentGatewayConfig[]>('/api/billing/gateways')
      setGateways(data)

      const pn = data.find((g) => g.type === 'paynow')
      if (pn) {
        setPaynowId(pn.id)
        setPaynow({
          name: pn.name || 'Paynow',
          type: 'paynow',
          enabled: pn.enabled || false,
          integration_id: pn.integration_id || '',
          integration_key: pn.integration_key || '',
          return_url: pn.return_url || '',
          result_url: pn.result_url || '',
          secret_key: '',
          publishable_key: '',
          webhook_secret: '',
          success_url: '',
          cancel_url: '',
        })
      }

      const st = data.find((g) => g.type === 'stripe')
      if (st) {
        setStripeId(st.id)
        setStripe({
          name: st.name || 'Stripe',
          type: 'stripe',
          enabled: st.enabled || false,
          integration_id: '',
          integration_key: '',
          return_url: '',
          result_url: '',
          secret_key: st.secret_key || '',
          publishable_key: st.publishable_key || '',
          webhook_secret: st.webhook_secret || '',
          success_url: st.success_url || '',
          cancel_url: st.cancel_url || '',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const savePaynow = async () => {
    setSavingPaynow(true)
    try {
      const payload = {
        name: paynow.name,
        type: 'paynow',
        enabled: paynow.enabled,
        integration_id: paynow.integration_id,
        integration_key: paynow.integration_key,
        return_url: paynow.return_url,
        result_url: paynow.result_url,
      }
      if (paynowId) {
        await api.patch(`/api/billing/gateways/${paynowId}`, payload)
      } else {
        const { data } = await api.post('/api/billing/gateways', payload)
        setPaynowId(data.id)
      }
      toast.success('Paynow settings saved')
    } catch {
      toast.error('Failed to save Paynow settings')
    } finally {
      setSavingPaynow(false)
    }
  }

  const saveStripe = async () => {
    setSavingStripe(true)
    try {
      const payload = {
        name: stripe.name,
        type: 'stripe',
        enabled: stripe.enabled,
        secret_key: stripe.secret_key,
        publishable_key: stripe.publishable_key,
        webhook_secret: stripe.webhook_secret,
        success_url: stripe.success_url,
        cancel_url: stripe.cancel_url,
      }
      if (stripeId) {
        await api.patch(`/api/billing/gateways/${stripeId}`, payload)
      } else {
        const { data } = await api.post('/api/billing/gateways', payload)
        setStripeId(data.id)
      }
      toast.success('Stripe settings saved')
    } catch {
      toast.error('Failed to save Stripe settings')
    } finally {
      setSavingStripe(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Payment Gateways</h1>
        <p className="text-sm text-text-secondary">
          Configure payment gateways for customer billing.
        </p>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Paynow */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-text-muted" />
                <h2 className="text-lg font-medium">Paynow (EcoCash / Mobile Money)</h2>
              </div>
              {paynow.enabled ? (
                <Badge variant="success">Enabled</Badge>
              ) : (
                <Badge variant="default">Disabled</Badge>
              )}
            </div>
            <div className="space-y-3">
              <Checkbox
                label="Enabled"
                checked={paynow.enabled}
                onChange={(checked) => setPaynow((p) => ({ ...p, enabled: checked }))}
              />
              <Input
                label="Integration ID"
                value={paynow.integration_id}
                onChange={(e) => setPaynow((p) => ({ ...p, integration_id: e.target.value }))}
              />
              <Input
                label="Integration Key"
                type="password"
                value={paynow.integration_key}
                onChange={(e) => setPaynow((p) => ({ ...p, integration_key: e.target.value }))}
              />
              <Input
                label="Return URL"
                value={paynow.return_url}
                onChange={(e) => setPaynow((p) => ({ ...p, return_url: e.target.value }))}
                hint="URL to redirect after payment (e.g. https://app.sendmail.co.zw/billing)"
              />
              <Input
                label="Result URL (Webhook)"
                value={paynow.result_url}
                onChange={(e) => setPaynow((p) => ({ ...p, result_url: e.target.value }))}
                hint="Paynow sends payment notifications here (e.g. https://app.sendmail.co.zw/api/webhooks/paynow)"
              />
              <div className="flex justify-end">
                <Button
                  icon={<Save className="h-4 w-4" />}
                  onClick={savePaynow}
                  loading={savingPaynow}
                >
                  Save Paynow
                </Button>
              </div>
            </div>
          </div>

          {/* Stripe */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-text-muted" />
                <h2 className="text-lg font-medium">Stripe (Card Payments)</h2>
              </div>
              {stripe.enabled ? (
                <Badge variant="success">Enabled</Badge>
              ) : (
                <Badge variant="default">Disabled</Badge>
              )}
            </div>
            <div className="space-y-3">
              <Checkbox
                label="Enabled"
                checked={stripe.enabled}
                onChange={(checked) => setStripe((s) => ({ ...s, enabled: checked }))}
              />
              <Input
                label="Publishable Key"
                value={stripe.publishable_key}
                onChange={(e) => setStripe((s) => ({ ...s, publishable_key: e.target.value }))}
                hint="Starts with pk_test_ or pk_live_"
              />
              <Input
                label="Secret Key"
                type="password"
                value={stripe.secret_key}
                onChange={(e) => setStripe((s) => ({ ...s, secret_key: e.target.value }))}
                hint="Starts with sk_test_ or sk_live_"
              />
              <Input
                label="Webhook Secret"
                type="password"
                value={stripe.webhook_secret}
                onChange={(e) => setStripe((s) => ({ ...s, webhook_secret: e.target.value }))}
                hint="Starts with whsec_"
              />
              <Input
                label="Success URL"
                value={stripe.success_url}
                onChange={(e) => setStripe((s) => ({ ...s, success_url: e.target.value }))}
                hint="Redirect after successful payment (e.g. https://app.sendmail.co.zw/billing)"
              />
              <Input
                label="Cancel URL"
                value={stripe.cancel_url}
                onChange={(e) => setStripe((s) => ({ ...s, cancel_url: e.target.value }))}
                hint="Redirect if payment cancelled"
              />
              <div className="flex justify-end">
                <Button
                  icon={<Save className="h-4 w-4" />}
                  onClick={saveStripe}
                  loading={savingStripe}
                >
                  Save Stripe
                </Button>
              </div>
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
