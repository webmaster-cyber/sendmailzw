import { useState, useCallback, useEffect } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { RefreshCw, Mail } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'

interface StatsData {
  date?: string
  hour?: number
  delivered: number
  soft: number
  hard: number
  open?: number
  defer?: number
  err?: number
}

interface ServerStats {
  id: string
  name: string
  daily: StatsData[]
  hourly: StatsData[]
}

interface AllStats {
  daily: StatsData[]
  hourly: StatsData[]
  servers: ServerStats[]
}

export function EmailDeliveryPage() {
  const [stats, setStats] = useState<AllStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewBy, setViewBy] = useState<'server' | 'policy'>('server')
  const [showOpens, setShowOpens] = useState(false)
  const [showDeferrals, setShowDeferrals] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [domainFilter, setDomainFilter] = useState('')
  const [serverFilter, setServerFilter] = useState('')

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (domainFilter) params.append('domains', domainFilter)
      if (serverFilter) params.append('servers', serverFilter)

      const { data } = await api.get<AllStats>(`/api/allstats?${params.toString()}`)
      setStats(data)
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [domainFilter, serverFilter])

  useEffect(() => {
    reload()
  }, [reload])

  const formatNumber = (num: number) => {
    return (num ?? 0).toLocaleString()
  }

  const renderChart = (
    data: StatsData[],
    title: string,
    xKey: 'date' | 'hour'
  ) => {
    if (!data || data.length === 0) return null

    return (
      <div className="rounded-lg border border-border bg-white p-4">
        <h3 className="mb-4 font-medium text-text-primary">{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              tickFormatter={(val) =>
                xKey === 'hour' ? `${val}:00` : val
              }
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
            <Tooltip
              formatter={(value: number) => formatNumber(value)}
              labelFormatter={(label) =>
                xKey === 'hour' ? `${label}:00` : label
              }
            />
            <Legend />
            <Bar
              dataKey="delivered"
              stackId="a"
              fill="#22c55e"
              name="Delivered"
            />
            <Bar
              dataKey="soft"
              stackId="a"
              fill="#eab308"
              name="Soft Bounce"
            />
            <Bar
              dataKey="hard"
              stackId="a"
              fill="#a16207"
              name="Hard Bounce"
            />
            {showOpens && (
              <Line
                type="monotone"
                dataKey="open"
                stroke="#3b82f6"
                name="Opens"
                strokeWidth={2}
                dot={false}
              />
            )}
            {showDeferrals && (
              <Line
                type="monotone"
                dataKey="defer"
                stroke="#8b5cf6"
                name="Deferrals"
                strokeWidth={2}
                dot={false}
              />
            )}
            {showErrors && (
              <Line
                type="monotone"
                dataKey="err"
                stroke="#ef4444"
                name="Errors"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Email Delivery</h1>
          <p className="text-sm text-text-secondary">Delivery performance across all servers</p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={reload}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <Button
              variant={viewBy === 'server' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewBy('server')}
            >
              View By Server
            </Button>
            <Button
              variant={viewBy === 'policy' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewBy('policy')}
            >
              View By Policy
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Checkbox
              label="Show Opens"
              checked={showOpens}
              onChange={setShowOpens}
            />
            <Checkbox
              label="Show Deferrals"
              checked={showDeferrals}
              onChange={setShowDeferrals}
            />
            <Checkbox
              label="Show Errors"
              checked={showErrors}
              onChange={setShowErrors}
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Domain filter"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="Server filter"
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {!stats ? (
          <EmptyState
            icon={<Mail className="h-10 w-10" />}
            title="No delivery data"
            description="Delivery statistics will appear here once emails are sent."
          />
        ) : (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div>
              <h2 className="mb-3 text-lg font-medium text-text-primary">Overall Performance</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {renderChart(stats.daily, 'Daily (Last 20 Days)', 'date')}
                {renderChart(stats.hourly, 'Hourly (Last 24 Hours)', 'hour')}
              </div>
            </div>

            {/* Per-Server Stats */}
            {stats.servers && stats.servers.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-medium text-text-primary">
                  {viewBy === 'server' ? 'By Server' : 'By Policy'}
                </h2>
                <div className="space-y-6">
                  {stats.servers.map((server) => (
                    <div key={server.id}>
                      <h3 className="mb-2 font-medium text-text-secondary">{server.name}</h3>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {renderChart(server.daily, 'Daily', 'date')}
                        {renderChart(server.hourly, 'Hourly', 'hour')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
