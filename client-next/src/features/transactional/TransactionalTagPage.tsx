import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { ArrowLeft, Mail, Eye, MousePointer, AlertTriangle, XCircle, UserMinus } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Button } from '../../components/ui/Button'
import type { TransactionalStats, TransactionalDomainStats } from '../../types/transactional'

interface TagDetail {
  tag: string
  send: number
  count: number
  open: number
  click: number
  hard: number
  soft: number
  complaint: number
  unsub: number
}

export function TransactionalTagPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tag = searchParams.get('id') || ''

  const [tagStats, setTagStats] = useState<TagDetail | null>(null)
  const [chartData, setChartData] = useState<TransactionalStats[]>([])
  const [domainStats, setDomainStats] = useState<TransactionalDomainStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')

  const loadData = useCallback(async () => {
    if (!tag) return

    try {
      const start = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')
      const end = format(new Date(), 'yyyy-MM-dd')

      const [tagRes, statsRes, domainsRes] = await Promise.all([
        api.get<TagDetail>(`/api/transactional/tag/${encodeURIComponent(tag)}?start=${start}&end=${end}`),
        api.get<TransactionalStats[]>(`/api/transactional/stats?search=${encodeURIComponent(tag)}&start=${start}&end=${end}`),
        api.get<TransactionalDomainStats[]>(`/api/transactional/tag/${encodeURIComponent(tag)}/domainstats?start=${start}&end=${end}`),
      ])

      setTagStats(tagRes.data)
      setChartData(statsRes.data)
      setDomainStats(domainsRes.data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load tag data')
    } finally {
      setIsLoading(false)
    }
  }, [tag, dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const calcRate = (num: number, denom: number) => {
    if (!denom) return '0%'
    return ((num / denom) * 100).toFixed(1) + '%'
  }

  // Reverse chart data to show oldest first
  const formattedChartData = [...chartData].reverse().map((s) => ({
    date: format(new Date(s.ts), 'MMM d'),
    sent: s.send || 0,
  }))

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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/transactional')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{tag || '(no tag)'}</h1>
            <p className="text-sm text-text-muted">Transactional tag performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90')}
            className="input text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {tagStats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={Mail}
                label="Sent"
                value={tagStats.send || 0}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                icon={Eye}
                label="Opened"
                value={tagStats.open || 0}
                rate={calcRate(tagStats.open || 0, tagStats.send || 0)}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                icon={MousePointer}
                label="Clicked"
                value={tagStats.click || 0}
                rate={calcRate(tagStats.click || 0, tagStats.send || 0)}
                color="bg-purple-100 text-purple-600"
              />
              <StatCard
                icon={UserMinus}
                label="Unsubscribed"
                value={tagStats.unsub || 0}
                rate={calcRate(tagStats.unsub || 0, tagStats.send || 0)}
                color="bg-yellow-100 text-yellow-600"
              />
              <StatCard
                icon={AlertTriangle}
                label="Bounced"
                value={(tagStats.hard || 0) + (tagStats.soft || 0)}
                rate={calcRate((tagStats.hard || 0) + (tagStats.soft || 0), tagStats.send || 0)}
                color="bg-orange-100 text-orange-600"
              />
              <StatCard
                icon={XCircle}
                label="Complaints"
                value={tagStats.complaint || 0}
                rate={calcRate(tagStats.complaint || 0, tagStats.send || 0)}
                color="bg-red-100 text-red-600"
              />
            </div>

            {/* Activity Chart */}
            {formattedChartData.length > 0 && (
              <div className="card p-5">
                <h3 className="mb-4 text-sm font-semibold text-text-primary">Send Activity</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                        tickLine={false}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="sent"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fill="url(#areaGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Domain Stats */}
            {domainStats.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-medium text-text-primary">Performance by Domain</h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/transactional/domains?tag=${encodeURIComponent(tag)}`)
                    }
                  >
                    View All
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                          Domain
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                          Sent
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                          Opened
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                          Bounced
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {domainStats.slice(0, 10).map((stat) => (
                        <tr
                          key={stat.domain}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            navigate(
                              `/transactional/messages?tag=${encodeURIComponent(tag)}&domain=${encodeURIComponent(stat.domain)}`
                            )
                          }
                        >
                          <td className="px-4 py-3 text-sm font-medium text-primary hover:underline">
                            {stat.domain}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-text-secondary">
                            {(stat.send || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-text-secondary">
                            {(stat.open || 0).toLocaleString()}
                            <span className="ml-1 text-xs text-text-muted">
                              ({calcRate(stat.open || 0, stat.send || 0)})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <span
                              className={
                                (stat.hard || 0) + (stat.soft || 0) > 0 ? 'text-danger' : 'text-text-secondary'
                              }
                            >
                              {((stat.hard || 0) + (stat.soft || 0)).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
