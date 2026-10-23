import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-rose-400">Runtime Error Caught</h2>
            <pre className="text-xs bg-slate-950 p-3 rounded-xl overflow-auto text-slate-300">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration optional in restricted dev environments
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
