import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../config/api'
import { Spinner } from '../ui/Spinner'

interface BeefreeEditorProps {
  template: string
  fields: string[]
  onSave: (json: string, html: string) => void
  onChange?: () => void
  transactional?: boolean
}

declare global {
  interface Window {
    BeePlugin?: {
      create: (token: unknown, config: unknown, cb: (instance: unknown) => void) => void
    }
  }
}

interface BeeInstance {
  start: (template: unknown) => void
  save: () => void
  saveAsTemplate: () => void
}

const EMPTY_TEMPLATE = {
  page: {
    body: {
      container: { style: { 'background-color': '#f2f2f2' } },
      content: {
        computedStyle: { linkColor: '#006FC2', messageBackgroundColor: '#ffffff', messageWidth: '600px' },
        style: { color: '#000000', 'font-family': "'Poppins', sans-serif" },
      },
      type: 'mailup-bee-page-properties',
    },
    rows: [],
    template: { name: 'template-base', type: 'basic', version: '2.0.0' },
    title: '',
  },
}

export function BeefreeEditor({ template, fields, onSave, onChange, transactional }: BeefreeEditorProps) {
  const { user } = useAuth()
  const beeRef = useRef<BeeInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const saveResolveRef = useRef<(() => void) | null>(null)
  const initRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(
    (jsonFile: string, htmlFile: string) => {
      onSave(jsonFile, htmlFile)
      if (saveResolveRef.current) {
        saveResolveRef.current()
        saveResolveRef.current = null
      }
    },
    [onSave]
  )

  useEffect(() => {
    if (initRef.current || !user || !containerRef.current) return

    if (!window.BeePlugin) {
      setError('Beefree editor failed to load. Please refresh the page.')
      setLoading(false)
      return
    }

    initRef.current = true

    async function init() {
      try {
        const { data: token } = await api.get('/api/beefreeauth')

        const mergeTags = transactional
          ? [{ name: 'variable', value: '{{variable}}' }]
          : fields.map((field) => ({
              name: field,
              value: field === 'Email' ? `{{${field}}}` : `{{${field}, default=}}`,
            }))

        const config = {
          uid: user!.id,
          container: 'bee-plugin-container',
          disableLinkSanitize: true,
          username: user!.fullname,
          specialLinks: [
            { type: 'Unsubscribe', label: 'Unsubscribe URL', link: '{{!!unsublink}}' },
            { type: 'Unsubscribe', label: 'Unsubscribe and Redirect', link: '{{!!unsublink|url}}' },
            { type: 'Unsubscribe', label: 'Third Party Unsubscribe', link: '{{!!notrack|url}}' },
            { type: 'View', label: 'View in Browser', link: '{{!!viewinbrowser}}' },
          ],
          mergeTags,
          editorFonts: {
            showDefaultFonts: true,
            customFonts: [
              {
                name: 'Poppins',
                fontFamily: "'Poppins', sans-serif",
                url: 'https://fonts.googleapis.com/css?family=Poppins',
              },
            ],
          },
          onChange: () => onChange?.(),
          onSave: handleSave,
          onError: (err: unknown) => console.error('Beefree error:', err),
        }

        window.BeePlugin!.create(token, config, (instance: unknown) => {
          beeRef.current = instance as BeeInstance
          let json: unknown = null
          try {
            if (template) {
              const parsed = JSON.parse(template)
              json = parsed?.json || parsed
            }
          } catch {
            // Invalid JSON, use empty template
          }
          // Always call start - Beefree requires it to finish loading
          beeRef.current.start(json || EMPTY_TEMPLATE)
          setLoading(false)
        })
      } catch {
        setError('Failed to authenticate with Beefree. Check your license configuration.')
        setLoading(false)
      }
    }

    init()

    return () => {
      beeRef.current = null
    }
  }, [user, fields, transactional, template, handleSave, onChange])

  // Expose save method
  const triggerSave = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (beeRef.current) {
        saveResolveRef.current = resolve
        beeRef.current.save()
      } else {
        resolve()
      }
    })
  }, [])

  // Store triggerSave on the container element for parent access
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { triggerSave?: () => Promise<void> }).triggerSave = triggerSave
    }
  }, [triggerSave])

  if (error) {
    return (
      <div className="flex h-[500px] items-center justify-center text-sm text-danger">
        {error}
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface">
          <Spinner size="lg" />
        </div>
      )}
      <div
        ref={containerRef}
        id="bee-plugin-container"
        className="h-full min-h-[500px] w-full"
      />
    </div>
  )
}
