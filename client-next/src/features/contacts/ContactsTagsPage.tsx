import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowLeft, Tag, Trash2 } from 'lucide-react'
import api from '../../config/api'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import type { Tag as TagType } from '../../types/contact'

type SortField = 'tag' | 'count' | 'added'
type SortDir = 'asc' | 'desc'

export function ContactsTagsPage() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<TagType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Load tags
  const loadTags = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<TagType[]>('/api/alltags')
      setTags(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  // Filter and sort
  const filteredTags = tags
    .filter((t) => t.tag.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'tag') {
        cmp = a.tag.localeCompare(b.tag)
      } else if (sortField === 'count') {
        cmp = a.count - b.count
      } else if (sortField === 'added') {
        cmp = new Date(a.added).getTime() - new Date(b.added).getTime()
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Delete tag
  const handleDelete = (tag: TagType) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Tag',
      message: `Are you sure you want to delete the tag "${tag.tag}"? This will remove the tag from ${(tag.count ?? 0).toLocaleString()} contacts.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/alltags/${encodeURIComponent(tag.tag)}`)
        toast.success('Tag deleted')
        loadTags()
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

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

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
          <h1 className="text-xl font-semibold text-text-primary">All Tags</h1>
          <p className="text-sm text-text-muted">
            {tags.length.toLocaleString()} tags
          </p>
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
                placeholder="Search tags..."
              />
            </div>
          </div>

          {/* Table */}
          {filteredTags.length === 0 ? (
            <EmptyState
              icon={<Tag className="h-10 w-10" />}
              title="No tags found"
              description={search ? 'Try adjusting your search.' : 'No tags have been created yet.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th
                      className="cursor-pointer px-4 py-2 text-left text-xs font-medium text-text-muted uppercase hover:text-text-primary"
                      onClick={() => handleSort('tag')}
                    >
                      Tag
                      <SortIndicator field="tag" />
                    </th>
                    <th
                      className="cursor-pointer px-4 py-2 text-right text-xs font-medium text-text-muted uppercase hover:text-text-primary"
                      onClick={() => handleSort('count')}
                    >
                      Contacts
                      <SortIndicator field="count" />
                    </th>
                    <th
                      className="cursor-pointer px-4 py-2 text-right text-xs font-medium text-text-muted uppercase hover:text-text-primary"
                      onClick={() => handleSort('added')}
                    >
                      Added
                      <SortIndicator field="added" />
                    </th>
                    <th className="w-20 px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTags.map((tag) => (
                    <tr key={tag.tag} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                          {tag.tag}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-text-secondary">
                        {(tag.count ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-text-muted">
                        {format(new Date(tag.added), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDelete(tag)}
                          className="rounded-md p-1.5 text-text-muted hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
