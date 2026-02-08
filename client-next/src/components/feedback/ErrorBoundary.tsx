import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center text-danger">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="text-sm text-primary hover:text-primary-hover"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
