import { Component } from 'react';

/**
 * React Error Boundary — catches render-time errors and shows a recovery screen
 * instead of a blank white page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <span className="text-5xl">💥</span>
          <h1 className="mt-4 text-[18px] font-bold text-slate-800">
            Something went wrong
          </h1>
          <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
            An unexpected error occurred. Check the browser console for details.
          </p>
          {this.state.error && (
            <pre className="mt-4 rounded-lg bg-slate-950 p-3 text-left text-[11px]
              text-red-300 overflow-x-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-[13px]
              font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
