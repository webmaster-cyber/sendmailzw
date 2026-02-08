import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowLeft, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { TagInput } from '../../components/ui/TagInput'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ContactInfoCard } from './components/ContactInfoCard'
import type { ContactActivityResponse, ContactActivityRecord } from '../../types/contact'

// API response structure
interface ContactApiResponse {
  email: string
  properties: Record<string, string>
  tags: string[]
  lists: number[]
  added_at?: string
  // Other metadata fields...
}

interface ListDetails {
  id: string
  name: string
  used_properties?: string[]
}

// Standard fields that should always be shown (lowercase keys for matching)
const STANDARD_FIELDS = [
  { key: 'firstname', label: 'First Name' },
  { key: 'lastname', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'zip', label: 'Zip Code' },
]

const STANDARD_FIELD_KEYS = STANDARD_FIELDS.map((f) => f.key)

// Fields to exclude from custom fields (standard fields + email which is shown separately)
const EXCLUDED_FIELDS = [...STANDARD_FIELD_KEYS, 'email']

// Check if a key matches a standard/excluded field (case-insensitive)
const isStandardField = (key: string): boolean => {
  return EXCLUDED_FIELDS.includes(key.toLowerCase())
}

// Get value from props with case-insensitive key matching
const getPropertyValue = (props: Record<string, string>, key: string): string => {
  // Try exact match first
  if (props[key] !== undefined) return props[key]
  // Try lowercase
  if (props[key.toLowerCase()] !== undefined) return props[key.toLowerCase()]
  // Try finding case-insensitive match
  const foundKey = Object.keys(props).find(k => k.toLowerCase() === key.toLowerCase())
  if (foundKey) return props[foundKey]
  return ''
}

export function ContactEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''

  const [contact, setContact] = useState<ContactApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [recentTags, setRecentTags] = useState<string[]>([])

  // Editable state
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [customFields, setCustomFields] = useState<string[]>([])

  // Notes field
  const [notes, setNotes] = useState('')

  // Campaign activity state
  const [activityRecords, setActivityRecords] = useState<ContactActivityRecord[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityPage, setActivityPage] = useState(1)
  const [activityLoading, setActivityLoading] = useState(false)
  const activityPageSize = 10

  useEffect(() => {
    async function load() {
      try {
        const [contactRes, tagsRes] = await Promise.all([
          api.get<ContactApiResponse>(`/api/contactdata/${encodeURIComponent(email)}`),
          api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
        ])
        setContact(contactRes.data)
        setRecentTags(tagsRes.data)

        const props = contactRes.data.properties || {}

        // Initialize standard fields (always show, even if empty)
        // Use case-insensitive matching to find values
        const fields: Record<string, string> = {}
        for (const field of STANDARD_FIELDS) {
          fields[field.key] = getPropertyValue(props, field.key)
        }

        // Fetch list details to get custom fields defined on the list
        const listIds = contactRes.data.lists || []
        const listCustomFields = new Set<string>()

        if (listIds.length > 0) {
          // Fetch all lists the contact belongs to
          const listPromises = listIds.map((id) =>
            api.get<ListDetails>(`/api/lists/${id}`).catch(() => null)
          )
          const listResults = await Promise.all(listPromises)

          // Collect all custom fields from all lists
          for (const result of listResults) {
            if (result?.data?.used_properties) {
              for (const prop of result.data.used_properties) {
                // Skip internal fields and standard fields
                if (!prop.startsWith('!') && !isStandardField(prop) && prop.toLowerCase() !== 'notes') {
                  listCustomFields.add(prop)
                }
              }
            }
          }
        }

        // Also include any custom fields the contact already has data for
        for (const key of Object.keys(props)) {
          if (!isStandardField(key) && key.toLowerCase() !== 'notes') {
            listCustomFields.add(key)
          }
        }

        // Initialize custom fields with their values
        const custom: string[] = []
        for (const key of listCustomFields) {
          fields[key] = props[key] || ''
          custom.push(key)
        }
        // Sort custom fields alphabetically
        custom.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        setCustomFields(custom)

        setEditedFields(fields)
        setEditedTags(contactRes.data.tags || [])
        setNotes(getPropertyValue(props, 'notes'))
      } catch (err) {
        console.error('Failed to load contact:', err)
        toast.error('Failed to load contact')
      } finally {
        setIsLoading(false)
      }
    }
    if (email) load()
  }, [email])

  // Load campaign activity
  useEffect(() => {
    async function loadActivity() {
      if (!email) return
      setActivityLoading(true)
      try {
        const { data } = await api.get<ContactActivityResponse>(
          `/api/contactactivity/${encodeURIComponent(email)}?page=${activityPage}`
        )
        setActivityRecords(data.records)
        setActivityTotal(data.total)
      } catch (err) {
        console.error('Failed to load activity:', err)
      } finally {
        setActivityLoading(false)
      }
    }
    loadActivity()
  }, [email, activityPage])

  const handleFieldChange = (field: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Build properties object with notes included
      const properties: Record<string, string> = { ...editedFields }
      if (notes) {
        properties.notes = notes
      }

      await api.patch(`/api/contactdata/${encodeURIComponent(email)}`, {
        properties,
        tags: editedTags,
      })
      toast.success('Contact saved')
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setIsSaving(false)
    }
  }

  // Get contact display name from properties
  const getContactName = (): string => {
    const firstName = editedFields.firstname || ''
    const lastName = editedFields.lastname || ''
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return ''
  }

  // Event badge colors for campaign activity
  const getEventBadgeColor = (event: string) => {
    switch (event.toLowerCase()) {
      case 'send':
        return 'bg-blue-100 text-blue-600'
      case 'open':
        return 'bg-green-100 text-green-600'
      case 'click':
        return 'bg-purple-100 text-purple-600'
      case 'bounce':
      case 'hard':
        return 'bg-danger/10 text-danger'
      case 'soft':
        return 'bg-warning/10 text-warning'
      case 'unsub':
        return 'bg-yellow-100 text-yellow-600'
      case 'complaint':
        return 'bg-orange-100 text-orange-600'
      default:
        return 'bg-gray-100 text-text-muted'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Edit Contact</h1>
            <p className="text-sm text-text-muted">{email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {contact && (
          <div className="space-y-6">
            {/* Contact Info Card */}
            <ContactInfoCard
              email={email}
              name={getContactName()}
              lists={contact.lists?.map((id) => ({ id: String(id), name: `List ${id}`, status: 'active' }))}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main form */}
              <div className="card p-6 lg:col-span-2">
                <h2 className="mb-4 text-lg font-medium text-text-primary">Properties</h2>

                <div className="space-y-4">
                  {/* Email (read-only) */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Email
                    </label>
                    <input
                      type="text"
                      value={email}
                      disabled
                      className="input w-full bg-gray-50"
                    />
                  </div>

                  {/* Standard fields - always shown */}
                  {STANDARD_FIELDS.map((field) => (
                    <div key={field.key}>
                      <Input
                        label={field.label}
                        value={editedFields[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      />
                    </div>
                  ))}

                  {/* Custom fields (from list imports) */}
                  {customFields.length > 0 && (
                    <>
                      <div className="border-t border-border pt-4">
                        <h3 className="mb-3 text-sm font-medium text-text-secondary">Custom Fields</h3>
                      </div>
                      {customFields.map((field) => (
                        <div key={field}>
                          <Input
                            label={field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}
                            value={editedFields[field] || ''}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Tags */}
                <div className="card p-6">
                  <h2 className="mb-4 text-lg font-medium text-text-primary">Tags</h2>
                  <TagInput
                    value={editedTags}
                    onChange={setEditedTags}
                    suggestions={recentTags}
                    placeholder="Add tags..."
                  />
                </div>

                {/* Notes */}
                <div className="card p-6">
                  <h2 className="mb-4 text-lg font-medium text-text-primary">Notes</h2>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this contact..."
                    rows={6}
                    className="w-full rounded-md border-2 border-amber-200 bg-amber-50 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-amber-300 focus:outline-none focus:ring-0"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #fef3c7 27px, #fef3c7 28px)',
                      lineHeight: '28px',
                    }}
                  />
                </div>
              </div>

            </div>

            {/* Campaign Activity Section */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Campaign Activity</h2>
              <LoadingOverlay loading={activityLoading}>
                {activityRecords.length === 0 ? (
                  <EmptyState
                    icon={<Mail className="h-8 w-8" />}
                    title="No campaign activity"
                    description="This contact has not received any campaigns yet."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-border bg-gray-50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                              Campaign
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                              Event
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activityRecords.map((record, idx) => (
                            <tr key={`${record.campaign_id}-${record.event_type}-${idx}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-text-primary">
                                  {record.campaign_name || record.campaign_id}
                                </div>
                                {record.subject && (
                                  <div className="text-xs text-text-muted truncate max-w-xs">
                                    {record.subject}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getEventBadgeColor(record.event_type)}`}>
                                  {record.event_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                                {record.timestamp
                                  ? format(new Date(record.timestamp), 'MMM d, yyyy h:mm a')
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {activityTotal > activityPageSize && (
                      <div className="flex items-center justify-between border-t border-border px-4 py-3 mt-4">
                        <p className="text-sm text-text-muted">
                          Showing {(activityPage - 1) * activityPageSize + 1} -{' '}
                          {Math.min(activityPage * activityPageSize, activityTotal)} of{' '}
                          {(activityTotal ?? 0).toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                            disabled={activityPage === 1}
                            icon={<ChevronLeft className="h-4 w-4" />}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActivityPage((p) => p + 1)}
                            disabled={activityPage * activityPageSize >= activityTotal}
                            icon={<ChevronRight className="h-4 w-4" />}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </LoadingOverlay>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
