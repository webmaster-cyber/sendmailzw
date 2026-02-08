import { useState, useEffect } from 'react'
import { TopBar } from '../navigation/TopBar'
import { Sidebar } from '../navigation/Sidebar'
import { useAuth } from '../../contexts/AuthContext'

interface AppShellProps {
  children: React.ReactNode
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  })
  const { user, impersonate } = useAuth()
  const isAdmin = !!user?.admin && !impersonate

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-all duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: sidebarCollapsed ? '64px' : 'var(--sidebar-width)' }}
      >
        <Sidebar
          isAdmin={isAdmin}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapsed}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {impersonate && user && (
            <ImpersonationBanner />
          )}
          {user?.inreview && !impersonate && (
            <PendingApprovalBanner />
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

function PendingApprovalBanner() {
  return (
    <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <strong>Account pending approval</strong> — Your account is being reviewed by our team.
      You can explore the platform, but sending is disabled until your account is approved.
    </div>
  )
}

function ImpersonationBanner() {
  const { user, clearImpersonation } = useAuth()

  return (
    <div className="mb-4 flex items-center justify-between rounded-md bg-warning/10 px-4 py-2 text-sm text-warning">
      <span>
        Viewing as: <strong>{user?.fullname}</strong> ({user?.companyname})
      </span>
      <button
        onClick={clearImpersonation}
        className="rounded-md px-3 py-1 text-xs font-medium text-warning hover:bg-warning/20"
      >
        Exit Impersonation
      </button>
    </div>
  )
}
