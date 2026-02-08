import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'

interface DetailRecord {
  email: string
  ts: string
  code?: string
}

interface DetailsResponse {
  records: DetailRecord[]
  total: number
  page_size: number
}

const cmdLabels: Record<string, string> = {
  open: 'Opens',
  click: 'Clicks',
  bounce: 'Hard Bounces',
  soft: 'Soft Bounces',
  unsub: 'Unsubscribes',
  complaint: 'Complaints',
}

export function BroadcastDetailsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const id = searchParams.get('id') || ''
  const cmd = searchParams.get('cmd') || 'open'
  const domain = searchParams.get('domain') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [data, setData] = useState<DetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ cmd, page: String(page) })
        if (domain) params.set('domain', domain)
        const res = await api.get(`/api/broadcasts/${id}/details?${params}`)
        setData(res.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, cmd, domain, page])

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    setSearchParams(params)
  }

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0
  const title = cmdLabels[cmd] || 'Details'

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
          {data && (
            <span className="ml-auto text-xs text-text-muted">{(data.total ?? 0).toLocaleString()} total</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : data && data.records.length > 0 ? (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Time</th>
                  {(cmd === 'bounce' || cmd === 'soft') && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Code</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.records.map((rec, i) => (
                  <tr key={`${rec.email}-${i}`} className="border-b border-border last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 text-text-primary">{rec.email}</td>
                    <td className="px-4 py-2 text-text-secondary">{new Date(rec.ts).toLocaleString()}</td>
                    {(cmd === 'bounce' || cmd === 'soft') && (
                      <td className="px-4 py-2 text-text-muted text-xs">{rec.code || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-text-secondary">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card p-8 text-center text-sm text-text-muted">No records found</div>
      )}
    </div>
  )
}
