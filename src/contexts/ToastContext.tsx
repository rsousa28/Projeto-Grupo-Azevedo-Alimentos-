import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastCard } from '../components/notifications/NotificationCard';
import type { NotifTone } from '../lib/notifications';

type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface Toast {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration: number; // in ms
  content?: (dismiss: () => void) => React.ReactNode; // card próprio (notificações do sistema)
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  /** Mostra um card com layout próprio no lugar do aviso padrão. */
  showCustomToast: (content: (dismiss: () => void) => React.ReactNode, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Avisos empilhados ao mesmo tempo: o mais antigo sai quando chega um novo
const MAX_VISIBLE = 4;

const TONE: Record<ToastType, NotifTone> = {
  success: 'success',
  error: 'critical',
  warning: 'warning',
  info: 'info',
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }].slice(-MAX_VISIBLE));
      setTimeout(() => dismiss(id), toast.duration);
    },
    [dismiss],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', title?: string, duration = 4500) => push({ message, type, title, duration }),
    [push],
  );

  const showCustomToast = useCallback(
    (content: (dismiss: () => void) => React.ReactNode, duration = 15000) => push({ message: '', type: 'info', duration, content }),
    [push],
  );

  const success = useCallback((message: string, title?: string, duration?: number) => showToast(message, 'success', title, duration), [showToast]);
  const error = useCallback((message: string, title?: string, duration?: number) => showToast(message, 'error', title, duration ?? 6000), [showToast]);
  const warning = useCallback((message: string, title?: string, duration?: number) => showToast(message, 'warning', title, duration), [showToast]);
  const info = useCallback((message: string, title?: string, duration?: number) => showToast(message, 'info', title, duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, showCustomToast }}>
      {children}

      {/* Pilha de avisos (respeita a área segura do celular) */}
      <div
        id="global-toast-container"
        className="fixed top-[max(3.75rem,calc(env(safe-area-inset-top)+0.75rem))] inset-x-3 sm:top-6 sm:right-6 sm:left-auto sm:inset-x-auto z-[9999] flex flex-col gap-2.5 max-w-md w-[calc(100%-1.5rem)] sm:w-full pointer-events-none sm:max-w-[26rem] mx-auto sm:mx-0"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const close = () => dismiss(toast.id);
            return (
              <motion.div
                key={toast.id}
                id={`toast-item-${toast.id}`}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.15 } }}
                className="relative pointer-events-auto"
                role={toast.type === 'error' ? 'alert' : 'status'}
              >
                {toast.content ? (
                  toast.content(close)
                ) : (
                  <ToastCard tone={TONE[toast.type]} title={toast.title} message={toast.message} onDismiss={close} />
                )}
                <div className="absolute inset-x-5 bottom-0 h-[2px] overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                    className="h-full bg-white/25"
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
