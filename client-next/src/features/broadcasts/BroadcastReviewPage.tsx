import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { format, addHours } from 'date-fns'
import { Send, Clock, FileText } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { WizardNav } from './WizardNav'
import type { BroadcastFormData, ContactList, Segment } from '../../types/broadcast'

export function BroadcastReviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [data, setData] = useState<Partial<BroadcastFormData> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lists, setLists] = useState<ContactList[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [supplists, setSupplists] = useState<ContactList[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [bcRes, listsRes, segsRes, suppRes] = await Promise.all([
          api.get(`/api/broadcasts/${id}`),
          api.get('/api/lists'),
          api.get('/api/segments'),
          api.get('/api/supplists'),
        ])
        setData(bcRes.data)
        setLists(listsRes.data)
        setSegments(segsRes.data)
        setSupplists(suppRes.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  function handleChange(field: string, value: unknown) {
    setData((prev) => prev ? ({ ...prev, [field]: value }) : prev)
  }

  async function handleSubmit() {
    if (!data) return

    if (data.when === 'now') {
      setConfirmMsg('Are you sure you want to send this broadcast now?')
      setConfirmOpen(true)
    } else if (data.when === 'schedule') {
      const dt = data.scheduled_for || getDefaultSchedule()
      setConfirmMsg(`Schedule this broadcast for ${format(new Date(dt), 'MMM d, yyyy h:mm a')}?`)
      setConfirmOpen(true)
    } else {
      // Save as draft
      setIsSaving(true)
      try {
        await api.patch(`/api/broadcasts/${id}`, { ...data, scheduled_for: null })
        toast.success('Saved as draft')
        navigate('/broadcasts')
      } finally {
        setIsSaving(false)
      }
    }
  }

  async function handleConfirm() {
    if (!data) return
    setConfirmOpen(false)
    setIsSaving(true)
    try {
      const patch: Record<string, unknown> = { ...data }
      if (data.when === 'schedule' && !data.scheduled_for) {
        patch.scheduled_for = getDefaultSchedule()
      }
      await api.patch(`/api/broadcasts/${id}`, patch)

      if (data.when === 'now') {
        await api.post(`/api/broadcasts/${id}/start`)
        toast.success('Broadcast is sending')
      } else {
        toast.success('Broadcast scheduled')
      }
      navigate('/broadcasts')
    } catch {
      toast.error('Failed to send')
    } finally {
      setIsSaving(false)
    }
  }

  function getDefaultSchedule() {
    return addHours(new Date(), 1).toISOString()
  }

  function getItemNames(ids: string[], items: { id: string; name: string }[]) {
    return ids.map((id) => items.find((i) => i.id === id)?.name || id)
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const submitLabel = data.when === 'now' ? 'Send Now' : data.when === 'schedule' ? 'Schedule' : 'Save Draft'

  return (
    <div>
      <WizardNav
        title="Review & Send"
        step={4}
        totalSteps={5}
        id={id}
        backTo={`/broadcasts/rcpt?id=${id}`}
        nextLabel={submitLabel}
        onNext={handleSubmit}
        saving={isSaving}
      />

      <div className="space-y-4">
        {/* Summary */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Broadcast Summary</h3>
          <dl className="space-y-2 text-sm">
            <SummaryRow label="Name" value={data.name} />
            <SummaryRow label="From" value={`${data.fromname} <${data.returnpath}>`} />
            {data.replyto && <SummaryRow label="Reply-To" value={data.replyto} />}
            <SummaryRow label="Subject" value={data.subject} />
            {data.preheader && <SummaryRow label="Preheader" value={data.preheader} />}
          </dl>
        </div>

        {/* Recipients */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Recipients</h3>
          <div className="space-y-2 text-sm">
            {(data.lists?.length || 0) > 0 && (
              <SummaryRow label="Lists" value={getItemNames(data.lists!, lists).join(', ')} />
            )}
            {(data.segments?.length || 0) > 0 && (
              <SummaryRow label="Segments" value={getItemNames(data.segments!, segments).join(', ')} />
            )}
            {(data.tags?.length || 0) > 0 && (
              <SummaryRow label="Tags" value={data.tags!.join(', ')} />
            )}
            {(data.supplists?.length || 0) > 0 && (
              <SummaryRow label="Suppression" value={getItemNames(data.supplists!, supplists).join(', ')} />
            )}
            {data.last_calc && (
              <SummaryRow label="Est. Recipients" value={(data.last_calc.remaining ?? 0).toLocaleString()} />
            )}
          </div>
          <button
            onClick={() => navigate(`/broadcasts/rcpt?id=${id}`)}
            className="mt-2 text-xs text-primary hover:text-primary-hover"
          >
            Edit Recipients
          </button>
        </div>

        {/* Send Timing */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Send Timing</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="when"
                value="now"
                checked={data.when === 'now'}
                onChange={() => handleChange('when', 'now')}
                className="h-4 w-4 text-primary"
              />
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-text-muted" />
                <span className="text-sm">Send Now</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="when"
                value="schedule"
                checked={data.when === 'schedule'}
                onChange={() => handleChange('when', 'schedule')}
                className="h-4 w-4 text-primary"
              />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-sm">Schedule For:</span>
              </div>
              <input
                type="datetime-local"
                value={data.scheduled_for ? format(new Date(data.scheduled_for), "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => handleChange('scheduled_for', e.target.value ? new Date(e.target.value).toISOString() : null)}
                disabled={data.when !== 'schedule'}
                className="input !w-56 text-sm"
              />
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="when"
                value="draft"
                checked={data.when === 'draft'}
                onChange={() => handleChange('when', 'draft')}
                className="h-4 w-4 text-primary"
              />
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-muted" />
                <span className="text-sm">Save as Draft</span>
              </div>
            </label>
          </div>
        </div>

        {/* More Options */}
        <div className="card p-5">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            {showOptions ? 'Hide' : 'Show'} More Options
          </button>

          {showOptions && (
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.disableopens || false}
                  onChange={(e) => handleChange('disableopens', e.target.checked)}
                  className="h-4 w-4 rounded text-primary"
                />
                Disable open tracking
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.randomize || false}
                  onChange={(e) => handleChange('randomize', e.target.checked)}
                  disabled={data.newestfirst}
                  className="h-4 w-4 rounded text-primary"
                />
                Send in random order
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.newestfirst || false}
                  onChange={(e) => handleChange('newestfirst', e.target.checked)}
                  disabled={data.randomize}
                  className="h-4 w-4 rounded text-primary"
                />
                Send newest data first
              </label>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={data.when === 'now' ? 'Send Broadcast' : 'Schedule Broadcast'}
        message={confirmMsg}
        confirmLabel={data.when === 'now' ? 'Send Now' : 'Schedule'}
        confirmVariant="primary"
        loading={isSaving}
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-text-muted">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  )
}
