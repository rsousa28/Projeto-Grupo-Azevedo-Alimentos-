import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleClearCacheAndReload = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('doc_cache_') || k.startsWith('firestore_') || k.includes('_draft_') || k.includes('cache'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message?.includes('QuotaExceededError') ||
        this.state.error?.message?.includes('quota') ||
        this.state.error?.message?.includes('ASSERTION FAILED');

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">
                {isQuotaError ? 'Limite de Armazenamento Excedido' : 'Algo deu errado no aplicativo'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isQuotaError
                  ? 'O armazenamento local do navegador atingiu a capacidade máxima. Limpe o cache temporário para reestabelecer o sistema.'
                  : 'Ocorreu uma falha inesperada ao carregar a interface. Clique abaixo para reiniciar.'}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-black/40 border border-red-500/10 rounded-xl text-left max-h-32 overflow-y-auto">
                <code className="text-[10px] text-red-300/80 font-mono break-all leading-tight">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Cache e Reiniciar Sistema
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
