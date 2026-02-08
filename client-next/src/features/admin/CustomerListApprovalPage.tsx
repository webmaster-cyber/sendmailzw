import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileCheck,
  LogIn,
  CheckCircle,
  Ban,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { Customer, PendingList, PendingListsResponse } from '../../types/admin'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  error: 'Error',
  complete: 'Complete',
  skipped: 'Skipped',
}

export function CustomerListApprovalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { startImpersonationInNewTab } = useAuth()
  const id = searchParams.get('id')

  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lists, setLists] = useState<PendingList[]>([])
  const [zendeskHost, setZendeskHost] = useState<string | undefined>()

  // Customer action confirmations
  const [customerAction, setCustomerAction] = useState<{
    type: 'approve' | 'ban' | 'unban' | 'pause' | 'unpause' | 'purge-c' | 'purge-f' | 'purge-t' | 'delete' | null
    open: boolean
  }>({ type: null, open: false })
  const [isCustomerActionLoading, setIsCustomerActionLoading] = useState(false)

  // Approval modal
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approveListId, setApproveListId] = useState<string | null>(null)
  const [approveComment, setApproveComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [customerRes, listsRes] = await Promise.all([
        api.get<Customer>(`/api/companies/${id}`),
        api.get<PendingListsResponse>(`/api/companies/${id}/pendinglists`),
      ])
      setCustomer(customerRes.data)
      setLists(listsRes.data.lists || [])
      setZendeskHost(listsRes.data.zendesk_host)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  if (!id) {
    navigate('/admin/customers')
    return null
  }

  const handleDownload = (url: string) => {
    window.location.href = url
  }

  const handleOpenTicket = (ticketId: string) => {
    if (!zendeskHost || !ticketId) return
    window.open(`https://${zendeskHost}/agent/tickets/${ticketId}`, '_blank')
  }

  const openApproveModal = (listId: string) => {
    setApproveListId(listId)
    setApproveComment('')
    setShowApproveModal(true)
  }

  const handleApprove = async () => {
    if (!approveListId) return
    setIsApproving(true)
    try {
      await api.post(`/api/companies/${id}/pendinglists/${approveListId}/approve`, {
        comment:
          approveComment ||
          'Your list data has been approved and is now available to send. Thank you!',
      })
      toast.success('List approved')
      setShowApproveModal(false)
      await reload()
    } catch {
      toast.error('Failed to approve list')
    } finally {
      setIsApproving(false)
    }
  }

  // Customer action handlers
  const handleImpersonate = () => {
    if (!customer) return
    startImpersonationInNewTab(customer.id)
  }

  const handleCustomerApprove = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/approvecompanies', { ids: [id] })
      toast.success('Customer approved')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to approve customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerBan = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/bancompanies', [id])
      toast.success('Customer banned')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to ban customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerUnban = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/unbancompanies', [id])
      toast.success('Customer unbanned')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to unban customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerPause = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/pausecompanies', [id])
      toast.success('Sending paused')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to pause customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerUnpause = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/unpausecompanies', [id])
      toast.success('Sending unpaused')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to unpause customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerPurge = async (queue: 'c' | 'f' | 't') => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post(`/api/purgequeues/${queue}`, [id])
      const queueName = queue === 'c' ? 'Broadcast' : queue === 'f' ? 'Funnel' : 'Transactional'
      toast.success(`${queueName} queue purged`)
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to purge queue')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerDelete = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.delete(`/api/companies/${id}`)
      toast.success('Customer deleted')
      navigate('/admin/customers')
    } catch {
      toast.error('Failed to delete customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const getActions = (list: PendingList) => {
    const items: { label: string; onClick: () => void; disabled?: boolean }[] = [
      {
        label: 'Download Report',
        onClick: () => list.validation.download_url && handleDownload(list.validation.download_url),
        disabled: !list.validation.download_url,
      },
    ]

    if (zendeskHost && list.approval_ticket) {
      items.push({
        label: 'Send Reply',
        onClick: () => handleOpenTicket(list.approval_ticket!),
      })
    }

    items.push({
      label: 'Approve',
      onClick: () => openApproveModal(list.id),
    })

    return items
  }

  const tabs = [
    {
      id: 'settings',
      label: 'Settings',
      onClick: () => navigate(`/admin/customers/edit?id=${id}`),
    },
    {
      id: 'users',
      label: 'Users',
      onClick: () => navigate(`/admin/customers/users?id=${id}`),
    },
    { id: 'approval', label: 'List Approval' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/customers')}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <h1 className="text-xl font-semibold text-text-primary">
          Pending Lists {customer ? `for "${customer.name}"` : ''}
        </h1>
        {customer?.banned && <span className="badge badge-danger">Banned</span>}
        {customer?.paused && <span className="badge badge-warning">Paused</span>}
        {customer?.inreview && <span className="badge badge-info">Awaiting Approval</span>}
        {customer?.paid && <span className="badge badge-success">Paid</span>}
      </div>

      {/* Customer Actions */}
      {customer && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-gray-50 p-3">
          <Button size="sm" variant="secondary" onClick={handleImpersonate}>
            <LogIn className="mr-1 h-3 w-3" />
            Login As
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'approve', open: true })}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'ban', open: true })}
          >
            <Ban className="mr-1 h-3 w-3" />
            Ban
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'unban', open: true })}
          >
            Unban
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'pause', open: true })}
          >
            <Pause className="mr-1 h-3 w-3" />
            Pause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'unpause', open: true })}
          >
            <Play className="mr-1 h-3 w-3" />
            Unpause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'purge-c', open: true })}
          >
            Purge BC
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'purge-f', open: true })}
          >
            Purge Funnel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'purge-t', open: true })}
          >
            Purge Trans
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setCustomerAction({ type: 'delete', open: true })}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab="approval" />
      </div>

      <LoadingOverlay loading={isLoading}>
        {lists.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="h-10 w-10" />}
            title="No pending lists"
            description="This customer does not have any pending lists for approval."
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Validation Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Count
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Processed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Result Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Risk Summary
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lists.map((list) => (
                  <tr key={list.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{list.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm ${
                          list.validation.status === 'error'
                            ? 'text-danger'
                            : list.validation.status === 'complete'
                            ? 'text-success'
                            : 'text-text-secondary'
                        }`}
                      >
                        {STATUS_LABELS[list.validation.status] || list.validation.status}
                        {list.validation.status === 'error' && list.validation.message && (
                          <span className="ml-1">- {list.validation.message}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-secondary">
                      {list.validation.quantity?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-secondary">
                      {list.validation.records_processed?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {list.validation.result && (
                        <div className="text-xs">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Do Not Send:</span>
                            <span>{(list.validation.result.do_not_send ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Undeliverable:</span>
                            <span>{(list.validation.result.undeliverable ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Deliverable:</span>
                            <span className="text-success">
                              {(list.validation.result.deliverable ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Unknown:</span>
                            <span>{(list.validation.result.unknown ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {list.validation.risk && (
                        <div className="text-xs">
                          <div className="flex justify-between">
                            <span className="text-text-muted">High:</span>
                            <span className="text-danger">
                              {(list.validation.risk.high ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Medium:</span>
                            <span className="text-warning">
                              {(list.validation.risk.medium ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Low:</span>
                            <span className="text-success">
                              {(list.validation.risk.low ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Unknown:</span>
                            <span>{(list.validation.risk.unknown ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={getActions(list)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      {/* Approve Modal */}
      <Modal
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve List"
      >
        <Input
          label="Message for Ticket"
          value={approveComment}
          onChange={(e) => setApproveComment(e.target.value)}
          placeholder="Your list data has been approved and is now available to send. Thank you!"
          multiline
          rows={4}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleApprove} loading={isApproving}>
            Approve
          </Button>
        </div>
      </Modal>

      {/* Customer Action Confirmations */}
      <ConfirmDialog
        open={customerAction.type === 'approve' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerApprove}
        title="Approve Customer"
        confirmLabel="Approve"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to approve <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'ban' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerBan}
        title="Ban Customer"
        confirmLabel="Ban"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to ban <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'unban' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerUnban}
        title="Unban Customer"
        confirmLabel="Unban"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to unban <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'pause' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerPause}
        title="Pause Sending"
        confirmLabel="Pause"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to pause sending for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'unpause' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerUnpause}
        title="Unpause Sending"
        confirmLabel="Unpause"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to unpause sending for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'purge-c' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={() => handleCustomerPurge('c')}
        title="Purge Broadcast Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to purge the broadcast queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'purge-f' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={() => handleCustomerPurge('f')}
        title="Purge Funnel Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to purge the funnel queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'purge-t' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={() => handleCustomerPurge('t')}
        title="Purge Transactional Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to purge the transactional queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'delete' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerDelete}
        title="Delete Customer"
        confirmLabel="Delete"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to permanently delete <strong>{customer?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
