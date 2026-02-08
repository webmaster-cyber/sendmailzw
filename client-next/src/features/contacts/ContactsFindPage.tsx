import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Search,
  Tag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  UserMinus,
} from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { Modal } from '../../components/ui/Modal'
import { TagInput } from '../../components/ui/TagInput'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { StatusBadge } from '../../components/ui/Badge'
import { ListActionBar } from './components/ListActionBar'
import { SubscriberCharts } from './components/SubscriberCharts'
import { ListNav } from './components/ListNav'
import type { ContactList, ContactRecord, Segment } from '../../types/contact'

interface ListDetails extends ContactList {
  used_properties?: string[]
}

type StatusTab = 'all' | 'active' | 'unsubscribed' | 'bounced' | 'complained'
type SortField = 'name' | 'email' | 'lastactivity' | 'status'
type SortDirection = 'asc' | 'desc'

interface SearchState {
  searchId: string | null
  status: 'idle' | 'searching' | 'ready'
  results: ContactRecord[]
  total: number
  fields: string[]
  beforeEmail: string | null
  afterEmail: string | null
}

export function ContactsFindPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''
  const { user } = useAuth()

  const [list, setList] = useState<ListDetails | null>(null)
  const [showCharts, setShowCharts] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [segmentsCount, setSegmentsCount] = useState(0)
  const [funnelsCount, setFunnelsCount] = useState(0)
  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [recentTags, setRecentTags] = useState<string[]>([])

  // Sort state - default to most recent activity first
  const [sortField, setSortField] = useState<SortField>('lastactivity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Search state
  const [search, setSearch] = useState<SearchState>({
    searchId: null,
    status: 'idle',
    results: [],
    total: 0,
    fields: [],
    beforeEmail: null,
    afterEmail: null,
  })

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Bulk action state
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagAction, setTagAction] = useState<'add' | 'remove'>('add')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isTagging, setIsTagging] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Normalize list data to ensure numeric fields have defaults
  const normalizeList = (data: ContactList): ContactList => ({
    ...data,
    count: data.count ?? 0,
    active: data.active ?? 0,
    active30: data.active30 ?? 0,
    active60: data.active60 ?? 0,
    active90: data.active90 ?? 0,
    unsubscribed: data.unsubscribed ?? 0,
    bounced: data.bounced ?? 0,
    soft: data.soft ?? 0,
    complained: data.complained ?? 0,
    domaincount: data.domaincount ?? 0,
  })

  // Load list, tags, segments count, and funnels count
  useEffect(() => {
    async function load() {
      try {
        const [listRes, tagsRes, segmentsRes, funnelsRes] = await Promise.all([
          api.get<ListDetails>(`/api/lists/${listId}`),
          api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
          api.get<Segment[]>('/api/segments').catch(() => ({ data: [] })),
          api.get<{ id: string; lists?: string[] }[]>('/api/funnels').catch(() => ({ data: [] })),
        ])
        setList(normalizeList(listRes.data) as ListDetails)
        setRecentTags(tagsRes.data)
        // Count segments that include this list
        const listSegments = segmentsRes.data.filter((s) => {
          // Check if segment references this list in its rules
          const rulesStr = JSON.stringify(s.rules || {})
          return rulesStr.includes(listId)
        })
        setSegmentsCount(listSegments.length)
        // Count funnels that target this list
        const listFunnels = funnelsRes.data.filter((f) => f.lists?.includes(listId))
        setFunnelsCount(listFunnels.length)
      } finally {
        setIsLoading(false)
      }
    }
    if (listId) load()
  }, [listId])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Build segment object for search API
  const buildSegment = useCallback(
    (before?: string, after?: string) => {
      const parts: Record<string, unknown>[] = []

      // Add search query part (searches all fields)
      parts.push({
        id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        type: 'Info',
        tag: '',
        prop: '!!*', // Special: search all fields
        operator: 'contains',
        value: searchQuery || '',
        addedtype: 'inpast',
        addednum: 30,
        addedstart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        addedend: new Date().toISOString(),
      })

      // Add status filter
      if (activeTab === 'active') {
        parts.push({
          id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          type: 'Info',
          tag: '',
          prop: 'Bounced',
          operator: 'notequals',
          value: 'true',
          addedtype: 'inpast',
          addednum: 30,
          addedstart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          addedend: new Date().toISOString(),
          addl: [
            { prop: 'Unsubscribed', operator: 'notequals', value: 'true', type: 'Info' },
            { prop: 'Complained', operator: 'notequals', value: 'true', type: 'Info' },
          ],
        })
      } else if (activeTab === 'unsubscribed') {
        parts.push({
          id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          type: 'Info',
          prop: 'Unsubscribed',
          operator: 'equals',
          value: 'true',
        })
      } else if (activeTab === 'bounced') {
        parts.push({
          id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          type: 'Info',
          prop: 'Bounced',
          operator: 'equals',
          value: 'true',
        })
      } else if (activeTab === 'complained') {
        parts.push({
          id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          type: 'Info',
          prop: 'Complained',
          operator: 'equals',
          value: 'true',
        })
      }

      return {
        parts,
        operator: 'and',
        subset: false,
        subsettype: 'percent',
        subsetpct: 10,
        subsetnum: 2000,
        sort: { id: 'Email', desc: false },
        before,
        after,
      }
    },
    [searchQuery, activeTab]
  )

  // Initiate search
  const startSearch = useCallback(
    async (params?: { before?: string; after?: string }) => {
      setSearch((s) => ({ ...s, status: 'searching' }))
      setSelected(new Set())
      setSelectAll(false)

      try {
        const segment = buildSegment(params?.before, params?.after)

        const { data } = await api.post<{ id: string; complete?: boolean; result?: { rows: ContactRecord[]; has_next: boolean; allprops: string[]; count: number } }>(
          `/api/lists/${listId}/find`,
          segment
        )

        // If result is returned immediately (or complete), use it directly
        if (data.result || data.complete) {
          const result = data.result || { rows: [], allprops: [], count: 0 }
          setSearch((s) => ({
            ...s,
            status: 'ready',
            results: result.rows || [],
            total: result.count || result.rows?.length || 0,
            fields: result.allprops || [],
            beforeEmail: params?.before || null,
            afterEmail: params?.after || null,
          }))
          return
        }

        setSearch((s) => ({
          ...s,
          searchId: data.id,
          beforeEmail: params?.before || null,
          afterEmail: params?.after || null,
        }))

        // Start polling for results
        pollRef.current = setInterval(async () => {
          try {
            const { data: pollResult } = await api.get<{
              complete?: boolean
              error?: string
              result?: { rows: ContactRecord[]; has_next: boolean; allprops: string[]; count: number }
            }>(`/api/listfind/${data.id}`)

            if (pollResult.error) {
              if (pollRef.current) clearInterval(pollRef.current)
              pollRef.current = null
              toast.error(pollResult.error)
              setSearch((s) => ({ ...s, status: 'ready', results: [], total: 0, fields: [] }))
              return
            }

            if (!pollResult.complete) {
              return // Still calculating
            }

            // Results ready
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null

            const result = pollResult.result || { rows: [], allprops: [], count: 0 }
            setSearch((s) => ({
              ...s,
              status: 'ready',
              results: result.rows || [],
              total: result.count || result.rows?.length || 0,
              fields: result.allprops || [],
            }))
          } catch {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            setSearch((s) => ({ ...s, status: 'ready', results: [], total: 0, fields: [] }))
          }
        }, 2000)
      } catch {
        toast.error('Search failed')
        setSearch((s) => ({ ...s, status: 'ready' }))
      }
    },
    [listId, buildSegment]
  )

  // Trigger search on tab/query change
  useEffect(() => {
    if (!isLoading && list) {
      startSearch()
    }
  }, [activeTab, searchQuery, isLoading, list]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle selection
  const toggleSelect = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(email)) {
        next.delete(email)
      } else {
        next.add(email)
      }
      return next
    })
    setSelectAll(false)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set())
      setSelectAll(false)
    } else {
      setSelected(new Set(search.results.map((r) => (r.Email || r.email || '') as string)))
      setSelectAll(true)
    }
  }

  // Bulk tag
  const handleBulkTag = async () => {
    if (selectedTags.length === 0) {
      toast.error('Please select at least one tag')
      return
    }

    setIsTagging(true)
    try {
      const emails = selectAll ? undefined : Array.from(selected)
      await api.post(`/api/lists/${listId}/tag`, {
        emails,
        tags: selectedTags,
        action: tagAction,
        searchId: selectAll ? search.searchId : undefined,
      })
      toast.success(`Tags ${tagAction === 'add' ? 'added' : 'removed'}`)
      setShowTagModal(false)
      setSelectedTags([])
      startSearch()
    } catch {
      toast.error('Failed to update tags')
    } finally {
      setIsTagging(false)
    }
  }

  // Bulk delete
  const handleBulkDelete = () => {
    const count = selectAll ? search.total : selected.size
    setConfirmDialog({
      open: true,
      title: 'Delete Contacts',
      message: `Are you sure you want to delete ${count.toLocaleString()} contact${count !== 1 ? 's' : ''}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const emails = selectAll ? undefined : Array.from(selected)
        await api.post(`/api/lists/${listId}/bulkdelete`, {
          emails,
          searchId: selectAll ? search.searchId : undefined,
        })
        toast.success('Contacts deleted')
        startSearch()
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

  // Pagination
  const goNext = () => {
    const lastResult = search.results[search.results.length - 1]
    const lastEmail = lastResult ? ((lastResult.Email || lastResult.email || '') as string) : ''
    if (lastEmail) startSearch({ after: lastEmail })
  }

  const goPrev = () => {
    const firstResult = search.results[0]
    const firstEmail = firstResult ? ((firstResult.Email || firstResult.email || '') as string) : ''
    if (firstEmail) startSearch({ before: firstEmail })
  }

  const tabs = [
    { key: 'all' as const, label: 'All', count: list?.count },
    { key: 'active' as const, label: 'Active', count: list?.active },
    { key: 'unsubscribed' as const, label: 'Unsubscribed', count: list?.unsubscribed },
    { key: 'bounced' as const, label: 'Bounced', count: list?.bounced },
    { key: 'complained' as const, label: 'Complained', count: list?.complained },
  ]

  // Handle single contact unsubscribe
  const handleUnsubscribe = async (email: string) => {
    try {
      await api.patch(`/api/contactdata/${encodeURIComponent(email)}`, {
        Unsubscribed: 'true',
      })
      toast.success('Contact unsubscribed')
      reloadList()
      startSearch()
    } catch {
      toast.error('Failed to unsubscribe contact')
    }
  }

  // Handle single contact delete
  const handleDeleteContact = (email: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Contact',
      message: `Are you sure you want to delete ${email}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/contactdata/${encodeURIComponent(email)}`)
        toast.success('Contact deleted')
        reloadList()
        startSearch()
      },
    })
  }

  // Reload list data
  const reloadList = useCallback(async () => {
    try {
      const { data } = await api.get<ContactList>(`/api/lists/${listId}`)
      setList(normalizeList(data))
    } catch {
      // Silently fail on reload
    }
  }, [listId])

  // Helper to get contact name - combines firstname + lastname, or falls back to name field
  const getContactName = (contact: ContactRecord): string => {
    // Try various possible field name formats for first name
    const firstName = String(
      contact.firstname || contact.FirstName || contact.Firstname ||
      contact.first_name || contact.First_Name || contact.Fname || contact.fname || ''
    ).trim()

    // Try various possible field name formats for last name / surname
    const lastName = String(
      contact.lastname || contact.LastName || contact.Lastname ||
      contact.last_name || contact.Last_Name || contact.Lname || contact.lname ||
      contact.surname || contact.Surname || contact.SURNAME || ''
    ).trim()

    // Try full name field
    const fullName = String(
      contact.name || contact.Name || contact.fullname || contact.FullName ||
      contact.full_name || contact.displayname || contact.DisplayName || ''
    ).trim()

    // Combine first + last if available
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) {
      return firstName
    }
    if (lastName) {
      return lastName
    }
    if (fullName) {
      return fullName
    }
    return ''
  }

  // Helper to get contact status
  const getContactStatus = (contact: ContactRecord): string => {
    if (contact.Complained === 'true' || contact.complained === 'true') return 'complained'
    if (contact.Bounced === 'true' || contact.bounced === 'true') return 'bounced'
    if (contact.Unsubscribed === 'true' || contact.unsubscribed === 'true') return 'unsubscribed'
    return 'active'
  }

  // Helper to get contact last activity timestamp
  // The API returns !!lastactivity as a Unix timestamp (seconds since epoch)
  const getLastActivity = (contact: ContactRecord): number | null => {
    // Try the !!lastactivity field first
    const lastactivityRaw = contact['!!lastactivity']
    if (Array.isArray(lastactivityRaw) && lastactivityRaw.length > 0) {
      const ts = Number(lastactivityRaw[0])
      if (ts > 0) return ts
    }
    // Also handle if it's a plain number
    if (typeof lastactivityRaw === 'number' && lastactivityRaw > 0) {
      return lastactivityRaw
    }

    // Fallback to other possible field names
    const activity = (
      contact.lastactivity || contact.LastActivity || contact.last_activity ||
      contact['!!added'] ||
      contact.added || contact.Added || ''
    )

    if (typeof activity === 'number' && activity > 0) {
      return activity
    }
    if (typeof activity === 'string' && activity) {
      // Try parsing as date string
      const date = new Date(activity)
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000)
      }
    }
    return null
  }

  // Format relative date from Unix timestamp - "46 mins ago", "3 hrs ago", "2 days ago", etc.
  const formatRelativeDate = (timestamp: number | null): string => {
    if (!timestamp || timestamp <= 0) return '-'
    try {
      // Convert Unix timestamp (seconds) to milliseconds
      const date = new Date(timestamp * 1000)
      if (isNaN(date.getTime())) return '-'

      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      const diffWeeks = Math.floor(diffDays / 7)
      const diffMonths = Math.floor(diffDays / 30)

      if (diffSecs < 60) return 'Just now'
      if (diffMins === 1) return '1 min ago'
      if (diffMins < 60) return `${diffMins} mins ago`
      if (diffHours === 1) return '1 hr ago'
      if (diffHours < 24) return `${diffHours} hrs ago`
      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffWeeks === 1) return '1 week ago'
      if (diffWeeks < 4) return `${diffWeeks} weeks ago`
      if (diffMonths === 1) return '1 month ago'
      if (diffMonths < 12) return `${diffMonths} months ago`

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      // Default to desc for lastactivity (most recent first), asc for others
      setSortDirection(field === 'lastactivity' ? 'desc' : 'asc')
    }
  }

  // Sort results client-side
  const sortedResults = [...search.results].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    switch (sortField) {
      case 'name':
        aVal = getContactName(a).toLowerCase()
        bVal = getContactName(b).toLowerCase()
        break
      case 'email':
        aVal = ((a.Email || a.email || '') as string).toLowerCase()
        bVal = ((b.Email || b.email || '') as string).toLowerCase()
        break
      case 'lastactivity':
        aVal = getLastActivity(a) || 0
        bVal = getLastActivity(b) || 0
        break
      case 'status':
        aVal = getContactStatus(a)
        bVal = getContactStatus(b)
        break
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Sort header component
  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-4 py-2 text-left">
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-muted uppercase hover:text-text-primary"
      >
        {label}
        <span className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 ${sortField === field && sortDirection === 'asc' ? 'text-primary' : 'text-text-muted/40'}`}
          />
          <ChevronDown
            className={`h-3 w-3 ${sortField === field && sortDirection === 'desc' ? 'text-primary' : 'text-text-muted/40'}`}
          />
        </span>
      </button>
    </th>
  )

  const hasSelection = selected.size > 0 || selectAll
  const selectionCount = selectAll ? search.total : selected.size

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
          <h1 className="text-xl font-semibold text-text-primary">Find Contacts</h1>
          {list && (
            <p className="text-sm text-text-muted">
              {list.name} - {list.count.toLocaleString()} contacts
            </p>
          )}
        </div>
      </div>

      {/* List Navigation */}
      {list && (
        <ListNav
          listId={listId}
          listName={list.name}
          customFieldsCount={(list.used_properties || []).filter(f => !f.startsWith('!')).length}
          segmentsCount={segmentsCount}
          funnelsCount={funnelsCount}
        />
      )}

      {/* Action Bar */}
      {list && (
        <div className="mb-4 flex items-center justify-between">
          <ListActionBar
            listId={listId}
            listName={list.name}
            onRefresh={() => {
              reloadList()
              startSearch()
            }}
            canExport={!user?.nodataexport}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCharts(!showCharts)}
          >
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </Button>
        </div>
      )}

      {/* Charts Section */}
      {list && showCharts && (
        <div className="mb-4">
          <SubscriberCharts list={list} />
        </div>
      )}

      {/* Main content */}
      <LoadingOverlay loading={isLoading}>
        <div className="card">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <Tabs
              tabs={tabs}
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as StatusTab)}
            />
            <div className="w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search contacts..."
              />
            </div>
          </div>

          {/* Bulk actions bar */}
          {hasSelection && (
            <div className="flex items-center gap-4 border-b border-border bg-primary/5 px-4 py-2">
              <span className="text-sm text-text-primary">
                {selectionCount.toLocaleString()} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Tag className="h-4 w-4" />}
                  onClick={() => {
                    setTagAction('add')
                    setShowTagModal(true)
                  }}
                >
                  Add Tags
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Tag className="h-4 w-4" />}
                  onClick={() => {
                    setTagAction('remove')
                    setShowTagModal(true)
                  }}
                >
                  Remove Tags
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
              </div>
              <button
                onClick={() => {
                  setSelected(new Set())
                  setSelectAll(false)
                }}
                className="ml-auto text-sm text-text-muted hover:text-text-primary"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Results */}
          {search.status === 'searching' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : search.results.length === 0 ? (
            <EmptyState
              icon={<Search className="h-10 w-10" />}
              title="No contacts found"
              description={searchQuery ? 'Try adjusting your search query.' : 'No contacts in this list yet.'}
            />
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="w-10 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectAll || (selected.size > 0 && selected.size === search.results.length)}
                          onChange={toggleSelectAll}
                          className="rounded text-primary"
                        />
                      </th>
                      <SortHeader field="name" label="Name" />
                      <SortHeader field="email" label="Email" />
                      <SortHeader field="lastactivity" label="Last Activity" />
                      <SortHeader field="status" label="Status" />
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                        Unsubscribe
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedResults.map((contact) => {
                      const emailAddr = (contact.Email || contact.email || '') as string
                      const contactName = getContactName(contact)
                      const contactStatus = getContactStatus(contact)
                      const lastActivity = getLastActivity(contact)
                      const isActive = contactStatus === 'active'

                      return (
                        <tr key={emailAddr} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(emailAddr) || selectAll}
                              onChange={() => toggleSelect(emailAddr)}
                              className="rounded text-primary"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() =>
                                navigate(`/contacts/contact?email=${encodeURIComponent(emailAddr)}`)
                              }
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {contactName || '-'}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-sm text-text-secondary">
                            {emailAddr}
                          </td>
                          <td className="px-4 py-2 text-sm text-text-muted whitespace-nowrap">
                            {formatRelativeDate(lastActivity)}
                          </td>
                          <td className="px-4 py-2">
                            <StatusBadge status={contactStatus} />
                          </td>
                          <td className="px-4 py-2">
                            {isActive ? (
                              <button
                                onClick={() => handleUnsubscribe(emailAddr)}
                                className="text-text-muted hover:text-warning"
                                title="Unsubscribe"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-text-muted/30">
                                <UserMinus className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteContact(emailAddr)}
                              className="text-text-muted hover:text-danger"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-sm text-text-muted">
                  Showing {search.results.length} of {search.total.toLocaleString()} contacts
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ChevronLeft className="h-4 w-4" />}
                    onClick={goPrev}
                    disabled={!search.beforeEmail && !search.afterEmail}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ChevronRight className="h-4 w-4" />}
                    onClick={goNext}
                    disabled={search.results.length < 50}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </LoadingOverlay>

      {/* Tag modal */}
      <Modal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        title={tagAction === 'add' ? 'Add Tags' : 'Remove Tags'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {tagAction === 'add' ? 'Add' : 'Remove'} tags {tagAction === 'add' ? 'to' : 'from'}{' '}
            {selectionCount.toLocaleString()} contact{selectionCount !== 1 ? 's' : ''}.
          </p>
          <TagInput
            value={selectedTags}
            onChange={setSelectedTags}
            suggestions={recentTags}
            placeholder="Select or type tags..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTagModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkTag} loading={isTagging} disabled={selectedTags.length === 0}>
              {tagAction === 'add' ? 'Add Tags' : 'Remove Tags'}
            </Button>
          </div>
        </div>
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
