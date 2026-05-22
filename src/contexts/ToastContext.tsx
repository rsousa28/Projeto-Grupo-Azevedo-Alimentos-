import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  title?: string;
  type: 'success' | 'info' | 'error' | 'warning';
  duration: number; // in ms
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning', title?: string, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success', title?: string, duration = 4500) => {
      const id = Math.random().toString(36).substring(2, 9);
      
      // Default titles if not supplied
      const defaultTitle = 
        type === 'success' ? 'Sucesso' :
        type === 'error' ? 'Erro' :
        type === 'warning' ? 'Atenção' : 'Informação';

      setToasts((prev) => [...prev, { id, message, type, title: title || defaultTitle, duration }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const success = useCallback((message: string, title?: string, duration?: number) => {
    showToast(message, 'success', title, duration);
  }, [showToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    showToast(message, 'error', title, duration);
  }, [showToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    showToast(message, 'warning', title, duration);
  }, [showToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    showToast(message, 'info', title, duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Render View Overlay */}
      <div 
        id="global-toast-container" 
        className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none md:max-w-sm"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const colors = {
              success: {
                bg: 'bg-emerald-950/95 border-emerald-500/40 text-emerald-50',
                bar: 'bg-emerald-500',
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              },
              error: {
                bg: 'bg-red-950/95 border-red-500/40 text-red-50',
                bar: 'bg-red-500',
                icon: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
              },
              warning: {
                bg: 'bg-amber-950/95 border-amber-500/40 text-amber-50',
                bar: 'bg-amber-500',
                icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              },
              info: {
                bg: 'bg-slate-900/95 border-sky-500/40 text-sky-50',
                bar: 'bg-sky-500',
                icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
              },
            }[toast.type];

            return (
              <motion.div
                key={toast.id}
                id={`toast-item-${toast.id}`}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, transition: { duration: 0.15 } }}
                className={`relative overflow-hidden p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 pointer-events-auto cursor-pointer ${colors.bg}`}
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              >
                {/* Visual Icon */}
                {colors.icon}

                {/* Toast Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-semibold text-sm tracking-tight leading-none mb-1 text-white">
                    {toast.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-300 antialiased font-normal">
                    {toast.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  id={`toast-close-${toast.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                  }}
                  className="text-slate-400 hover:text-white transition-colors duration-150 p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Auto-dismiss progress bar timer */}
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-[3px] ${colors.bar}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
