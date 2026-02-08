import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Download, List, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Button } from '../../components/ui/Button'
import { TransactionalNav } from './TransactionalNav'
import type { TransactionalLogEntry } from '../../types/transactional'

interface LogResponse {
  records: TransactionalLogEntry[]
  page_size: number
  total: number
}

export function TransactionalLogPage() {
  const navigate = useNavigate()

  const [logs, setLogs] = useState<TransactionalLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<LogResponse>(`/api/transactional/log?page=${page}`)
      setLogs(data.records)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load activity log')
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async () => {
    setExporting(true)
    try {
      await api.post('/api/transactional/log/export')
      toast.success('Export started — check the Data Exports page')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const hasMore = page * pageSize < total

  const getEventBadgeColor = (event: string) => {
    switch (event.toLowerCase()) {
      case 'send':
        return 'bg-blue-100 text-blue-600'
      case 'delivered':
        return 'bg-green-100 text-green-600'
      case 'open':
        return 'bg-purple-100 text-purple-600'
      case 'click':
        return 'bg-indigo-100 text-indigo-600'
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Transactional</h1>
          <p className="text-sm text-text-muted">Transactional email activity</p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="h-4 w-4" />}
          onClick={handleExport}
          loading={exporting}
        >
          Export
        </Button>
      </div>

      <TransactionalNav />

      {/* Log Table */}
      <LoadingOverlay loading={isLoading}>
        {logs.length === 0 ? (
          <EmptyState
            icon={<List className="h-10 w-10" />}
            title="No activity found"
            description="No transactional email activity matches your filters."
          />
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Tag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">
                        {format(new Date(log.ts), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getEventBadgeColor(log.event)}`}
                        >
                          {log.event}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">{log.to}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-text-secondary">
                        {log.subject}
                      </td>
                      <td className="px-4 py-3">
                        {log.tag && (
                          <button
                            onClick={() =>
                              navigate(`/transactional/tag?id=${encodeURIComponent(log.tag)}`)
                            }
                            className="text-sm text-primary hover:underline"
                          >
                            {log.tag}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-text-muted">
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {(total ?? 0).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
