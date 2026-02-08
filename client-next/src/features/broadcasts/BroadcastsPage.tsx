import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, AlertTriangle, Megaphone } from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { usePolling } from '../../hooks/usePolling'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import type { Broadcast, BroadcastsResponse, BroadcastStatus, BroadcastTab } from '../../types/broadcast'

export function BroadcastsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [activeTab, setActiveTab] = useState<BroadcastTab>('sent')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasNewer, setHasNewer] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const reload = useCallback(async (silent = false, params?: { older?: string; newer?: string }) => {
    if (!silent) setIsLoading(true)
    try {
      const searchParam = `search=${encodeURIComponent(search)}`
      let queryString = searchParam
      if (params?.older) {
        queryString += `&older=${params.older}`
      } else if (params?.newer) {
        queryString += `&newer=${params.newer}`
      }

      const { data } = await api.get<BroadcastsResponse>(`/api/broadcasts?${queryString}`)
      setBroadcasts(data.broadcasts)
      setTotalCount(data.count)

      if (params?.older) {
        setHasNewer(true)
        setHasOlder(data.count > 10)
      } else if (params?.newer) {
        setHasOlder(true)
        setHasNewer(data.count > 10)
      } else {
        setHasNewer(false)
        setHasOlder(data.count > 10)
      }
    } finally {
      setIsLoading(false)
    }
  }, [search])

  // Initial load
  useEffect(() => {
    reload()
  }, [reload])

  // Auto-refresh every 20s when not paginating
  usePolling({
    callback: () => reload(true),
    intervalMs: 20000,
    enabled: !hasNewer && !loadingOlder,
  })

  // Tab filtering
  const sentList = broadcasts.filter((b) => b.sent_at)
  const scheduledList = broadcasts
    .filter((b) => !b.sent_at && b.scheduled_for)
    .sort((a, b) => (a.scheduled_for! > b.scheduled_for! ? 1 : -1))
  const draftsList = broadcasts.filter((b) => !b.sent_at && !b.scheduled_for)

  const currentList = activeTab === 'sent' ? sentList : activeTab === 'scheduled' ? scheduledList : draftsList

  const tabs = [
    { key: 'drafts' as const, label: 'Drafts', count: draftsList.length },
    { key: 'scheduled' as const, label: 'Scheduled', count: scheduledList.length },
    { key: 'sent' as const, label: 'Sent', count: activeTab === 'sent' ? totalCount : sentList.length },
  ]

  // Pagination
  const viewOlder = async () => {
    setLoadingOlder(true)
    try {
      const completed = broadcasts.filter((b) => b.sent_at)
      if (completed.length) {
        await reload(false, { older: completed[completed.length - 1].sent_at! })
      }
    } finally {
      setLoadingOlder(false)
    }
  }

  const viewNewer = async () => {
    setLoadingOlder(true)
    try {
      const completed = broadcasts.filter((b) => b.sent_at)
      if (completed.length) {
        await reload(false, { newer: completed[0].sent_at! })
      }
    } finally {
      setLoadingOlder(false)
    }
  }

  // Actions
  const handleDelete = (broadcast: Broadcast) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Broadcast',
      message: `Are you sure you wish to delete '${broadcast.name}'?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/broadcasts/${broadcast.id}`)
        toast.success('Broadcast deleted')
        await reload()
      },
    })
  }

  const handleCancel = (broadcast: Broadcast) => {
    setConfirmDialog({
      open: true,
      title: 'Cancel Broadcast',
      message: `Are you sure you wish to cancel '${broadcast.name}'?`,
      confirmLabel: 'Cancel Broadcast',
      onConfirm: async () => {
        await api.post(`/api/broadcasts/${broadcast.id}/cancel`)
        toast.success('Cancel request sent')
      },
    })
  }

  const handleDuplicate = async (broadcast: Broadcast) => {
    await api.post(`/api/broadcasts/${broadcast.id}/duplicate`)
    toast.success('Broadcast duplicated')
    await reload()
  }

  const handleExport = async (broadcast: Broadcast) => {
    await api.post(`/api/broadcasts/${broadcast.id}/export`)
    toast.success('Download your export file from the Data Exports page')
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirmDialog.onConfirm()
    } finally {
      setConfirmLoading(false)
      setConfirmDialog((prev) => ({ ...prev, open: false }))
    }
  }

  // Status helpers
  function getStatus(b: Broadcast): BroadcastStatus {
    if (b.canceled) return 'Canceled'
    if (b.error) return 'Error'
    if (b.finished_at) return 'Complete'
    if (b.scheduled_for && !b.sent_at) return 'Scheduled'
    if (!b.count) return 'Initializing'
    if (b.sent_at) return 'Sending'
    return 'Draft'
  }

  function pct(b: Broadcast, n: number, prop: keyof Broadcast): number {
    const denom = b[prop]
    if (!denom || typeof denom !== 'number' || !n) return 0
    return (n / denom) * 100
  }

  function highBounces(b: Broadcast): boolean {
    const rate = user?.frontend?.bouncerate ?? 2.0
    return pct(b, b.bounced, 'delivered') >= rate || pct(b, b.soft, 'delivered') >= rate
  }

  function highComplaints(b: Broadcast): boolean {
    const rate = user?.frontend?.complaintrate ?? 2.0
    return pct(b, b.complained, 'send') >= rate
  }

  function needsAlert(b: Broadcast): boolean {
    return highBounces(b) || highComplaints(b) || b.overdomaincomplaint || b.overdomainbounce || (!!b.error && !b.canceled)
  }

  function formatPct(n: number): string {
    return n.toFixed(1) + '%'
  }

  // Actions per broadcast
  function getActions(b: Broadcast) {
    const items = []

    if (!b.sent_at && !b.scheduled_for) {
      items.push({ label: 'Edit', onClick: () => navigate(`/broadcasts/review?id=${b.id}`) })
      items.push({ label: 'Duplicate', onClick: () => handleDuplicate(b) })
      items.push({ label: 'Delete', onClick: () => handleDelete(b), variant: 'danger' as const })
    } else if (b.scheduled_for && !b.sent_at) {
      // Scheduled: can edit or cancel
      items.push({ label: 'Edit', onClick: () => navigate(`/broadcasts/review?id=${b.id}`) })
      items.push({ label: 'Duplicate', onClick: () => handleDuplicate(b) })
      items.push({ label: 'Cancel', onClick: () => handleCancel(b), variant: 'danger' as const })
    } else {
      // Sent/Sending/Complete
      const finished = !!b.finished_at || b.canceled
      items.push({ label: 'View Report', onClick: () => navigate(`/broadcasts/summary?id=${b.id}`) })
      items.push({ label: 'Duplicate', onClick: () => handleDuplicate(b) })
      if (user && !user.nodataexport) {
        items.push({ label: 'Export', onClick: () => handleExport(b) })
      }
      items.push({ label: 'Update', onClick: () => navigate(`/broadcasts/settings?id=${b.id}`) })
      if (!finished) {
        items.push({ label: 'Cancel', onClick: () => handleCancel(b), variant: 'danger' as const })
      } else {
        items.push({ label: 'Delete', onClick: () => handleDelete(b), variant: 'danger' as const })
      }
    }

    return items
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Broadcasts</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/broadcasts/settings?id=new')}>
          Create Broadcast
        </Button>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex items-center justify-between px-4 pt-2">
          <Tabs tabs={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as BroadcastTab)} />
          {activeTab === 'sent' && (
            <div className="w-64">
              <SearchInput value={search} onChange={setSearch} placeholder="Search broadcasts..." />
            </div>
          )}
        </div>

        {/* Content */}
        <LoadingOverlay loading={isLoading}>
          {currentList.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-10 w-10" />}
              title={`No ${activeTab} broadcasts`}
              description={activeTab === 'drafts' ? 'Create a new broadcast to get started.' : undefined}
            />
          ) : (
            <div className="divide-y divide-border">
              {activeTab === 'sent' && currentList.map((b) => <SentRow key={b.id} broadcast={b} />)}
              {activeTab === 'scheduled' && currentList.map((b) => <ScheduledRow key={b.id} broadcast={b} />)}
              {activeTab === 'drafts' && currentList.map((b) => <DraftRow key={b.id} broadcast={b} />)}
            </div>
          )}

          {/* Pagination */}
          {activeTab === 'sent' && currentList.length > 0 && (hasNewer || hasOlder) && (
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              {hasNewer && (
                <Button variant="secondary" size="sm" onClick={viewNewer} loading={loadingOlder}>
                  Newer
                </Button>
              )}
              {hasOlder && (
                <Button variant="secondary" size="sm" onClick={viewOlder} loading={loadingOlder}>
                  Older
                </Button>
              )}
            </div>
          )}
        </LoadingOverlay>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmLoading}
      />
    </div>
  )

  // --- Row Components ---

  function SentRow({ broadcast: b }: { broadcast: Broadcast }) {
    const status = getStatus(b)
    const alert = needsAlert(b)
    const progress = b.count ? Math.round((b.delivered / b.count) * 100) : 0

    return (
      <div className="px-4 py-3 hover:bg-gray-50/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <button
              onClick={() => navigate(`/broadcasts/summary?id=${b.id}`)}
              className="text-sm font-medium text-text-primary hover:text-primary truncate block"
            >
              {b.name}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
              <StatusBadge status={status} />
              {b.sent_at && <span>Started {format(new Date(b.sent_at), 'MMM d, yyyy h:mm a')}</span>}
              {status === 'Sending' && (
                <span className="text-primary">{progress}% delivered</span>
              )}
            </div>

            {/* Metrics row */}
            {(status === 'Complete' || status === 'Sending') && b.send > 0 && (
              <div className="mt-2 flex gap-4 text-xs">
                <Metric label="Delivered" value={(b.send ?? 0).toLocaleString()} />
                <Metric label="Opened" value={formatPct(pct(b, b.opened, 'send'))} />
                <Metric label="Clicked" value={formatPct(pct(b, b.clicked, 'send'))} />
                <Metric label="Unsubs" value={(b.unsubscribed ?? 0).toLocaleString()} />
                <Metric label="Bounced" value={formatPct(pct(b, b.bounced, 'delivered'))} />
              </div>
            )}

            {/* Warnings */}
            {alert && <Warnings broadcast={b} />}
          </div>

          <ActionMenu items={getActions(b)} />
        </div>
      </div>
    )
  }

  function ScheduledRow({ broadcast: b }: { broadcast: Broadcast }) {
    return (
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate(`/broadcasts/review?id=${b.id}`)}
            className="text-sm font-medium text-text-primary hover:text-primary truncate block"
          >
            {b.name}
          </button>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <StatusBadge status="Scheduled" />
            {b.scheduled_for && (
              <span>Scheduled for {format(new Date(b.scheduled_for), 'MMM d, yyyy h:mm a')}</span>
            )}
          </div>
        </div>
        <ActionMenu items={getActions(b)} />
      </div>
    )
  }

  function DraftRow({ broadcast: b }: { broadcast: Broadcast }) {
    return (
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate(`/broadcasts/review?id=${b.id}`)}
            className="text-sm font-medium text-text-primary hover:text-primary truncate block"
          >
            {b.name}
          </button>
          <div className="mt-1 text-xs text-text-muted">
            Last modified {format(new Date(b.modified), 'MMM d, yyyy h:mm a')}
          </div>
        </div>
        <ActionMenu items={getActions(b)} />
      </div>
    )
  }

  function Warnings({ broadcast: b }: { broadcast: Broadcast }) {
    const warnings: string[] = []
    if (highBounces(b)) warnings.push('High Bounces')
    if (highComplaints(b)) warnings.push('High Complaints')
    if (b.overdomainbounce) warnings.push('High Domain Bounces')
    if (b.overdomaincomplaint) warnings.push('High Domain Complaints')

    return (
      <div className="mt-2 space-y-1">
        {warnings.map((w) => (
          <div key={w} className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            {w}
          </div>
        ))}
        {b.error && !b.canceled && (
          <p className="text-xs text-danger truncate max-w-md" title={b.error}>
            {b.error}
          </p>
        )}
      </div>
    )
  }
}

function StatusBadge({ status }: { status: BroadcastStatus }) {
  const colors: Record<BroadcastStatus, string> = {
    Complete: 'bg-success/10 text-success',
    Sending: 'bg-info/10 text-info',
    Scheduled: 'bg-primary/10 text-primary',
    Draft: 'bg-gray-100 text-text-muted',
    Canceled: 'bg-warning/10 text-warning',
    Error: 'bg-danger/10 text-danger',
    Initializing: 'bg-gray-100 text-text-muted',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-text-muted">{label}:</span>{' '}
      <span className="font-medium text-text-secondary">{value}</span>
    </div>
  )
}
