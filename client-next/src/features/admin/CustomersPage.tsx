import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Building2,
  Search,
  RefreshCw,
  LogIn,
  Trash2,
  Ban,
  Play,
  Pause,
  CheckCircle,
  Settings,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, isBefore } from 'date-fns'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { DataTable, type Column } from '../../components/data/DataTable'
import type { Customer, PostalRoute, CustomerFilter } from '../../types/admin'
import { CUSTOMER_FILTER_OPTIONS } from '../../types/admin'

function pct(n: number): string {
  return (n * 100).toFixed(2) + '%'
}

function formatAge(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    const date = parseISO(dateStr)
    return formatDistanceToNow(date, { addSuffix: false })
  } catch {
    return 'N/A'
  }
}

export function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { startImpersonationInNewTab } = useAuth()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [routes, setRoutes] = useState<PostalRoute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>(
    (searchParams.get('filter') as CustomerFilter) || 'all'
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Modals
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
    showTextarea?: boolean
    textareaLabel?: string
    textareaPlaceholder?: string
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    confirmLabel: '',
  })
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [approveComment, setApproveComment] = useState('')

  const reload = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const [customersRes, routesRes] = await Promise.all([
        api.get<Customer[]>('/api/companies', {
          params: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        }),
        api.get<PostalRoute[]>('/api/routes'),
      ])
      setCustomers(customersRes.data)
      setRoutes(routesRes.data)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Update URL when filter changes
  useEffect(() => {
    if (filter !== 'all') {
      setSearchParams({ filter })
    } else {
      setSearchParams({})
    }
  }, [filter, setSearchParams])

  // Filter logic
  const filteredCustomers = useMemo(() => {
    let result = customers

    // Apply status filter
    result = result.filter((c) => {
      switch (filter) {
        case 'all':
          return true
        case 'banned':
          return c.banned
        case 'nosubmit':
          return c.inreview && !c.moderation && !c.banned
        case 'waiting':
          return c.inreview && c.moderation && !c.banned
        case 'free':
          return !c.paid && !c.inreview && !c.banned
        case 'ended':
          return (
            !c.paid &&
            !c.inreview &&
            c.trialend &&
            isBefore(parseISO(c.trialend), new Date()) &&
            !c.banned
          )
        case 'paid':
          return c.paid && !c.banned
        case 'paused':
          return c.paused && !c.banned
        case 'probation':
          // On probation if paid, not banned, and has limits at or below defaults
          return (
            c.paid &&
            !c.banned &&
            c.hourlimit !== null &&
            c.daylimit !== null &&
            c.defaultdaylimit !== undefined &&
            c.defaulthourlimit !== undefined &&
            c.daylimit <= c.defaultdaylimit &&
            c.hourlimit <= c.defaulthourlimit
          )
        default:
          return true
      }
    })

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
      )
    }

    return result
  }, [customers, filter, searchQuery])

  // Selection helpers
  const toggleSelectAll = () => {
    if (selected.size === filteredCustomers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredCustomers.map((c) => c.id)))
    }
  }

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selected.has(c.id)),
    [customers, selected]
  )

  // Actions
  const handleCreate = () => {
    navigate('/admin/customers/edit?id=new')
  }

  const handleEdit = () => {
    if (selected.size !== 1) return
    const id = Array.from(selected)[0]
    navigate(`/admin/customers/edit?id=${id}`)
  }

  const handleImpersonate = () => {
    if (selected.size !== 1) return
    const customer = selectedCustomers[0]
    startImpersonationInNewTab(customer.id)
    toast.success(`Opened ${customer.name} in new tab`)
  }

  const handleDelete = () => {
    if (selected.size !== 1) return
    const customer = selectedCustomers[0]
    setConfirmDialog({
      open: true,
      title: 'Delete Customer',
      message: `Are you sure you want to delete "${customer.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/companies/${customer.id}`)
        toast.success('Customer deleted')
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handleApprove = () => {
    if (selected.size === 0) return
    const names = selectedCustomers.map((c) => c.name).join(', ')
    setApproveComment('')
    setConfirmDialog({
      open: true,
      title: 'Approve Customers',
      message: `Are you sure you want to approve: ${names}?`,
      confirmLabel: 'Approve',
      showTextarea: true,
      textareaLabel: 'Message for Ticket',
      textareaPlaceholder:
        'Your account has been approved for its free trial. Thank you for trying us out!',
      onConfirm: async () => {
        await api.post('/api/approvecompanies', {
          ids: Array.from(selected),
          comment:
            approveComment ||
            'Your account has been approved for its free trial. Thank you for trying us out!',
        })
        toast.success('Customers approved')
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handleBan = () => {
    if (selected.size === 0) return
    const names = selectedCustomers.map((c) => c.name).join(', ')
    setConfirmDialog({
      open: true,
      title: 'Ban Customers',
      message: `Are you sure you want to ban: ${names}?`,
      confirmLabel: 'Ban',
      onConfirm: async () => {
        await api.post('/api/bancompanies', Array.from(selected))
        toast.success('Customers banned')
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handleUnban = () => {
    if (selected.size === 0) return
    const names = selectedCustomers.map((c) => c.name).join(', ')
    setConfirmDialog({
      open: true,
      title: 'Unban Customers',
      message: `Are you sure you want to unban: ${names}?`,
      confirmLabel: 'Unban',
      onConfirm: async () => {
        await api.post('/api/unbancompanies', Array.from(selected))
        toast.success('Customers unbanned')
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handlePause = () => {
    if (selected.size === 0) return
    const names = selectedCustomers.map((c) => c.name).join(', ')
    setConfirmDialog({
      open: true,
      title: 'Pause Sending',
      message: `Are you sure you want to pause sending for: ${names}?`,
      confirmLabel: 'Pause',
      onConfirm: async () => {
        await api.post('/api/pausecompanies', Array.from(selected))
        toast.success('Sending paused')
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handleUnpause = () => {
    if (selected.size === 0) return
    const names = selectedCustomers.map((c) => c.name).join(', ')
    setConfirmDialog({
      open: true,
      title: 'Unpause Sending',
      message: `Are you sure you want to unpause sending for: ${names}?`,
      confirmLabel: 'Unpause',
      onConfirm: async () => {
        await api.post('/api/unpausecompanies', Array.from(selected))
        toast.success('Sending unpaused')
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handlePurge = (queueType: 'c' | 'f' | 't') => {
    if (selected.size === 0) return
    const names = selectedCustomers.map((c) => c.name).join(', ')
    const queueNames = { c: 'Broadcast', f: 'Funnel', t: 'Transactional' }
    setConfirmDialog({
      open: true,
      title: `Purge ${queueNames[queueType]} Queue`,
      message: `Are you sure you want to purge the ${queueNames[queueType].toLowerCase()} queue for: ${names}?`,
      confirmLabel: 'Purge',
      onConfirm: async () => {
        await api.post(`/api/purgequeues/${queueType}`, Array.from(selected))
        toast.success(`${queueNames[queueType]} queue purged`)
        setSelected(new Set())
        await reload()
      },
    })
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirmDialog.onConfirm()
    } catch (err) {
      toast.error('Operation failed')
    } finally {
      setConfirmLoading(false)
      setConfirmDialog((prev) => ({ ...prev, open: false }))
    }
  }

  // Get route names for display
  const getRouteNames = (routeIds: string[]): string => {
    if (!routeIds || routeIds.length === 0) return 'None'
    return routeIds
      .map((id) => {
        const route = routes.find((r) => r.id === id)
        return route?.name || '<Deleted>'
      })
      .join(', ')
  }

  // Customer status display
  const getStatusBadge = (customer: Customer) => {
    if (customer.banned) {
      return <span className="badge badge-danger">Banned</span>
    }
    if (customer.paused) {
      return <span className="badge badge-warning">Paused</span>
    }
    if (
      !customer.paid &&
      !customer.inreview &&
      customer.trialend &&
      isBefore(parseISO(customer.trialend), new Date())
    ) {
      return <span className="badge badge-warning">Trial Expired</span>
    }
    if (customer.inreview) {
      return <span className="badge badge-info">In Review</span>
    }
    return null
  }

  // Column definitions
  const showStatsColumns = filter !== 'nosubmit' && filter !== 'waiting'
  const showQueueColumns =
    filter !== 'banned' &&
    filter !== 'nosubmit' &&
    filter !== 'waiting' &&
    filter !== 'ended'
  const showLimitColumns =
    filter !== 'banned' && filter !== 'nosubmit' && filter !== 'ended'
  const showRoutesColumn = filter === 'all'

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (customer: Customer) => (
        <div>
          <button
            onClick={() => navigate(`/admin/customers/edit?id=${customer.id}`)}
            className="font-medium text-primary hover:underline"
          >
            {customer.name}
          </button>
          <div className="text-xs text-text-muted">{customer.email}</div>
          {getStatusBadge(customer)}
        </div>
      ),
    },
  ]

  if (showStatsColumns) {
    columns.push(
      {
        key: 'open',
        header: 'Opens',
        sortable: true,
        align: 'right',
        render: (c: Customer) => pct(c.open ?? 0),
      },
      {
        key: 'hard',
        header: 'Hard Bounces',
        sortable: true,
        align: 'right',
        render: (c: Customer) => pct(c.hard ?? 0),
      },
      {
        key: 'complaint',
        header: 'Complaints',
        sortable: true,
        align: 'right',
        render: (c: Customer) => pct(c.complaint ?? 0),
      },
      {
        key: 'send',
        header: 'Volume',
        sortable: true,
        align: 'right',
        render: (c: Customer) => (c.send ?? 0).toLocaleString(),
      }
    )
  }

  columns.push({
    key: 'contacts',
    header: 'Total Contacts',
    sortable: true,
    align: 'right',
    render: (c: Customer) => (c.contacts ?? 0).toLocaleString(),
  })

  if (showQueueColumns) {
    columns.push(
      {
        key: 'cqueue',
        header: 'BC Queue',
        sortable: true,
        align: 'right',
        render: (c: Customer) => (c.cqueue ?? 0).toLocaleString(),
      },
      {
        key: 'fqueue',
        header: 'Funnel Queue',
        sortable: true,
        align: 'right',
        render: (c: Customer) => (c.fqueue ?? 0).toLocaleString(),
      },
      {
        key: 'tqueue',
        header: 'Trans Queue',
        sortable: true,
        align: 'right',
        render: (c: Customer) => (c.tqueue ?? 0).toLocaleString(),
      }
    )
  }

  if (showRoutesColumn) {
    columns.push({
      key: 'routes',
      header: 'Postal Routes',
      render: (c: Customer) => <span className="text-xs">{getRouteNames(c.routes ?? [])}</span>,
    })
  }

  columns.push(
    {
      key: 'lasttime',
      header: 'Last Use',
      sortable: true,
      render: (c: Customer) => formatAge(c.lasttime),
    },
    {
      key: 'created',
      header: 'Age',
      sortable: true,
      align: 'right',
      render: (c: Customer) => formatAge(c.created),
    }
  )

  if (showLimitColumns) {
    columns.push(
      {
        key: 'daylimit',
        header: 'Daily Limit',
        sortable: true,
        align: 'right',
        render: (c: Customer) => (c.daylimit == null ? 'N/A' : c.daylimit.toLocaleString()),
      },
      {
        key: 'monthlimit',
        header: 'Monthly Limit',
        sortable: true,
        align: 'right',
        render: (c: Customer) => (c.monthlimit == null ? 'N/A' : c.monthlimit.toLocaleString()),
      }
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Customers</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/frontends')}
            icon={<Settings className="h-4 w-4" />}
          >
            Advanced Config
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="w-48">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CustomerFilter)}
            options={CUSTOMER_FILTER_OPTIONS}
          />
        </div>
        <div className="w-64">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or email..."
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reload(true)}
          icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-gray-50 p-3">
          <span className="mr-2 text-sm text-text-muted">
            {selected.size} selected:
          </span>
          {selected.size === 1 && (
            <>
              <Button size="sm" variant="secondary" onClick={handleImpersonate}>
                <LogIn className="mr-1 h-3 w-3" />
                Login As
              </Button>
              <Button size="sm" variant="secondary" onClick={handleEdit}>
                Edit
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={handleApprove}>
            <CheckCircle className="mr-1 h-3 w-3" />
            Approve
          </Button>
          <Button size="sm" variant="secondary" onClick={handleBan}>
            <Ban className="mr-1 h-3 w-3" />
            Ban
          </Button>
          <Button size="sm" variant="secondary" onClick={handleUnban}>
            Unban
          </Button>
          <Button size="sm" variant="secondary" onClick={handlePause}>
            <Pause className="mr-1 h-3 w-3" />
            Pause
          </Button>
          <Button size="sm" variant="secondary" onClick={handleUnpause}>
            <Play className="mr-1 h-3 w-3" />
            Unpause
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handlePurge('c')}>
            Purge BC
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handlePurge('f')}>
            Purge Funnel
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handlePurge('t')}>
            Purge Trans
          </Button>
          {selected.size === 1 && (
            <Button size="sm" variant="danger" onClick={handleDelete}>
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <LoadingOverlay loading={isLoading}>
        {customers.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-10 w-10" />}
            title="No customers"
            description="Create a customer to get started."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add Customer
              </Button>
            }
          />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title="No customers found"
            description={
              searchQuery
                ? `No customers match "${searchQuery}"`
                : 'No customers match the selected filter'
            }
          />
        ) : (
          <DataTable
            data={filteredCustomers}
            columns={columns}
            keyField="id"
            selectable
            selected={selected}
            onSelectChange={setSelected}
            onSelectAll={toggleSelectAll}
            defaultSort={{ key: 'created', direction: 'desc' }}
          />
        )}
      </LoadingOverlay>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmLoading}
        variant={
          confirmDialog.confirmLabel === 'Delete' ||
          confirmDialog.confirmLabel === 'Ban' ||
          confirmDialog.confirmLabel === 'Purge'
            ? 'danger'
            : 'default'
        }
      >
        {confirmDialog.showTextarea && (
          <div className="mt-4">
            <Input
              label={confirmDialog.textareaLabel}
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder={confirmDialog.textareaPlaceholder}
              multiline
              rows={4}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
