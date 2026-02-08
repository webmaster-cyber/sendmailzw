import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../config/api'
import { ROUTES } from '../../config/routes'

/**
 * ResetPasswordPage handles two flows:
 * 1. "Forgot password" — user enters email, we call /api/reset/sendemail
 * 2. "Email reset" — user arrives via reset link with ?key=..., enters new password,
 *    we call /api/reset/passemail
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const resetKey = searchParams.get('key')

  if (resetKey) {
    return <ResetWithKey resetKey={resetKey} />
  }

  return <RequestReset />
}

/** Step 1: Enter email to request a password reset link */
function RequestReset() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/api/reset/sendemail', { email })
      setSent(true)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
          : null
      setError(message || 'Unable to send reset email')
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
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Password reset email sent. Please check your inbox.
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate(ROUTES.LOGIN)}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-text-primary">Reset Password</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Enter your email address and we will send you a reset link.
                </p>
              </div>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              {error && (
                <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Send Reset Email
              </Button>

              <div className="text-center">
                <Link to={ROUTES.LOGIN} className="text-sm text-primary hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/** Step 2: User clicked the reset link in their email -- set a new password */
function ResetWithKey({ resetKey }: { resetKey: string }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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
      await api.post('/api/reset/passemail', {
        pass: password,
        key: resetKey,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
          : null
      setError(message || 'Unable to reset password')
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
          {success ? (
            <div className="space-y-4 text-center">
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Password reset successfully. Please sign in with your new password.
              </div>
              <Button className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
                Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-text-primary">Set New Password</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Enter your new password below.
                </p>
              </div>

              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
              />

              {error && (
                <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Reset Password
              </Button>

              <div className="text-center">
                <Link to={ROUTES.LOGIN} className="text-sm text-primary hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
