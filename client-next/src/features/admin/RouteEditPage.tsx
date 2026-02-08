import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Modal } from '../../components/ui/Modal'
import type { PostalRoute, RouteRule, RouteSplit, DomainGroup, RoutePolicy } from '../../types/admin'

interface RouteFormData {
  name: string
  usedefault: boolean
  rules: RouteRule[]
}

const DEFAULT_FORM: RouteFormData = {
  name: '',
  usedefault: false,
  rules: [
    {
      id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
      default: true,
      domaingroup: '',
      splits: [{ policy: '', pct: 100 }],
    },
  ],
}

export function RouteEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<RouteFormData>(DEFAULT_FORM)
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>([])
  const [policies, setPolicies] = useState<RoutePolicy[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [hasPublished, setHasPublished] = useState(false)

  // Domain group modal
  const [showDomainGroupModal, setShowDomainGroupModal] = useState(false)
  const [newDomainGroupName, setNewDomainGroupName] = useState('')
  const [newDomainGroupDomains, setNewDomainGroupDomains] = useState('')
  const [isSavingDomainGroup, setIsSavingDomainGroup] = useState(false)
  const [pendingRuleIndex, setPendingRuleIndex] = useState<number | null>(null)
  const [addRuleAfterCreate, setAddRuleAfterCreate] = useState(false)

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<PostalRoute>(`/api/routes/${id}`)
      setFormData({
        name: data.name || '',
        usedefault: data.usedefault ?? false,
        rules: data.rules || [
          {
            id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
            default: true,
            domaingroup: '',
            splits: [{ policy: '', pct: 100 }],
          },
        ],
      })
      setIsDirty(data.dirty ?? false)
      setHasPublished(!!data.published)
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  const loadDomainGroups = useCallback(async () => {
    try {
      const { data } = await api.get<DomainGroup[]>('/api/domaingroups')
      // Sort by name
      setDomainGroups(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    } catch {
      // Ignore
    }
  }, [])

  const loadPolicies = useCallback(async () => {
    try {
      const { data } = await api.get<RoutePolicy[]>('/api/routepolicies')
      // Sort by name
      setPolicies(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    reload()
    loadDomainGroups()
    loadPolicies()
  }, [reload, loadDomainGroups, loadPolicies])

  const handleChange = <K extends keyof RouteFormData>(field: K, value: RouteFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Add rule at the BEGINNING (before default rule)
  const handleAddRule = () => {
    // If no domain groups exist, prompt to create one first
    if (domainGroups.length === 0) {
      setAddRuleAfterCreate(true)
      setNewDomainGroupName('')
      setNewDomainGroupDomains('')
      setShowDomainGroupModal(true)
      return
    }

    const defaultPolicy = policies.length > 0 ? policies[0].id : ''
    const defaultDomainGroup = domainGroups.length > 0 ? domainGroups[0].id : ''

    setFormData((prev) => ({
      ...prev,
      rules: [
        {
          id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          default: false,
          domaingroup: defaultDomainGroup,
          splits: [{ policy: defaultPolicy, pct: 100 }],
        },
        ...prev.rules,
      ],
    }))
  }

  const handleRemoveRule = (index: number) => {
    const rule = formData.rules[index]
    // Can't remove default rule or if it's the only rule
    if (rule.default || formData.rules.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }))
  }

  const handleRuleChange = (index: number, field: keyof RouteRule, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      ),
    }))
  }

  // Split handlers
  const handleAddSplit = (ruleIndex: number) => {
    const defaultPolicy = policies.length > 0 ? policies[0].id : ''
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === ruleIndex
          ? { ...rule, splits: [...rule.splits, { policy: defaultPolicy, pct: 0 }] }
          : rule
      ),
    }))
  }

  const handleRemoveSplit = (ruleIndex: number, splitIndex: number) => {
    const rule = formData.rules[ruleIndex]
    if (rule.splits.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) =>
        i === ruleIndex
          ? { ...r, splits: r.splits.filter((_, si) => si !== splitIndex) }
          : r
      ),
    }))
  }

  const handleSplitChange = (
    ruleIndex: number,
    splitIndex: number,
    field: keyof RouteSplit,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, ri) =>
        ri === ruleIndex
          ? {
              ...rule,
              splits: rule.splits.map((split, si) =>
                si === splitIndex ? { ...split, [field]: value } : split
              ),
            }
          : rule
      ),
    }))
  }

  // Domain group modal handlers
  const handleDomainGroupSelect = (ruleIndex: number, value: string) => {
    if (value === '__new__') {
      setPendingRuleIndex(ruleIndex)
      setAddRuleAfterCreate(false)
      setNewDomainGroupName('')
      setNewDomainGroupDomains('')
      setShowDomainGroupModal(true)
    } else {
      handleRuleChange(ruleIndex, 'domaingroup', value)
    }
  }

  const handleSaveDomainGroup = async () => {
    if (!newDomainGroupName.trim() || !newDomainGroupDomains.trim()) {
      toast.error('Please enter a name and domains')
      return
    }

    setIsSavingDomainGroup(true)
    try {
      const { data } = await api.post<string>('/api/domaingroups', {
        name: newDomainGroupName,
        domains: newDomainGroupDomains,
      })
      toast.success('Domain group created')
      await loadDomainGroups()

      if (addRuleAfterCreate) {
        // Add a new rule with the newly created domain group
        const defaultPolicy = policies.length > 0 ? policies[0].id : ''
        setFormData((prev) => ({
          ...prev,
          rules: [
            {
              id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
              default: false,
              domaingroup: data,
              splits: [{ policy: defaultPolicy, pct: 100 }],
            },
            ...prev.rules,
          ],
        }))
      } else if (pendingRuleIndex !== null) {
        // Auto-select the new domain group for the pending rule
        handleRuleChange(pendingRuleIndex, 'domaingroup', data)
      }

      setShowDomainGroupModal(false)
    } catch {
      toast.error('Failed to create domain group')
    } finally {
      setIsSavingDomainGroup(false)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) return false
    // Check for duplicate domain groups
    const usedDomainGroups: Record<string, boolean> = {}
    for (const rule of formData.rules) {
      if (usedDomainGroups[rule.domaingroup]) {
        return false
      }
      usedDomainGroups[rule.domaingroup] = true
      // Check splits have percentages
      for (const split of rule.splits) {
        if (split.pct === null || split.pct === undefined || split.pct.toString() === '') {
          return false
        }
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        const { data } = await api.post<string>('/api/routes', formData)
        toast.success('Route created')
        toast.info('Reminder: To use this route, you must publish it, then edit a customer and select it')
        navigate(`/admin/routes/edit?id=${data}`)
      } else {
        await api.patch(`/api/routes/${id}`, formData)
        toast.success('Route updated')
        await reload()
      }
    } catch (err: unknown) {
      console.error('Route save error:', err)
      let message = 'Unknown error'
      if (err && typeof err === 'object') {
        const axiosErr = err as { response?: { data?: { description?: string; message?: string } }; message?: string }
        message = axiosErr.response?.data?.description || axiosErr.response?.data?.message || axiosErr.message || message
      }
      toast.error(`Failed to save route: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      await api.post(`/api/routes/${id}/publish`)
      toast.success('Route published')
      await reload()
    } catch {
      toast.error('Failed to publish route')
    }
  }

  const handleRevert = async () => {
    try {
      await api.post(`/api/routes/${id}/revert`)
      toast.success('Route reverted to published version')
      await reload()
    } catch {
      toast.error('Failed to revert route')
    }
  }

  const handleUnpublish = async () => {
    try {
      await api.post(`/api/routes/${id}/unpublish`)
      toast.success('Route unpublished')
      await reload()
    } catch {
      toast.error('Failed to unpublish route')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/routes')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Create Postal Route' : 'Edit Postal Route'}
          </h1>
          {!isNew && isDirty && (
            <span className="rounded bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
              Unpublished Changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && isDirty && (
            <Button variant="secondary" onClick={handlePublish}>
              Publish
            </Button>
          )}
          {!isNew && hasPublished && (
            <>
              {isDirty && (
                <Button variant="secondary" onClick={handleRevert}>
                  Revert
                </Button>
              )}
              <Button variant="secondary" onClick={handleUnpublish}>
                Unpublish
              </Button>
            </>
          )}
          <Button
            onClick={handleSubmit}
            loading={isSaving}
            disabled={!validateForm()}
            icon={<Save className="h-4 w-4" />}
          >
            Save and Close
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="card p-6">
            <div className="max-w-md space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Default Route"
                required
              />
              <Checkbox
                label="Assign To New Customers By Default"
                checked={formData.usedefault}
                onChange={(checked) => handleChange('usedefault', checked)}
              />
            </div>
          </div>

          {/* Routing Rules */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-end">
              <Button
                variant="secondary"
                onClick={handleAddRule}
                icon={<Plus className="h-4 w-4" />}
              >
                Advanced Routing Rules
              </Button>
            </div>

            <div className="space-y-6">
              {formData.rules.map((rule, ruleIndex) => (
                <div
                  key={rule.id}
                  className="grid gap-6 border-b border-border pb-6 last:border-0 md:grid-cols-12"
                >
                  {/* Domain Group Column */}
                  <div className="md:col-span-4">
                    <label className="mb-2 block text-sm font-medium text-text-primary">
                      Send to these domains:
                    </label>
                    {rule.default ? (
                      <div className="rounded-md border border-border bg-gray-50 px-3 py-2 text-sm text-text-secondary">
                        All Domains in Contact List
                      </div>
                    ) : (
                      <Select
                        value={rule.domaingroup}
                        onChange={(e) => handleDomainGroupSelect(ruleIndex, e.target.value)}
                        options={[
                          ...domainGroups.map((dg) => ({
                            value: dg.id,
                            label: dg.name,
                          })),
                          { value: '__new__', label: '+ Add Contact List Domains' },
                        ]}
                      />
                    )}
                  </div>

                  {/* Splits Column */}
                  <div className="md:col-span-7">
                    <div className="space-y-3">
                      {rule.splits.map((split, splitIndex) => (
                        <div key={splitIndex} className="flex items-end gap-3">
                          <div className="flex-1">
                            <Select
                              label={splitIndex === 0 ? 'Using Delivery Connection:' : undefined}
                              value={split.policy}
                              onChange={(e) =>
                                handleSplitChange(ruleIndex, splitIndex, 'policy', e.target.value)
                              }
                              options={[
                                { value: '', label: 'Drop All Mail' },
                                ...policies.map((p) => ({
                                  value: p.id,
                                  label: p.name,
                                })),
                              ]}
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              label={splitIndex === 0 ? 'Split:' : undefined}
                              type="number"
                              min={0}
                              max={100}
                              value={split.pct}
                              onChange={(e) =>
                                handleSplitChange(
                                  ruleIndex,
                                  splitIndex,
                                  'pct',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              disabled={rule.splits.length === 1}
                            />
                          </div>
                          <div className="flex items-center gap-1 pb-2">
                            {splitIndex === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleAddSplit(ruleIndex)}
                                className="text-lg font-bold text-primary hover:text-primary/80"
                              >
                                +
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplit(ruleIndex, splitIndex)}
                                className="text-lg font-bold text-text-muted hover:text-danger"
                              >
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remove Button Column */}
                  <div className="flex items-start justify-end md:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(ruleIndex)}
                      disabled={rule.default || formData.rules.length <= 1}
                      className="mt-6 rounded p-1 text-text-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LoadingOverlay>

      {/* Domain Group Modal */}
      <Modal
        open={showDomainGroupModal}
        onClose={() => setShowDomainGroupModal(false)}
        title="Expert use only, see our documentation. Do not use if unsure."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newDomainGroupName}
            onChange={(e) => setNewDomainGroupName(e.target.value)}
            placeholder="e.g., Gmail Domains"
            required
          />
          <Input
            label="Send to only these contact list domains and BLOCK/DENY all others"
            value={newDomainGroupDomains}
            onChange={(e) => setNewDomainGroupDomains(e.target.value)}
            placeholder="gmail.com, yahoo.com, etc."
            multiline
            rows={5}
            hint="Example: gmail.com, yahoo.com, etc."
            required
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDomainGroupModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveDomainGroup}
            loading={isSavingDomainGroup}
            disabled={!newDomainGroupName.trim() || !newDomainGroupDomains.trim()}
          >
            Create
          </Button>
        </div>
      </Modal>
    </div>
  )
}
