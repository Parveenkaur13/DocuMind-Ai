import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DocuMind Uncaught UI Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f7f7] flex items-center justify-center p-6 text-[#183237]">
          <div className="max-w-lg w-full bg-white rounded-2xl p-6 shadow-xl border border-[#d2ebe5] space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Something went wrong</h2>
                <p className="text-xs text-[#5e7a76]">DocuMind encountered an unexpected display error</p>
              </div>
            </div>

            <div className="bg-[#f8faf9] p-3 rounded-xl border border-[#e2ece9] text-xs font-mono text-rose-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown render error occurred'}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c4e48] text-white text-xs font-semibold hover:bg-[#163d38] transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Cache & Reset</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
