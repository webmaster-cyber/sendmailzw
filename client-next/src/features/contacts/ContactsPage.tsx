import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Users,
  Upload,
  Search,
  Globe,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { usePolling } from '../../hooks/usePolling'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ListsTableView } from './components/ListsTableView'
import type { ContactList } from '../../types/contact'

type ViewMode = 'grid' | 'table'

export function ContactsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [lists, setLists] = useState<ContactList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const reload = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const { data } = await api.get<ContactList[]>('/api/lists')
      // Ensure all numeric fields have defaults to prevent render errors
      const normalizedLists = data.map((list) => ({
        ...list,
        count: list.count ?? 0,
        active: list.active ?? 0,
        active30: list.active30 ?? 0,
        active60: list.active60 ?? 0,
        active90: list.active90 ?? 0,
        unsubscribed: list.unsubscribed ?? 0,
        bounced: list.bounced ?? 0,
        soft: list.soft ?? 0,
        complained: list.complained ?? 0,
        domaincount: list.domaincount ?? 0,
        lastactivity: list.lastactivity,
      }))
      setLists(normalizedLists)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Poll for processing status updates
  const hasProcessing = lists.some((l) => l.processing)
  usePolling({
    callback: () => reload(true),
    intervalMs: 5000,
    enabled: hasProcessing,
  })

  const handleCreate = async () => {
    if (!newListName.trim()) return
    setIsCreating(true)
    try {
      const { data } = await api.post<{ id: string }>('/api/lists', { name: newListName.trim() })
      toast.success('List created')
      setShowCreateModal(false)
      setNewListName('')
      await reload()
      navigate(`/contacts/add?id=${data.id}`)
    } catch {
      toast.error('Failed to create list')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = (list: ContactList) => {
    setConfirmDialog({
      open: true,
      title: 'Delete List',
      message: `Are you sure you want to delete "${list.name}"? This will remove all ${(list.count ?? 0).toLocaleString()} contacts from this list.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/lists/${list.id}`)
        toast.success('List deleted')
        await reload()
      },
    })
  }

  const handleExport = async (list: ContactList) => {
    try {
      await api.post(`/api/lists/${list.id}/export`)
      toast.success('Export started. Download from Data Exports page.')
    } catch {
      toast.error('Failed to start export')
    }
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

  const getActions = (list: ContactList) => {
    const items: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = [
      { label: 'Find Contacts', onClick: () => navigate(`/contacts/find?id=${list.id}`) },
      { label: 'Add Data', onClick: () => navigate(`/contacts/add?id=${list.id}`) },
      { label: 'Domain Stats', onClick: () => navigate(`/contacts/domains?id=${list.id}`) },
      { label: 'Edit Name', onClick: () => navigate(`/contacts/edit?id=${list.id}`) },
    ]

    if (user && !user.nodataexport) {
      items.push({ label: 'Export', onClick: () => handleExport(list) })
    }

    items.push({ label: 'Delete', onClick: () => handleDelete(list), variant: 'danger' })

    return items
  }

  const formatPct = (n: number, total: number) => {
    if (!total) return '0%'
    return ((n / total) * 100).toFixed(1) + '%'
  }

  // Filter lists by search query
  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists
    const query = searchQuery.toLowerCase()
    return lists.filter((list) => list.name.toLowerCase().includes(query))
  }, [lists, searchQuery])

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Contact Lists</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/contacts/tags')}>
            Manage Tags
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            Create List
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      {lists.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="w-64">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search lists..."
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-gray-50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lists */}
      <LoadingOverlay loading={isLoading}>
        {lists.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No contact lists"
            description="Create a list to start managing your contacts."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
                Create List
              </Button>
            }
          />
        ) : filteredLists.length === 0 ? (
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title="No lists found"
            description={`No lists match "${searchQuery}"`}
          />
        ) : viewMode === 'table' ? (
          <ListsTableView lists={filteredLists} getActions={getActions} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLists.map((list) => (
              <ListCard key={list.id} list={list} actions={getActions(list)} formatPct={formatPct} />
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Contact List"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
        >
          <Input
            label="List Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g., Newsletter Subscribers"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating} disabled={!newListName.trim()}>
              Create List
            </Button>
          </div>
        </form>
      </Modal>

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
}

interface ListCardProps {
  list: ContactList
  actions: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[]
  formatPct: (n: number, total: number) => string
}

function ListCard({ list, actions, formatPct }: ListCardProps) {
  const navigate = useNavigate()

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate(`/contacts/find?id=${list.id}`)}
            className="text-sm font-semibold text-text-primary hover:text-primary truncate block text-left"
          >
            {list.name}
          </button>
          {list.unapproved && (
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-warning/10 px-2 py-0.5 text-xs text-warning">
              <AlertCircle className="h-3 w-3" />
              Pending Approval
            </span>
          )}
        </div>
        <ActionMenu items={actions} />
      </div>

      {/* Processing indicator */}
      {list.processing && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-info/10 px-3 py-2 text-xs text-info">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>
            {typeof list.processing === 'string' ? list.processing : 'Processing...'}
          </span>
        </div>
      )}

      {/* Processing error */}
      {list.processing_error && (
        <div className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {list.processing_error}
        </div>
      )}

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Total Contacts</span>
          <span className="font-medium text-text-primary">{(list.count ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Active</span>
          <span className="font-medium text-success">
            {(list.active ?? 0).toLocaleString()} ({formatPct(list.active, list.count)})
          </span>
        </div>

        {/* Engagement breakdown */}
        <div className="border-t border-border pt-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <StatItem label="30d Active" value={list.active30} />
            <StatItem label="60d Active" value={list.active60} />
            <StatItem label="90d Active" value={list.active90} />
          </div>
        </div>

        {/* Status breakdown */}
        <div className="border-t border-border pt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <StatItem label="Unsubscribed" value={list.unsubscribed} variant="warning" />
            <StatItem label="Bounced" value={list.bounced} variant="danger" />
            <StatItem label="Soft Bounced" value={list.soft} variant="muted" />
            <StatItem label="Complained" value={list.complained} variant="danger" />
          </div>
        </div>

        {/* Domains */}
        {list.domaincount > 0 && (
          <div className="border-t border-border pt-2 text-xs">
            <span className="text-text-muted">{(list.domaincount ?? 0).toLocaleString()} domains</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <button
          onClick={() => navigate(`/contacts/find?id=${list.id}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-text-secondary hover:bg-gray-50"
        >
          <Search className="h-3 w-3" />
          Find
        </button>
        <button
          onClick={() => navigate(`/contacts/add?id=${list.id}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-text-secondary hover:bg-gray-50"
        >
          <Upload className="h-3 w-3" />
          Add
        </button>
        <button
          onClick={() => navigate(`/contacts/domains?id=${list.id}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-text-secondary hover:bg-gray-50"
        >
          <Globe className="h-3 w-3" />
          Domains
        </button>
      </div>
    </div>
  )
}

function StatItem({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  const colors = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    muted: 'text-text-muted',
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium ${colors[variant]}`}>{(value ?? 0).toLocaleString()}</span>
    </div>
  )
}
