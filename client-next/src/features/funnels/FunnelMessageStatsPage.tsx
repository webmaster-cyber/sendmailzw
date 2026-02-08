import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Eye, MousePointer, UserMinus, AlertTriangle, XCircle } from 'lucide-react'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { FunnelMessage, Funnel, MessageDomainStats } from '../../types/funnel'

export function FunnelMessageStatsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [message, setMessage] = useState<FunnelMessage | null>(null)
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [domainStats, setDomainStats] = useState<MessageDomainStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [messageRes, domainStatsRes] = await Promise.all([
        api.get<FunnelMessage>(`/api/messages/${id}`),
        api.get<MessageDomainStats[]>(`/api/messages/${id}/domainstats`).catch(() => ({ data: [] })),
      ])

      setMessage(messageRes.data)
      setDomainStats(domainStatsRes.data)

      // Load funnel
      if (messageRes.data.funnel) {
        const { data: funnelData } = await api.get<Funnel>(`/api/funnels/${messageRes.data.funnel}`)
        setFunnel(funnelData)
      }
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load message stats')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadData()
  }, [id, loadData])

  const calcRate = (num: number, denom: number) => {
    if (!denom) return '0%'
    return ((num / denom) * 100).toFixed(1) + '%'
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    rate,
    color,
  }: {
    icon: React.ElementType
    label: string
    value: number
    rate?: string
    color: string
  }) => (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-semibold text-text-primary">
            {(value ?? 0).toLocaleString()}
            {rate && <span className="ml-2 text-sm font-normal text-text-muted">{rate}</span>}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => funnel && navigate(`/funnels/messages?id=${funnel.id}`)}
          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {message?.subject || 'Message Stats'}
          </h1>
          {funnel && <p className="text-sm text-text-muted">{funnel.name}</p>}
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {message && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={Mail}
                label="Sent"
                value={message.send || 0}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                icon={Eye}
                label="Opened"
                value={message.opened || 0}
                rate={calcRate(message.opened || 0, message.send || 0)}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                icon={MousePointer}
                label="Clicked"
                value={message.clicked || 0}
                rate={calcRate(message.clicked || 0, message.send || 0)}
                color="bg-purple-100 text-purple-600"
              />
              <StatCard
                icon={UserMinus}
                label="Unsubscribed"
                value={message.unsubscribed || 0}
                rate={calcRate(message.unsubscribed || 0, message.send || 0)}
                color="bg-yellow-100 text-yellow-600"
              />
              <StatCard
                icon={AlertTriangle}
                label="Bounced"
                value={message.bounced || 0}
                rate={calcRate(message.bounced || 0, message.send || 0)}
                color="bg-orange-100 text-orange-600"
              />
              <StatCard
                icon={XCircle}
                label="Complained"
                value={message.complained || 0}
                rate={calcRate(message.complained || 0, message.send || 0)}
                color="bg-red-100 text-red-600"
              />
            </div>

            {/* Domain Stats */}
            {domainStats.length > 0 && (
              <div className="card">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-medium text-text-primary">Performance by Domain</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                          Domain
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                          Sent
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                          Delivered
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                          Opened
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                          Clicked
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                          Bounced
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {domainStats.map((stat) => (
                        <tr key={stat.domain} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-text-primary">
                            {stat.domain}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-text-secondary">
                            {(stat.sent ?? 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-text-secondary">
                            {(stat.delivered ?? 0).toLocaleString()}
                            <span className="ml-1 text-xs text-text-muted">
                              ({calcRate(stat.delivered, stat.sent)})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-text-secondary">
                            {(stat.opened ?? 0).toLocaleString()}
                            <span className="ml-1 text-xs text-text-muted">
                              ({calcRate(stat.opened, stat.sent)})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-text-secondary">
                            {(stat.clicked ?? 0).toLocaleString()}
                            <span className="ml-1 text-xs text-text-muted">
                              ({calcRate(stat.clicked, stat.sent)})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <span className={stat.bounced > 0 ? 'text-danger' : 'text-text-secondary'}>
                              {(stat.bounced ?? 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Message Preview */}
            {message.screenshot && (
              <div className="card">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-medium text-text-primary">Message Preview</h2>
                </div>
                <div className="p-4">
                  <img
                    src={message.screenshot}
                    alt="Message preview"
                    className="mx-auto max-w-full rounded border border-border"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
