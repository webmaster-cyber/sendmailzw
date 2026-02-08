import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Globe } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import type { ContactList, DomainStat } from '../../types/contact'

export function ContactsDomainsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''

  const [list, setList] = useState<ContactList | null>(null)
  const [domains, setDomains] = useState<DomainStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Load list and domains
  const loadDomains = useCallback(async () => {
    setIsLoading(true)
    try {
      const [listRes, domainsRes] = await Promise.all([
        api.get<ContactList>(`/api/lists/${listId}`),
        api.post<DomainStat[]>(`/api/lists/${listId}/domainstats`),
      ])
      setList(listRes.data)
      setDomains(domainsRes.data)
    } finally {
      setIsLoading(false)
    }
  }, [listId])

  useEffect(() => {
    if (listId) loadDomains()
  }, [loadDomains, listId])

  // Filter domains
  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(search.toLowerCase())
  )

  // Selection
  const toggleSelect = (domain: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) {
        next.delete(domain)
      } else {
        next.add(domain)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filteredDomains.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredDomains.map((d) => d.domain)))
    }
  }

  // Delete domains
  const handleDelete = () => {
    const domainList = Array.from(selected)
    const count = domainList.reduce((sum, d) => {
      const domain = domains.find((dom) => dom.domain === d)
      return sum + (domain?.count || 0)
    }, 0)

    setConfirmDialog({
      open: true,
      title: 'Delete Domains',
      message: `Are you sure you want to delete ${domainList.length} domain${domainList.length !== 1 ? 's' : ''} (${count.toLocaleString()} contacts)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.post(`/api/lists/${listId}/deletedomains`, { domains: domainList })
        toast.success('Domains deleted')
        setSelected(new Set())
        loadDomains()
      },
    })
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

  // Total selected count
  const selectedCount = Array.from(selected).reduce((sum, d) => {
    const domain = domains.find((dom) => dom.domain === d)
    return sum + (domain?.count || 0)
  }, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/contacts')}
          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-text-primary">Domain Stats</h1>
          {list && (
            <p className="text-sm text-text-muted">
              {list.name} - {domains.length.toLocaleString()} domains
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <LoadingOverlay loading={isLoading}>
        <div className="card">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search domains..."
              />
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {selected.size} selected ({selectedCount.toLocaleString()} contacts)
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={handleDelete}
                >
                  Delete Selected
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          {filteredDomains.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-10 w-10" />}
              title="No domains found"
              description={search ? 'Try adjusting your search.' : 'No domain data available.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.size === filteredDomains.length && filteredDomains.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded text-primary"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                      Domain
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-text-muted uppercase">
                      Contacts
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-text-muted uppercase">
                      % of List
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDomains.map((domain) => {
                    const pct = list ? ((domain.count / list.count) * 100).toFixed(2) : '0'
                    return (
                      <tr key={domain.domain} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(domain.domain)}
                            onChange={() => toggleSelect(domain.domain)}
                            className="rounded text-primary"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-text-primary">
                          {domain.domain}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-text-secondary">
                          {(domain.count ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-text-muted">
                          {pct}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
      />
    </div>
  )
}
