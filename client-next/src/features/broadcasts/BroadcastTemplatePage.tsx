import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Send, Maximize2, Minimize2, ChevronRight } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { BeefreeEditor } from '../../components/editors/BeefreeEditor'
import { CodeEditor } from '../../components/editors/CodeEditor'
import { useNavigationGuard } from '../../hooks/useNavigationGuard'
import { WizardNav } from './WizardNav'
import type { BroadcastFormData, SendRoute } from '../../types/broadcast'

export function BroadcastTemplatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [data, setData] = useState<Partial<BroadcastFormData> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [fields, setFields] = useState<string[]>([])
  const [routes, setRoutes] = useState<SendRoute[]>([])
  const [testEmails, setTestEmails] = useState<string[]>([])
  const [testEmail, setTestEmail] = useState('')
  const [testRoute, setTestRoute] = useState('')
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const savedRawTextRef = useRef<string | null>(null)

  const guardSave = useCallback(async () => {
    if (!data) return
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      setDirty(false)
      toast.success('Draft saved')
    } catch {
      toast.error('Failed to save')
    }
  }, [data, id])

  const autoSave = useCallback(async () => {
    if (!dirty || !data) return
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      setDirty(false)
    } catch {
      // silent fail for auto-save
    }
  }, [dirty, data, id])

  useNavigationGuard({ dirty, onSave: guardSave })

  useEffect(() => {
    async function load() {
      try {
        const [bcRes, fieldsRes, testRes, routesRes] = await Promise.all([
          api.get(`/api/broadcasts/${id}`),
          api.get('/api/allfields'),
          api.get('/api/testemails').catch(() => ({ data: [] })),
          api.get('/api/userroutes').catch(() => ({ data: [] })),
        ])
        setData(bcRes.data)
        setFields(fieldsRes.data)
        setRoutes(routesRes.data)
        if (testRes.data.length) {
          setTestEmails(testRes.data)
          setTestEmail(testRes.data[0])
        }
        if (routesRes.data.length) setTestRoute(routesRes.data[0].id)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const handleBeeSave = useCallback((jsonFile: string, htmlFile: string) => {
    const rawText = JSON.stringify({ html: htmlFile, json: JSON.parse(jsonFile) })
    savedRawTextRef.current = rawText
    setData((prev) => prev ? ({ ...prev, rawText }) : prev)
    setDirty(true)
  }, [])

  async function triggerBeeSave() {
    const container = document.getElementById('bee-plugin-container') as HTMLDivElement & { triggerSave?: () => Promise<void> } | null
    if (container?.triggerSave) {
      await container.triggerSave()
    }
  }

  async function handleSave() {
    if (!data) return
    setIsSaving(true)
    try {
      if (data.type === 'beefree') {
        await triggerBeeSave()
      }
      const patchData = savedRawTextRef.current
        ? { ...data, rawText: savedRawTextRef.current }
        : data
      await api.patch(`/api/broadcasts/${id}`, patchData)
      setDirty(false)
      toast.success('Template saved')
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
      if (data.type === 'beefree') {
        await triggerBeeSave()
      }
      const patchData = savedRawTextRef.current
        ? { ...data, rawText: savedRawTextRef.current }
        : data
      await api.patch(`/api/broadcasts/${id}`, patchData)
      setDirty(false)
      navigate(`/broadcasts/rcpt?id=${id}`)
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSendTest() {
    if (!testEmail) return
    try {
      await handleSave()
      await api.post(`/api/broadcasts/${id}/test`, {
        to: testEmail,
        route: testRoute,
      })
      toast.success('Test email submitted')
    } catch {
      toast.error('Failed to send test')
    }
  }

  function handleCodeChange(html: string) {
    setData((prev) => prev ? ({ ...prev, rawText: html }) : prev)
    setDirty(true)
  }

  function handleSettingsChange(field: string, value: string) {
    setData((prev) => prev ? ({ ...prev, [field]: value }) : prev)
    setDirty(true)
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isRaw = data.type === 'raw'

  const editorElement = isRaw ? (
    <CodeEditor
      value={typeof data.rawText === 'string' ? data.rawText : ''}
      onChange={handleCodeChange}
    />
  ) : (
    <BeefreeEditor
      template={data.rawText || ''}
      fields={fields}
      onSave={handleBeeSave}
    />
  )

  if (focusMode) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Minimal toolbar */}
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFocusMode(false)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Exit Full Screen
              </button>
              <div className="h-4 w-px bg-border" />
              <span className="text-xs text-text-muted truncate max-w-xs">
                {data.subject || 'Untitled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showTestPanel ? (
                <div className="flex items-center gap-2">
                  <input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="input !w-48 !py-1.5 text-xs"
                    list="test-emails-list-focus"
                  />
                  <datalist id="test-emails-list-focus">
                    {testEmails.map((email) => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>
                  {routes.length > 0 && (
                    <select
                      value={testRoute}
                      onChange={(e) => setTestRoute(e.target.value)}
                      className="input !w-32 !py-1.5 text-xs"
                    >
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                  <Button size="sm" onClick={handleSendTest} icon={<Send className="h-3 w-3" />}>
                    Send
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowTestPanel(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowTestPanel(true)}>
                  Send Test
                </Button>
              )}
              <div className="h-4 w-px bg-border" />
              <Button variant="ghost" size="sm" onClick={handleSave} loading={isSaving}>
                Save Draft
              </Button>
              <button
                onClick={handleNext}
                disabled={isSaving}
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <span>Recipients</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Full-screen editor */}
          <div className="flex-1 overflow-hidden" ref={editorContainerRef}>
            {editorElement}
          </div>
        </div>

        {/* Settings modal still accessible */}
        <Modal
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Email Settings"
        >
          <div className="space-y-4">
            <Input label="From Name" value={data.fromname || ''} onChange={(e) => handleSettingsChange('fromname', e.target.value)} placeholder="Your Name" />
            <Input label="From Email" value={data.returnpath || ''} onChange={(e) => handleSettingsChange('returnpath', e.target.value)} placeholder="you@example.com" />
            <Input label="Reply-To" value={data.replyto || ''} onChange={(e) => handleSettingsChange('replyto', e.target.value)} placeholder="reply@example.com (optional)" />
            <Input label="Subject" value={data.subject || ''} onChange={(e) => handleSettingsChange('subject', e.target.value)} placeholder="Email subject line" />
            <Input label="Preheader" value={data.preheader || ''} onChange={(e) => handleSettingsChange('preheader', e.target.value)} placeholder="Preview text (optional)" hint="Shows next to the subject in most email clients" />
            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowSettingsModal(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <div>
      <WizardNav
        title="Design Email"
        step={2}
        totalSteps={5}
        id={id}
        backTo={`/broadcasts/templates?id=${id}`}
        nextLabel="Choose Recipients"
        onNext={handleNext}
        onSave={handleSave}
        onAutoSave={autoSave}
        saving={isSaving}
      />

      {/* Email details bar */}
      <div className="mb-4 card p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex flex-col gap-1 min-w-0 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-text-muted shrink-0 w-14">From:</span>
                <span className="text-text-primary truncate font-medium">
                  {data.fromname ? `${data.fromname} <${data.returnpath}>` : <span className="text-text-muted italic">Not set</span>}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-text-muted shrink-0 w-14">Subject:</span>
                <span className="text-text-primary truncate">
                  {data.subject || <span className="text-text-muted italic">Not set</span>}
                </span>
              </div>
              {data.preheader && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-text-muted shrink-0 w-14">Preheader:</span>
                  <span className="text-text-secondary truncate">{data.preheader}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-muted hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
            >
              <Pencil className="h-3 w-3" />
              Edit Details
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFocusMode(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors"
              title="Full screen editor"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {showTestPanel ? (
              <div className="flex items-center gap-2">
                <input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="input !w-48 !py-1.5 text-xs"
                  list="test-emails-list"
                />
                <datalist id="test-emails-list">
                  {testEmails.map((email) => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
                {routes.length > 0 && (
                  <select
                    value={testRoute}
                    onChange={(e) => setTestRoute(e.target.value)}
                    className="input !w-32 !py-1.5 text-xs"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}
                <Button size="sm" onClick={handleSendTest} icon={<Send className="h-3 w-3" />}>
                  Send
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowTestPanel(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setShowTestPanel(true)}>
                Send Test
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="card overflow-hidden h-[calc(100vh-280px)] min-h-[500px]" ref={editorContainerRef}>
        {editorElement}
      </div>

      {/* Settings edit modal */}
      <Modal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Email Settings"
      >
        <div className="space-y-4">
          <Input
            label="From Name"
            value={data.fromname || ''}
            onChange={(e) => handleSettingsChange('fromname', e.target.value)}
            placeholder="Your Name"
          />
          <Input
            label="From Email"
            value={data.returnpath || ''}
            onChange={(e) => handleSettingsChange('returnpath', e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="Reply-To"
            value={data.replyto || ''}
            onChange={(e) => handleSettingsChange('replyto', e.target.value)}
            placeholder="reply@example.com (optional)"
          />
          <Input
            label="Subject"
            value={data.subject || ''}
            onChange={(e) => handleSettingsChange('subject', e.target.value)}
            placeholder="Email subject line"
          />
          <Input
            label="Preheader"
            value={data.preheader || ''}
            onChange={(e) => handleSettingsChange('preheader', e.target.value)}
            placeholder="Preview text (optional)"
            hint="Shows next to the subject in most email clients"
          />
          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowSettingsModal(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
