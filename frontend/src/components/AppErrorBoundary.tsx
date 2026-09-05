import React from 'react';

type AppErrorBoundaryState = {
  errorMessage: string | null;
  errorStack: string | null;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorMessage: null,
    errorStack: null,
  };

  private onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack ?? null : null;
    this.setState({ errorMessage: `Unhandled promise rejection: ${message}`, errorStack: stack });
  };

  private onWindowError = (event: ErrorEvent) => {
    const message = event.error instanceof Error ? event.error.message : event.message;
    const stack = event.error instanceof Error ? event.error.stack ?? null : null;
    if (typeof message === 'string' && (message.includes('removeChild') || message.includes('not a child of this node'))) {
      console.warn('Ignored DOM removeChild mutation from browser extension/translation:', message);
      return;
    }
    this.setState({ errorMessage: `Runtime error: ${message}`, errorStack: stack });
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack ?? null : null;
    if (typeof message === 'string' && (message.includes('removeChild') || message.includes('not a child of this node'))) {
      console.warn('Recovered from DOM removeChild error:', message);
      return { errorMessage: null, errorStack: null };
    }
    return { errorMessage: message, errorStack: stack };
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
    window.addEventListener('error', this.onWindowError);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
    window.removeEventListener('error', this.onWindowError);
  }

  componentDidCatch(error: unknown) {
    // Ensure message is present even if getDerivedStateFromError didn't run.
    if (!this.state.errorMessage) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack ?? null : null;
      this.setState({ errorMessage: message, errorStack: stack });
    }
  }

  render() {
    if (!this.state.errorMessage) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-slate-900">حدث خطأ في واجهة التطبيق</h1>
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              onClick={() => window.location.reload()}
            >
              إعادة التحميل
            </button>
          </div>

          <p className="text-sm text-slate-600 mt-2">
            إذا كنت ترى شاشة بيضاء، انسخ رسالة الخطأ أدناه وأرسلها هنا.
          </p>

          <div className="mt-4 rounded-xl bg-slate-900 text-slate-100 p-4 overflow-auto text-xs whitespace-pre-wrap">
            {this.state.errorMessage}
            {this.state.errorStack ? `\n\n${this.state.errorStack}` : ''}
          </div>
        </div>
      </div>
    );
  }
}
