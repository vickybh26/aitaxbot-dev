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

// Every route is React.lazy()-loaded (see App.tsx), which fetches a
// content-hashed JS chunk on first navigation to that route. Every deploy
// changes those hashes. A tab already open from before a deploy — or one
// that just loaded an old cached index.html — asks the server for a chunk
// filename that no longer exists, the dynamic import() rejects, and React
// surfaces that rejection as a render error, landing here. The browser's
// own URL has already changed (wouter updates history on click, before the
// lazy import resolves), so a plain reload at the current location fixes
// it — which is exactly what "click Reload and it works" was doing by
// hand. Auto-reload once instead of asking for that click; the sessionStorage
// guard stops an infinite loop if the real page is broken for some other
// reason and reloading doesn't help.
const CHUNK_ERROR_PATTERN = /dynamically imported module|loading chunk|loading css chunk|importing a module script failed/i;
const CHUNK_RELOAD_FLAG = "aitaxbot-chunk-reload-attempted";

/**
 * Global Error Boundary — catches any unhandled React render error.
 *
 * Without this, a crash in any component silently unmounts the entire React
 * tree and shows a blank white page — the worst possible UX and impossible
 * to debug in production.
 *
 * This boundary logs the error to the console and shows a friendly recovery
 * UI with the error message (to help diagnose issues quickly) — unless the
 * error looks like a stale post-deploy chunk load failure, in which case it
 * reloads automatically instead (see the note above).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidMount() {
    // The guard exists to stop one bad chunk from reload-looping forever.
    // Clearing it once the app has stayed up for a few seconds means a
    // *later* deploy (same tab, still open) still gets the same one free
    // auto-reload rather than falling straight to the error screen.
    window.setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_FLAG), 5000);
  }

  componentDidCatch(error: Error, { componentStack }: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught React error:", error);
    console.error("[ErrorBoundary] Component stack:", componentStack);

    if (CHUNK_ERROR_PATTERN.test(error.message) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary px-4">
          <div className="max-w-lg w-full bg-card rounded-2xl shadow-sm border border-rule p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">Something went wrong</h1>
            <p className="text-ink/55 text-sm mb-6">
              AiTaxBot ran into an unexpected error. This has been logged. Try refreshing the page.
            </p>

            {this.state.error && (
              <details className="text-left bg-secondary rounded-lg p-4 mb-6 text-xs font-mono text-ink/65 overflow-auto max-h-40">
                <summary className="cursor-pointer text-ink/55 mb-2">Error details</summary>
                <p className="text-red-600 font-semibold">{this.state.error.message}</p>
                {this.state.info && (
                  <pre className="mt-2 text-ink/55 whitespace-pre-wrap text-xs">
                    {this.state.info.trim()}
                  </pre>
                )}
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-ink hover:bg-ink text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>

            <p className="text-xs text-ink/55 mt-4">
              If this keeps happening,{" "}
              <a href="/contact" className="underline hover:text-ink">contact us</a>.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
