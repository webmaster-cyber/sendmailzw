import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Users,
  Server,
  Route,
  FileText,
  Mail,
  Flame,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Badge } from '../../components/ui/Badge'

interface DashboardStats {
  customers: number
  servers: number
  policies: number
  routes: number
  warmups: number
  connections: number
}

interface DeliveryStats {
  delivered: number
  soft: number
  hard: number
  total: number
}

interface ServerStatus {
  id: string
  name: string
  queue: number
  errors: number
  deferrals: number
  status: 'healthy' | 'warning' | 'error'
}

interface ActivityLog {
  id: string
  ts: string
  user_name: string
  pre_msg?: string
  link_msg?: string
  post_msg?: string
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    customers: 0,
    servers: 0,
    policies: 0,
    routes: 0,
    warmups: 0,
    connections: 0,
  })
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats>({
    delivered: 0,
    soft: 0,
    hard: 0,
    total: 0,
  })
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load all data in parallel
      const [
        customersRes,
        serversRes,
        policiesRes,
        routesRes,
        warmupsRes,
        mailgunRes,
        sesRes,
        smtpRes,
        allStatsRes,
        logsRes,
      ] = await Promise.all([
        api.get('/api/companies').catch(() => ({ data: [] })),
        api.get('/api/sinks').catch(() => ({ data: [] })),
        api.get('/api/policies').catch(() => ({ data: [] })),
        api.get('/api/routes').catch(() => ({ data: [] })),
        api.get('/api/warmups').catch(() => ({ data: [] })),
        api.get('/api/mailgun').catch(() => ({ data: [] })),
        api.get('/api/ses').catch(() => ({ data: [] })),
        api.get('/api/smtprelays').catch(() => ({ data: [] })),
        api.get('/api/allstats').catch(() => ({ data: { daily: [], hourly: [] } })),
        api.get('/api/userlogs').catch(() => ({ data: [] })),
      ])

      // Count stats
      setStats({
        customers: customersRes.data?.length || 0,
        servers: serversRes.data?.length || 0,
        policies: policiesRes.data?.length || 0,
        routes: routesRes.data?.length || 0,
        warmups: warmupsRes.data?.length || 0,
        connections:
          (mailgunRes.data?.length || 0) +
          (sesRes.data?.length || 0) +
          (smtpRes.data?.length || 0),
      })

      // Calculate today's delivery stats from hourly data
      const hourlyData = allStatsRes.data?.hourly || []
      const todayStats = hourlyData.reduce(
        (acc: DeliveryStats, hour: { delivered?: number; soft?: number; hard?: number }) => ({
          delivered: acc.delivered + (hour.delivered || 0),
          soft: acc.soft + (hour.soft || 0),
          hard: acc.hard + (hour.hard || 0),
          total: acc.total + (hour.delivered || 0) + (hour.soft || 0) + (hour.hard || 0),
        }),
        { delivered: 0, soft: 0, hard: 0, total: 0 }
      )
      setDeliveryStats(todayStats)

      // Process server statuses
      const servers = serversRes.data || []
      const statuses: ServerStatus[] = servers.slice(0, 5).map((server: { id: string; name: string }) => {
        // In a real implementation, this would come from server stats
        // For now, we'll show basic info
        return {
          id: server.id,
          name: server.name,
          queue: 0,
          errors: 0,
          deferrals: 0,
          status: 'healthy' as const,
        }
      })
      setServerStatuses(statuses)

      // Get recent activity (last 5, newest first)
      const logs = logsRes.data || []
      const sortedLogs = logs.sort((a: ActivityLog, b: ActivityLog) =>
        new Date(b.ts).getTime() - new Date(a.ts).getTime()
      )
      setRecentActivity(sortedLogs.slice(0, 5))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const formatNumber = (num: number) => {
    return (num ?? 0).toLocaleString()
  }

  const getDeliveryRate = () => {
    if (deliveryStats.total === 0) return 0
    return ((deliveryStats.delivered / deliveryStats.total) * 100).toFixed(1)
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    href,
    trend,
  }: {
    title: string
    value: number
    icon: React.ElementType
    href: string
    trend?: 'up' | 'down' | 'neutral'
  }) => (
    <button
      onClick={() => navigate(href)}
      className="card flex items-center gap-4 p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-text-primary">{formatNumber(value)}</p>
        <p className="text-sm text-text-secondary">{title}</p>
      </div>
      {trend && (
        <div className={trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted'}>
          {trend === 'up' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>
      )}
    </button>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Overview of your email delivery platform
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={loadDashboard}
        >
          Refresh
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="space-y-6">
          {/* Service Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Customers" value={stats.customers} icon={Users} href="/admin/customers" />
            <StatCard title="Servers" value={stats.servers} icon={Server} href="/admin/servers" />
            <StatCard title="Policies" value={stats.policies} icon={FileText} href="/admin/policies" />
            <StatCard title="Routes" value={stats.routes} icon={Route} href="/admin/routes" />
            <StatCard title="Warmups" value={stats.warmups} icon={Flame} href="/admin/warmups" />
            <StatCard title="Connections" value={stats.connections} icon={Mail} href="/admin/mailgun" />
          </div>

          {/* Delivery Overview & Server Status */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Today's Delivery */}
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-text-primary">Today's Delivery</h2>
                <button
                  onClick={() => navigate('/admin/emaildelivery')}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View Details <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <span className="text-2xl font-bold text-success">{getDeliveryRate()}%</span>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Delivery Rate</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {formatNumber(deliveryStats.total)} total attempts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <p className="text-xl font-bold text-success">{formatNumber(deliveryStats.delivered)}</p>
                  <p className="text-xs text-text-secondary">Delivered</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-3 text-center">
                  <p className="text-xl font-bold text-warning">{formatNumber(deliveryStats.soft)}</p>
                  <p className="text-xs text-text-secondary">Soft Bounce</p>
                </div>
                <div className="rounded-lg bg-danger/10 p-3 text-center">
                  <p className="text-xl font-bold text-danger">{formatNumber(deliveryStats.hard)}</p>
                  <p className="text-xs text-text-secondary">Hard Bounce</p>
                </div>
              </div>
            </div>

            {/* Server Status */}
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-text-primary">Server Status</h2>
                <button
                  onClick={() => navigate('/admin/servers')}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Manage Servers <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {serverStatuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Server className="mb-2 h-10 w-10 text-text-muted" />
                  <p className="text-sm text-text-secondary">No servers configured</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/admin/servers/edit?id=new')}
                  >
                    Add Server
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {serverStatuses.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => navigate(`/admin/servers/edit?id=${server.id}`)}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {server.status === 'healthy' ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : server.status === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-danger" />
                        )}
                        <span className="font-medium text-text-primary">{server.name}</span>
                      </div>
                      <Badge variant={server.status === 'healthy' ? 'success' : server.status === 'warning' ? 'warning' : 'danger'}>
                        {server.status === 'healthy' ? 'Healthy' : server.status === 'warning' ? 'Warning' : 'Error'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-primary">Recent Activity</h2>
              <button
                onClick={() => navigate('/admin/log')}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View All <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="mb-2 h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-secondary">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">
                        <span className="font-medium">{log.user_name}</span>
                        {' '}
                        {log.pre_msg}
                        {log.link_msg && <span className="font-medium"> {log.link_msg}</span>}
                        {log.post_msg}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-text-muted">
                      {formatDistanceToNow(new Date(log.ts), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </LoadingOverlay>

      {user?.software_version && (
        <p className="mt-8 text-right text-xs text-text-muted">
          Software version: {user.software_version}
        </p>
      )}
    </div>
  )
}
