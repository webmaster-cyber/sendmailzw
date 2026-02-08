import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { ReportNav } from './ReportNav'

interface DomainStat {
  domain: string
  count: number
  send: number
  open: number
  click: number
  unsub: number
  complaint: number
  soft: number
  hard: number
  overdomainbounce?: boolean
  overdomaincomplaint?: boolean
}

type SortKey = 'domain' | 'count' | 'send' | 'open' | 'click' | 'unsub' | 'complaint' | 'soft' | 'hard'

function pct(value: number, total: number): string {
  if (total === 0) return '0%'
  return ((value / total) * 100).toFixed(1) + '%'
}

export function BroadcastDomainsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [domains, setDomains] = useState<DomainStat[]>([])
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [bcRes, domRes] = await Promise.all([
          api.get(`/api/broadcasts/${id}`),
          api.get(`/api/broadcasts/${id}/domainstats`),
        ])
        setName(bcRes.data.name)
        setDomains(domRes.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const sorted = useMemo(() => {
    return [...domains].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [domains, sortKey, sortAsc])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <ReportNav id={id} activeTab="domains" title={name} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <SortHeader label="Domain" sortKey="domain" current={sortKey} asc={sortAsc} onSort={handleSort} />
                <SortHeader label="Contacts" sortKey="count" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="Delivered" sortKey="send" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="Opens" sortKey="open" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="CTR" sortKey="click" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="Unsubs" sortKey="unsub" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="Complaints" sortKey="complaint" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="Soft" sortKey="soft" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
                <SortHeader label="Hard" sortKey="hard" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.domain} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-text-primary">{d.domain}</td>
                  <td className="px-3 py-2 text-right text-text-secondary">{(d.count ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-text-secondary">{pct(d.send, d.count)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=open&domain=${d.domain}`)} className="text-primary hover:underline">
                      {pct(d.open, d.send)}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=click&domain=${d.domain}`)} className="text-primary hover:underline">
                      {pct(d.click, d.send)}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=unsub&domain=${d.domain}`)} className="text-primary hover:underline">
                      {pct(d.unsub, d.send)}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-right ${d.overdomaincomplaint ? 'text-danger font-medium' : ''}`}>
                    <button onClick={() => navigate(`/broadcasts/details?id=${id}&cmd=complaint&domain=${d.domain}`)} className="text-primary hover:underline">
                      {pct(d.complaint, d.send)}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-right ${d.overdomainbounce ? 'text-warning font-medium' : ''}`}>
                    <button onClick={() => navigate(`/broadcasts/messages?id=${id}&type=soft&domain=${d.domain}`)} className="text-primary hover:underline">
                      {pct(d.soft, d.count)}
                    </button>
                  </td>
                  <td className={`px-3 py-2 text-right ${d.overdomainbounce ? 'text-danger font-medium' : ''}`}>
                    <button onClick={() => navigate(`/broadcasts/messages?id=${id}&type=hard&domain=${d.domain}`)} className="text-primary hover:underline">
                      {pct(d.hard, d.count)}
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-text-muted">No domain data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SortHeader({ label, sortKey, current, asc, onSort, align }: {
  label: string
  sortKey: SortKey
  current: SortKey
  asc: boolean
  onSort: (key: SortKey) => void
  align?: 'right'
}) {
  const isActive = current === sortKey
  return (
    <th
      className={`px-3 py-2 font-medium text-text-muted cursor-pointer hover:text-text-primary select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && <span className="ml-0.5">{asc ? '↑' : '↓'}</span>}
    </th>
  )
}
