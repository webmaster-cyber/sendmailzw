import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { DonutChart } from '../../components/charts/DonutChart'
import { ReportNav } from './ReportNav'

interface BroadcastData {
  id: string
  name: string
  subject: string
  count: number
  delivered: number
  send: number
  hard: number
  soft: number
  opened: number
  opened_all: number
  clicked: number
  clicked_all: number
  unsubscribed: number
  complained: number
  sent_at: string
  finished_at: string
  linkclicks: number[]
  disableopens: boolean
}

interface ClientStats {
  devices: { device: string; count: number }[]
  browsers: { os: string; browser: string; count: number }[]
  locations: { country: string; country_code: string; region: string; count: number }[]
}

function num(n: number): string {
  return (n ?? 0).toLocaleString()
}

function pct(value: number, total: number): string {
  if (total === 0) return '0%'
  return ((value / total) * 100).toFixed(2) + '%'
}

function formatDuration(start: string, end: string): string {
  if (!start || !end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return `${hours}h ${remMins}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

export function BroadcastSummaryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [data, setData] = useState<BroadcastData | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [bcRes, statsRes] = await Promise.all([
          api.get(`/api/broadcasts/${id}`),
          api.get(`/api/broadcasts/${id}/clientstats`).catch(() => ({ data: null })),
        ])
        setData(bcRes.data)
        setStats(statsRes.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  async function handleExport() {
    setExporting(true)
    try {
      await api.post(`/api/broadcasts/${id}/export`)
      toast.success('Export started — check your email')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const delivered = data.send
  const totalBounces = data.hard + data.soft

  return (
    <div>
      <ReportNav id={id} activeTab="summary" title={data.name} />

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <MetricCard label="Recipients" value={num(data.count)} />
        <MetricCard label="Delivered" value={num(delivered)} sub={pct(delivered, data.count)} />
        <MetricCard label="Bounced" value={num(totalBounces)} sub={pct(totalBounces, data.count)} />
        <MetricCard label="Duration" value={formatDuration(data.sent_at, data.finished_at)} />
      </div>

      {/* Engagement charts */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        {/* Opens & Clicks */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Engagement</h3>
          <div className="flex items-center justify-around">
            <DonutChart value={data.opened} total={delivered} color="var(--color-primary)" size={90} label="Opened" />
            <DonutChart value={data.clicked} total={delivered} color="var(--color-accent)" size={90} label="Clicked" />
            <DonutChart value={data.unsubscribed} total={delivered} color="var(--color-warning)" size={90} label="Unsubs" />
            <DonutChart value={data.complained} total={delivered} color="var(--color-danger)" size={90} label="Complaints" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Unique Opens</span>
              <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=open`)} className="font-medium text-primary hover:underline">{num(data.opened)}</button>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Total Opens</span>
              <span className="font-medium text-text-primary">{num(data.opened_all)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Unique Clicks</span>
              <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=click`)} className="font-medium text-primary hover:underline">{num(data.clicked)}</button>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Total Clicks</span>
              <span className="font-medium text-text-primary">{num(data.clicked_all)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Unsubscribes</span>
              <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=unsub`)} className="font-medium text-primary hover:underline">{num(data.unsubscribed)}</button>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Complaints</span>
              <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=complaint`)} className="font-medium text-primary hover:underline">{num(data.complained)}</button>
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Delivery</h3>
          <div className="flex items-center justify-around">
            <DonutChart value={delivered} total={data.count} color="var(--color-success)" size={90} label="Delivered" />
            <DonutChart value={data.hard} total={data.count} color="var(--color-danger)" size={90} label="Hard Bounce" />
            <DonutChart value={data.soft} total={data.count} color="var(--color-warning)" size={90} label="Soft Bounce" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Delivered</span>
              <span className="font-medium text-text-primary">{num(delivered)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Attempted</span>
              <span className="font-medium text-text-primary">{num(data.delivered)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Hard Bounces</span>
              <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=bounce`)} className="font-medium text-primary hover:underline">{num(data.hard)}</button>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Soft Bounces</span>
              <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=soft`)} className="font-medium text-primary hover:underline">{num(data.soft)}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Client stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
          {stats.devices.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Devices</h3>
              <StatsTable items={stats.devices.slice(0, 8).map((d) => ({ label: d.device, count: d.count }))} />
            </div>
          )}
          {stats.browsers.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Browsers</h3>
              <StatsTable items={stats.browsers.slice(0, 8).map((b) => ({ label: `${b.browser} (${b.os})`, count: b.count }))} />
            </div>
          )}
          {stats.locations.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Locations</h3>
              <StatsTable items={stats.locations.slice(0, 8).map((l) => ({ label: l.region ? `${l.region}, ${l.country}` : l.country, count: l.count }))} />
            </div>
          )}
        </div>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting} icon={<Download className="h-3.5 w-3.5" />}>
          Export Data
        </Button>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-semibold text-text-primary mt-1">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function StatsTable({ items }: { items: { label: string; count: number }[] }) {
  const max = items.length > 0 ? items[0].count : 1
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span className="text-text-secondary truncate">{item.label}</span>
              <span className="text-text-muted shrink-0 ml-2">{(item.count ?? 0).toLocaleString()}</span>
            </div>
            <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
