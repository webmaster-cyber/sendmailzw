import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../config/api'
import { ROUTES } from '../../config/routes'
import type { LoginResponse } from '../../types/auth'

/**
 * ActivatePage handles account activation for self-signup users.
 *
 * URL params:
 *   ?username=email@example.com -- pre-fills email
 *   ?confirm=false -- skips code entry and auto-submits (no confirmation required)
 *
 * Calls POST /api/register with { username, code, offset }
 * On success, logs the user in and redirects to /welcome.
 */
export function ActivatePage() {
  const [searchParams] = useSearchParams()
  const { login, logout } = useAuth()
  const navigate = useNavigate()

  const usernameParam = searchParams.get('username') || ''
  const confirmParam = searchParams.get('confirm')
  const skipConfirm = confirmParam === 'false'

  const [email, setEmail] = useState(usernameParam)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const loggedOut = useRef(false)
  const autoSubmitted = useRef(false)
  const resendThrottle = useRef(0)

  // Log out any existing session on mount
  useEffect(() => {
    if (!loggedOut.current) {
      loggedOut.current = true
      logout()
    }
  }, [logout])

  const doActivate = useCallback(async (activationCode: string) => {
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post<LoginResponse>('/api/register', {
        username: email,
        code: activationCode,
        offset: -(new Date()).getTimezoneOffset(),
      })

      login(data.uid, data.cookie)
      navigate(ROUTES.WELCOME, { replace: true })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
          : null
      setError(message || 'Activation failed')
    } finally {
      setLoading(false)
    }
  }, [email, login, navigate])

  // Auto-submit if confirmation is not required
  useEffect(() => {
    if (skipConfirm && email && !autoSubmitted.current) {
      autoSubmitted.current = true
      doActivate('')
    }
  }, [skipConfirm, email, doActivate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await doActivate(code)
  }

  async function handleResend() {
    const now = Date.now()
    if (now - resendThrottle.current < 10000) return
    resendThrottle.current = now

    try {
      await api.post('/api/resendcode', { username: email })
      setResendMessage('Activation code sent! Check your email.')
    } catch {
      setResendMessage('Unable to resend code.')
    }
  }

  // If auto-submitting (no confirm), show nothing while processing
  if (skipConfirm) {
    return null
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
              <h2 className="text-lg font-semibold text-text-primary">Activate Account</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Enter the activation code we sent to your email address.
                Check your spam folder if you don't see it.
              </p>
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              readOnly={!!usernameParam}
              required
            />

            <Input
              label="Activation Code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code"
              autoComplete="off"
              autoFocus
              required
            />

            {error && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            {resendMessage && (
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {resendMessage}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Activate Account
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-primary hover:underline"
              >
                Didn't get a code? Resend it
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
