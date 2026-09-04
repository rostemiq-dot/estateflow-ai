import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "An unexpected application error occurred.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EstateFlow UI error", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section role="alert" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle size={26} aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">EstateFlow</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">The workspace hit an unexpected error. Your database data is not deleted. Try loading the application again.</p>
          {this.state.message && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-left text-xs text-slate-500">{this.state.message}</p>}
          <button type="button" onClick={this.handleRetry} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
            <RefreshCw size={17} aria-hidden="true" /> Try again
          </button>
        </section>
      </main>
    );
  }
}
