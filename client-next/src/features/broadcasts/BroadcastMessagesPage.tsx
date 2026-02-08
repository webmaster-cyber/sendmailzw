import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'

interface BounceMessage {
  msg: string
  count: number
}

export function BroadcastMessagesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''
  const type = searchParams.get('type') || 'hard'
  const domain = searchParams.get('domain') || ''

  const [messages, setMessages] = useState<BounceMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ type })
        if (domain) params.set('domain', domain)
        const res = await api.get(`/api/broadcasts/${id}/msgs?${params}`)
        setMessages(res.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, type, domain])

  const title = type === 'soft' ? 'Soft Bounce Messages' : 'Hard Bounce Messages'

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 card p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          {domain && (
            <span className="text-sm text-text-muted">— {domain}</span>
          )}
        </div>
      </div>

      {messages.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Message</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted w-24">Count</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 text-text-secondary text-xs break-all">{m.msg}</td>
                  <td className="px-4 py-2 text-right font-medium text-text-primary">{(m.count ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-text-muted">No bounce messages found</div>
      )}
    </div>
  )
}
