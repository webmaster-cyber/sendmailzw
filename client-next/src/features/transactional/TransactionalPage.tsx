import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { Mail, Eye, MousePointer, AlertTriangle, FileText, Plus, Code } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Button } from '../../components/ui/Button'
import { TransactionalNav } from './TransactionalNav'
import type { TransactionalTag, TransactionalStats } from '../../types/transactional'

export function TransactionalPage() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<TransactionalTag[]>([])
  const [stats, setStats] = useState<TransactionalStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')

  const loadData = useCallback(async () => {
    try {
      const start = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')
      const end = format(new Date(), 'yyyy-MM-dd')

      const [tagsRes, statsRes] = await Promise.all([
        api.get<TransactionalTag[]>(`/api/transactional/tags?start=${start}&end=${end}`),
        api.get<TransactionalStats[]>(`/api/transactional/stats?start=${start}&end=${end}`),
      ])

      setTags(tagsRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load transactional data')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Aggregate totals from tags
  const totals = tags.reduce(
    (acc, t) => ({
      send: acc.send + (t.send || 0),
      open: acc.open + (t.open || 0),
      click: acc.click + (t.click || 0),
      complaint: acc.complaint + (t.complaint || 0),
    }),
    { send: 0, open: 0, click: 0, complaint: 0 }
  )

  // Calculate bounces from stats
  const bounces = stats.reduce((acc, s) => acc + (s.hard || 0) + (s.soft || 0), 0)

  const calcRate = (num: number, denom: number) => {
    if (!denom) return '0%'
    return ((num / denom) * 100).toFixed(1) + '%'
  }

  // Format chart data - reverse to show oldest first
  const chartData = [...stats].reverse().map((s) => ({
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
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Transactional</h1>
          <p className="text-sm text-text-muted">API-triggered email performance</p>
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
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/transactional/template?id=new')}
          >
            Create Template
          </Button>
        </div>
      </div>

      <TransactionalNav />

      <LoadingOverlay loading={isLoading}>
        {/* Stats Overview */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Mail}
            label="Sent"
            value={totals.send}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={Eye}
            label="Opened"
            value={totals.open}
            rate={calcRate(totals.open, totals.send)}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={MousePointer}
            label="Clicked"
            value={totals.click}
            rate={calcRate(totals.click, totals.send)}
            color="bg-purple-100 text-purple-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="Bounced"
            value={bounces}
            rate={calcRate(bounces, totals.send)}
            color="bg-orange-100 text-orange-600"
          />
        </div>

        {/* Activity Chart */}
        {chartData.length > 0 && (
          <div className="card mb-6 p-5">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">Send Activity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
                  <Bar dataKey="sent" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tags Table */}
        {tags.length === 0 ? (
          <div className="card p-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Get Started with Transactional Emails</h2>
              <p className="mt-2 text-text-muted">
                Transactional emails are one-off messages triggered by your application via the API.
                Perfect for receipts, password resets, notifications, and alerts.
              </p>

              <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-blue-100 p-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-text-primary">1. Create a Template</h3>
                  </div>
                  <p className="text-sm text-text-muted mb-3">
                    Design reusable email templates with {'{{variable}}'} placeholders for dynamic content.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/transactional/templates')}
                  >
                    Manage Templates
                  </Button>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-green-100 p-2">
                      <Code className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="font-medium text-text-primary">2. Send via API</h3>
                  </div>
                  <p className="text-sm text-text-muted mb-3">
                    POST to <code className="rounded bg-gray-100 px-1 text-xs">/api/transactional/send</code> with your template ID and variables.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/connect')}
                  >
                    Get API Keys
                  </Button>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left">
                <h4 className="text-sm font-medium text-blue-800">Example API Request</h4>
                <pre className="mt-2 overflow-x-auto rounded bg-blue-100 p-3 text-xs text-blue-900">
{`POST /api/transactional/send
{
  "to": "customer@example.com",
  "template": "YOUR_TEMPLATE_ID",
  "variables": { "name": "John", "order": "#1234" },
  "tag": "order-confirmation"
}`}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-medium text-text-primary">Performance by Tag</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Tag
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Sent
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Opened
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Clicked
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Complaints
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tags.map((tag) => (
                    <tr
                      key={tag.tag}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/transactional/tag?id=${encodeURIComponent(tag.tag)}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-primary hover:underline">
                        {tag.tag || '(no tag)'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {(tag.send || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {(tag.open || 0).toLocaleString()}
                        <span className="ml-1 text-xs text-text-muted">
                          ({calcRate(tag.open || 0, tag.send || 0)})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {(tag.click || 0).toLocaleString()}
                        <span className="ml-1 text-xs text-text-muted">
                          ({calcRate(tag.click || 0, tag.send || 0)})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={(tag.complaint || 0) > 0 ? 'text-danger' : 'text-text-secondary'}>
                          {(tag.complaint || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
