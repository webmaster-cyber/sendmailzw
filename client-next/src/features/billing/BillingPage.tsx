import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, ArrowUpRight, FileText } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { SubscriptionUsage } from '../../types/billing'

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0
  const isNearLimit = limit ? pct >= 80 : false

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium">
          {(used ?? 0).toLocaleString()} {limit ? `/ ${limit.toLocaleString()}` : '(unlimited)'}
        </span>
      </div>
      {limit && (
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-red-500' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>
    case 'trialing':
      return <Badge variant="info">Trial</Badge>
    case 'past_due':
      return <Badge variant="warning">Past Due</Badge>
    case 'cancelled':
    case 'expired':
      return <Badge variant="danger">Expired</Badge>
    default:
      return <Badge variant="default">No Plan</Badge>
  }
}

export function BillingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<SubscriptionUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: usage } = await api.get<SubscriptionUsage>('/api/subscription/usage')
      setData(usage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const sub = data?.subscription
  const plan = data?.plan

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Billing</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<FileText className="h-4 w-4" />}
            onClick={() => navigate('/billing/invoices')}
          >
            Invoices
          </Button>
          {sub && sub.status !== 'none' && (
            <Button
              icon={<ArrowUpRight className="h-4 w-4" />}
              onClick={() => navigate('/billing/checkout')}
            >
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {data && (
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Current Plan */}
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-text-muted" />
                  <div>
                    <h2 className="text-lg font-medium">
                      {plan ? plan.name : 'No Plan'}
                    </h2>
                    {plan && (
                      <p className="text-sm text-text-secondary">{plan.description}</p>
                    )}
                  </div>
                </div>
                {sub && statusBadge(sub.status)}
              </div>
              {plan && !plan.is_free && (
                <div className="mt-3 text-sm text-text-secondary">
                  ${plan.price_usd}/{plan.billing_period === 'yearly' ? 'year' : 'month'}
                </div>
              )}
              {sub?.trial_end && sub.status === 'trialing' && (
                <div className="mt-2 text-sm text-text-secondary">
                  Trial ends{' '}
                  {new Date(sub.trial_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
              {sub?.current_period_end && sub.status === 'active' && (
                <div className="mt-2 text-sm text-text-secondary">
                  Renews{' '}
                  {new Date(sub.current_period_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>

            {/* Usage */}
            <div className="card space-y-4 p-6">
              <h2 className="text-lg font-medium">Usage</h2>
              <UsageMeter
                label="Subscribers"
                used={data.usage.subscribers}
                limit={data.limits.subscriber_limit}
              />
              <UsageMeter
                label="Sends this month"
                used={data.usage.sends_this_month}
                limit={data.limits.send_limit_monthly}
              />
            </div>

            {/* No subscription CTA */}
            {(!sub || sub.status === 'none') && (
              <div className="card p-6 text-center">
                <CreditCard className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <h3 className="mb-1 text-lg font-medium">Choose a Plan</h3>
                <p className="mb-4 text-sm text-text-secondary">
                  Select a plan to unlock all features.
                </p>
                <Button onClick={() => navigate('/billing/checkout')}>View Plans</Button>
              </div>
            )}
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
