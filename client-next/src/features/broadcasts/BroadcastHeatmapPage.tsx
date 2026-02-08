import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { ReportNav } from './ReportNav'

interface BroadcastHeatmapData {
  name: string
  parts: string | null
  rawText: string | null
  linkclicks: number[]
  clicked_all: number
}

interface LinkInfo {
  url: string
  clicks: number
  index: number
}

function extractLinks(html: string): string[] {
  const links: string[] = []
  const regex = /href=["']([^"']+)["']/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const url = match[1]
    if (url && !url.startsWith('#') && !url.startsWith('mailto:')) {
      links.push(url)
    }
  }
  return links
}

function getHeatColor(clicks: number, max: number): string {
  if (max === 0 || clicks === 0) return 'rgba(100,116,139,0.15)'
  const ratio = clicks / max
  if (ratio > 0.66) return 'rgba(239,68,68,0.25)'
  if (ratio > 0.33) return 'rgba(249,115,22,0.2)'
  return 'rgba(59,130,246,0.15)'
}

function injectHeatmap(html: string, linkclicks: number[]): string {
  const maxClicks = Math.max(...linkclicks, 0)
  let linkIndex = 0

  const modified = html.replace(
    /(<a\s)([^>]*href=["'][^"']+["'][^>]*>)/gi,
    (match, openTag, rest) => {
      const href = rest.match(/href=["']([^"']+)["']/i)?.[1] || ''
      if (href.startsWith('#') || href.startsWith('mailto:')) return match

      const clicks = linkclicks[linkIndex] || 0
      const color = getHeatColor(clicks, maxClicks)
      linkIndex++

      return `${openTag}data-clicks="${clicks}" style="position:relative;outline:3px solid ${color};outline-offset:-1px;cursor:pointer" ${rest}`
    }
  )

  const heatmapCSS = `
    <style>
      a[data-clicks] { position: relative !important; text-decoration: none; }
      a[data-clicks]::after {
        content: attr(data-clicks);
        position: absolute;
        top: 50%;
        right: -6px;
        transform: translate(100%, -50%);
        background: #1e293b;
        color: #fff;
        font-size: 10px;
        font-family: -apple-system, sans-serif;
        padding: 2px 6px;
        border-radius: 10px;
        white-space: nowrap;
        z-index: 1000;
        line-height: 1.4;
      }
    </style>`

  if (modified.includes('</head>')) {
    return modified.replace('</head>', `${heatmapCSS}</head>`)
  }
  return heatmapCSS + modified
}

export function BroadcastHeatmapPage() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [data, setData] = useState<BroadcastHeatmapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/broadcasts/${id}`)
        setData(res.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const html = useMemo(() => {
    if (!data) return ''
    if (data.rawText) {
      try {
        const parsed = JSON.parse(data.rawText)
        if (parsed.html) return parsed.html
      } catch {
        return data.rawText
      }
    }
    return data.parts || ''
  }, [data])

  const links: LinkInfo[] = useMemo(() => {
    if (!html || !data?.linkclicks) return []
    const urls = extractLinks(html)
    return urls.map((url, i) => ({
      url,
      clicks: data.linkclicks[i] || 0,
      index: i,
    }))
  }, [html, data])

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <ReportNav id={id} activeTab="heatmap" title={data.name} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Link stats table */}
        <div className="card p-4 lg:col-span-1 self-start">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Link Clicks</h3>
          {links.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {links
                .sort((a, b) => b.clicks - a.clicks)
                .map((link) => (
                  <div key={link.index} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                      {link.clicks}
                    </span>
                    <span className="text-text-secondary break-all line-clamp-2">{link.url}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">No links found in template</p>
          )}
          {data.clicked_all > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
              <span className="text-text-muted">Total Clicks</span>
              <span className="font-medium text-text-primary">{(data.clicked_all ?? 0).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Template preview with heatmap overlay */}
        <div className="card overflow-hidden lg:col-span-2">
          {html ? (
            <iframe
              srcDoc={injectHeatmap(html, data.linkclicks || [])}
              title="Email Heatmap"
              className="w-full border-0"
              style={{ minHeight: 600 }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="p-8 text-center text-sm text-text-muted">No template available</div>
          )}
        </div>
      </div>
    </div>
  )
}
