import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { X, Calculator } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { WizardNav } from './WizardNav'
import type { BroadcastFormData, ContactList, Segment } from '../../types/broadcast'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function BroadcastRecipientsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [data, setData] = useState<Partial<BroadcastFormData> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lists, setLists] = useState<ContactList[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [supplists, setSupplists] = useState<ContactList[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [bcRes, listsRes, segsRes, suppRes, tagsRes] = await Promise.all([
          api.get(`/api/broadcasts/${id}`),
          api.get('/api/lists'),
          api.get('/api/segments'),
          api.get('/api/supplists'),
          api.get('/api/recenttags').catch(() => ({ data: [] })),
        ])
        setData(bcRes.data)
        setLists(listsRes.data.sort((a: ContactList, b: ContactList) => a.name.localeCompare(b.name)))
        setSegments(segsRes.data.sort((a: Segment, b: Segment) => a.name.localeCompare(b.name)))
        setSupplists(suppRes.data.sort((a: ContactList, b: ContactList) => a.name.localeCompare(b.name)))
        setTags(tagsRes.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  function addItem(field: 'lists' | 'segments' | 'supplists' | 'suppsegs' | 'tags' | 'supptags', value: string) {
    if (!data) return
    const current = (data[field] as string[]) || []
    if (!current.includes(value)) {
      setData({ ...data, [field]: [...current, value], last_calc: null })
    }
  }

  function removeItem(field: 'lists' | 'segments' | 'supplists' | 'suppsegs' | 'tags' | 'supptags', index: number) {
    if (!data) return
    const current = [...((data[field] as string[]) || [])]
    current.splice(index, 1)
    setData({ ...data, [field]: current, last_calc: null })
  }

  const calcSupp = useCallback(async () => {
    if (!data) return
    setCalculating(true)
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      const { data: calcResult } = await api.post(`/api/broadcasts/${id}/calculate`)
      const calcId = calcResult.id

      // Poll for results
      while (true) {
        await delay(3000)
        const { data: results } = await api.get(`/api/broadcastcalculate/${calcId}`)
        if (results.error) {
          toast.error(results.error)
          break
        }
        if (results.complete) {
          setData((prev) => prev ? ({
            ...prev,
            last_calc: {
              count: results.count,
              unavailable: results.unavailable,
              suppressed: results.suppressed,
              remaining: results.remaining,
            },
          }) : prev)
          break
        }
      }
    } catch {
      toast.error('Calculation failed')
    } finally {
      setCalculating(false)
    }
  }, [data, id])

  async function handleSave() {
    if (!data) return
    setIsSaving(true)
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      toast.success('Recipients saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleNext() {
    if (!data) return
    setIsSaving(true)
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      navigate(`/broadcasts/review?id=${id}`)
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const hasRecipients = (data.lists?.length || 0) > 0 || (data.segments?.length || 0) > 0 || (data.tags?.length || 0) > 0

  return (
    <div>
      <WizardNav
        title="Choose Recipients"
        step={3}
        totalSteps={5}
        id={id}
        backTo={`/broadcasts/template?id=${id}`}
        nextLabel="Review"
        onNext={handleNext}
        onSave={handleSave}
        nextDisabled={!hasRecipients}
        saving={isSaving}
      />

      <div className="space-y-6">
        {/* Contact Lists */}
        <SelectorSection
          title="Contact Lists"
          items={lists}
          selected={data.lists || []}
          onAdd={(val) => addItem('lists', val)}
          onRemove={(i) => removeItem('lists', i)}
          placeholder="Add a list..."
        />

        {/* Segments */}
        <SelectorSection
          title="Segments"
          items={segments}
          selected={data.segments || []}
          onAdd={(val) => addItem('segments', val)}
          onRemove={(i) => removeItem('segments', i)}
          placeholder="Add a segment..."
        />

        {/* Tags */}
        <TagSection
          title="Tags"
          available={tags}
          selected={data.tags || []}
          onAdd={(val) => addItem('tags', val)}
          onRemove={(i) => removeItem('tags', i)}
        />

        {/* Suppression */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">Exclusions</h3>
          <div className="space-y-4">
            <SelectorSection
              title="Suppression Lists"
              items={supplists}
              selected={data.supplists || []}
              onAdd={(val) => addItem('supplists', val)}
              onRemove={(i) => removeItem('supplists', i)}
              placeholder="Add suppression list..."
              compact
            />
            <SelectorSection
              title="Exclude Segments"
              items={segments}
              selected={data.suppsegs || []}
              onAdd={(val) => addItem('suppsegs', val)}
              onRemove={(i) => removeItem('suppsegs', i)}
              placeholder="Exclude segment..."
              compact
            />
            <TagSection
              title="Exclude Tags"
              available={tags}
              selected={data.supptags || []}
              onAdd={(val) => addItem('supptags', val)}
              onRemove={(i) => removeItem('supptags', i)}
              compact
            />
          </div>
        </div>

        {/* Calculate */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Recipient Count</h3>
              <p className="text-xs text-text-muted">Calculate the final recipient count after suppression.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Calculator className="h-4 w-4" />}
              onClick={calcSupp}
              loading={calculating}
              disabled={!hasRecipients}
            >
              Calculate
            </Button>
          </div>

          {data.last_calc && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              <StatBox label="Total Contacts" value={data.last_calc.count} />
              <StatBox label="Unavailable" value={data.last_calc.unavailable} />
              <StatBox label="Suppressed" value={data.last_calc.suppressed} />
              <StatBox label="Remaining" value={data.last_calc.remaining} highlight />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface SelectorSectionProps {
  title: string
  items: { id: string; name: string }[]
  selected: string[]
  onAdd: (id: string) => void
  onRemove: (index: number) => void
  placeholder?: string
  compact?: boolean
}

function SelectorSection({ title, items, selected, onAdd, onRemove, placeholder, compact }: SelectorSectionProps) {
  const available = items.filter((item) => !selected.includes(item.id))

  return (
    <div className={compact ? '' : 'card p-5'}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold text-text-primary ${compact ? 'text-xs' : ''}`}>{title}</h3>
        {available.length > 0 && (
          <select
            className="input !w-48 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) onAdd(e.target.value)
            }}
          >
            <option value="">{placeholder || 'Add...'}</option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        )}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((id, i) => {
            const item = items.find((it) => it.id === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {item?.name || id}
                <button onClick={() => onRemove(i)} className="ml-0.5 text-primary/60 hover:text-primary">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface TagSectionProps {
  title: string
  available: string[]
  selected: string[]
  onAdd: (tag: string) => void
  onRemove: (index: number) => void
  compact?: boolean
}

function TagSection({ title, available, selected, onAdd, onRemove, compact }: TagSectionProps) {
  const [input, setInput] = useState('')
  const filtered = available.filter((t) => !selected.includes(t))

  return (
    <div className={compact ? '' : 'card p-5'}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold text-text-primary ${compact ? 'text-xs' : ''}`}>{title}</h3>
        <div className="flex items-center gap-2">
          <input
            className="input !w-36 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) {
                onAdd(input.trim())
                setInput('')
              }
            }}
            placeholder="Type tag..."
            list={`${title}-tags`}
          />
          <datalist id={`${title}-tags`}>
            {filtered.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((tag, i) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
              <button onClick={() => onRemove(i)} className="ml-0.5 text-primary/60 hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 text-center ${highlight ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <p className={`text-lg font-semibold ${highlight ? 'text-primary' : 'text-text-primary'}`}>
        {(value ?? 0).toLocaleString()}
      </p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}
