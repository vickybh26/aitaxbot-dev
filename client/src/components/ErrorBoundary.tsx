import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: string;
}

/**
 * Global Error Boundary — catches any unhandled React render error.
 *
 * Without this, a crash in any component silently unmounts the entire React
 * tree and shows a blank white page — the worst possible UX and impossible
 * to debug in production.
 *
 * This boundary logs the error to the console and shows a friendly recovery
 * UI with the error message (to help diagnose issues quickly).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, { componentStack }: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught React error:", error);
    console.error("[ErrorBoundary] Component stack:", componentStack);
    this.setState({ info: componentStack ?? "" });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: "" });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-slate-500 text-sm mb-6">
              AiTaxBot ran into an unexpected error. This has been logged. Try refreshing the page.
            </p>

            {this.state.error && (
              <details className="text-left bg-slate-50 rounded-lg p-4 mb-6 text-xs font-mono text-slate-600 overflow-auto max-h-40">
                <summary className="cursor-pointer text-slate-500 mb-2">Error details</summary>
                <p className="text-red-600 font-semibold">{this.state.error.message}</p>
                {this.state.info && (
                  <pre className="mt-2 text-slate-500 whitespace-pre-wrap text-xs">
                    {this.state.info.trim()}
                  </pre>
                )}
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-persian-blue-600 hover:bg-persian-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>

            <p className="text-xs text-slate-500 mt-4">
              If this keeps happening,{" "}
              <a href="/contact" className="underline hover:text-persian-blue-600">contact us</a>.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
