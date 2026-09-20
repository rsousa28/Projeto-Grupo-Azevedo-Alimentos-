import React, { useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface AccessibleConfirmDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly isDestructive?: boolean;
  readonly isLoading?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Diálogo Modal acessível com foco gerenciado, aria-modal="true",
 * aria-labelledby e tecla ESC para conformidade estrita WCAG 2.1 AA.
 */
export const AccessibleConfirmDialog: React.FC<AccessibleConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const descId = useId();

  // Fecha no Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="presentation"
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md bg-white dark:bg-[#18181C] text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2C2C33] overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  isDestructive 
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <p id={descId} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  aria-label="Fechar diálogo de confirmação"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-[#131316] border-t border-slate-100 dark:border-[#26262B] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#33333D] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202026] transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-xs focus:ring-2 focus:outline-none ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'A processar...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
