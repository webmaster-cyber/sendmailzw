import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../config/api'
import { ROUTES } from '../../config/routes'

/**
 * WelcomePage is shown after activation or first login when changepass is true.
 * The user must set a new password before proceeding.
 *
 * Calls POST /api/reset/password with { pass } (authenticated endpoint).
 * On success, redirects to the dashboard.
 */
export function WelcomePage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await api.post('/api/reset/password', { pass: password })
      navigate(ROUTES.HOME, { replace: true })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
          : null
      setError(message || 'Unable to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/logo.svg" alt="SendMail" className="mx-auto h-12 max-w-[200px] object-contain" />
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-text-primary">Set a Password</h2>
              <p className="mt-1 text-sm text-text-secondary">
                You're almost ready! Just one more thing: please create a password for your account.
              </p>
            </div>

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password"
              autoComplete="new-password"
              autoFocus
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
            />

            {error && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Save Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
