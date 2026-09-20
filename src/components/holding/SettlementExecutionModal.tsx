import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { 
  PendingLiabilityRecord, 
  OverdueLiabilityRecord, 
  SettleLiabilityPayload,
  MoneyUtils,
  PaymentExecutionState,
  Cents
} from '../../types/treasuryDomain';

interface SettlementExecutionModalProps {
  readonly liability: PendingLiabilityRecord | OverdueLiabilityRecord | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onExecute: (payload: SettleLiabilityPayload) => Promise<boolean>;
}

/**
 * Modal de Liquidação / Pagamento com garantia de Idempotência,
 * estados explícitos de ciclo de vida (idle, loading, success, error)
 * e acessibilidade (role="dialog", aria-modal="true").
 */
export const SettlementExecutionModal: React.FC<SettlementExecutionModalProps> = ({
  liability,
  isOpen,
  onClose,
  onExecute,
}) => {
  const titleId = useId();
  const [executionState, setExecutionState] = useState<PaymentExecutionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de formulário
  const [mode, setMode] = useState<'INSTALLMENT' | 'FULL' | 'CUSTOM'>('INSTALLMENT');
  const [customValueString, setCustomValueString] = useState<string>('');
  const [payerEntity, setPayerEntity] = useState<string>(() => liability?.payerEntityId || 'HOLDING');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'TED' | 'DEBITO_CONTA' | 'RATEIO'>('PIX');
  const [note, setNote] = useState<string>('');

  if (!isOpen || !liability) return null;

  // Cálculo rigoroso do montante a pagar em centavos (Cents)
  const computedPayAmountCents: Cents = (() => {
    if (mode === 'FULL') {
      return liability.outstandingBalanceCents;
    }
    if (mode === 'INSTALLMENT') {
      return Math.min(liability.installmentMonthlyCents, liability.outstandingBalanceCents);
    }
    return Math.min(MoneyUtils.parseInputToCents(customValueString), liability.outstandingBalanceCents);
  })();

  const resultingBalanceCents: Cents = Math.max(0, liability.outstandingBalanceCents - computedPayAmountCents);

  // Submissão Segura com Idempotency Key
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedPayAmountCents <= 0) {
      setErrorMessage('O montante de liquidação deve ser estritamente superior a zero.');
      return;
    }

    setExecutionState('loading');
    setErrorMessage(null);

    // Geração de chave de idempotência com alta entropia (UUID v4)
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload: SettleLiabilityPayload = {
      liabilityId: liability.id,
      idempotencyKey,
      amountCents: computedPayAmountCents,
      payerEntityId: payerEntity,
      paymentDateIso: paymentDate,
      paymentMethod,
      receiptNote: note.trim() || undefined,
    };

    const success = await onExecute(payload);

    if (success) {
      setExecutionState('success');
      setTimeout(() => {
        setExecutionState('idle');
        onClose();
      }, 900);
    } else {
      setExecutionState('error');
      setErrorMessage('Não foi possível processar a liquidação. Tente novamente.');
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        role="presentation"
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-white dark:bg-[#18181C] text-slate-900 dark:text-white rounded-3xl shadow-2xl border border-slate-200 dark:border-[#2C2C33] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#26262B] bg-slate-50/70 dark:bg-[#141417]">
            <div>
              <h2 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
                Liquidação Financeira / Baixa de Passivo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registo de amortização ou quitação com conciliação contábil
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={executionState === 'loading'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Informações da Obrigação */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131316] border border-slate-200 dark:border-[#26262B] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Credor:</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{liability.creditor}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Saldo Atual Devedor:</span>
                <p className="font-bold text-sm text-amber-600 dark:text-amber-400">
                  {MoneyUtils.formatBRL(liability.outstandingBalanceCents)}
                </p>
              </div>
            </div>

            {/* Seleção do Modo de Pagamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Opção de Amortização
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('INSTALLMENT')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    mode === 'INSTALLMENT'
                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
                      : 'bg-white dark:bg-[#202026] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#33333D]'
                  }`}
                >
                  Parcela Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setMode('FULL')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    mode === 'FULL'
                      ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                      : 'bg-white dark:bg-[#202026] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#33333D]'
                  }`}
                >
                  Quitar Tudo (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('CUSTOM')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    mode === 'CUSTOM'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold shadow-xs'
                      : 'bg-white dark:bg-[#202026] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#33333D]'
                  }`}
                >
                  Outro Valor
                </button>
              </div>
            </div>

            {/* Campo Customizado */}
            {mode === 'CUSTOM' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Valor a Amortizar (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={customValueString}
                  onChange={(e) => setCustomValueString(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-[#202026] border border-slate-300 dark:border-[#33333D] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Resumo do Impacto no Saldo */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Valor Desta Baixa:</span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                {MoneyUtils.formatBRL(computedPayAmountCents)}
              </span>
            </div>

            {/* Metadados: Entidade Pagadora e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Entidade Pagadora (Origem)
                </label>
                <select
                  value={payerEntity}
                  onChange={(e) => setPayerEntity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#202026] border border-slate-300 dark:border-[#33333D] focus:outline-none"
                >
                  <option value="HOLDING">Holding Central</option>
                  <option value="B32">Loja B32 (Mossoró)</option>
                  <option value="B28">Loja B28 (Rio Mar)</option>
                  <option value="VERO">Vero Pasta</option>
                  <option value="RATEIO">Rateio entre Sócios / Lojas</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Data Efetiva
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#202026] border border-slate-300 dark:border-[#33333D] focus:outline-none"
                />
              </div>
            </div>

            {/* Método e Observações */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Canal / Método
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#202026] border border-slate-300 dark:border-[#33333D] focus:outline-none"
                >
                  <option value="PIX">PIX Corporativo</option>
                  <option value="TED">Transferência TED</option>
                  <option value="DEBITO_CONTA">Débito Automático</option>
                  <option value="RATEIO">Compensação em Conta</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Saldo Restante Projetado
                </label>
                <div className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#1a1a20] border border-slate-200 dark:border-[#2e2e38] text-slate-800 dark:text-slate-200">
                  {MoneyUtils.formatBRL(resultingBalanceCents)}
                </div>
              </div>
            </div>

            {/* Feedback de Erro */}
            {errorMessage && (
              <div 
                role="alert" 
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Rodapé com Botão com Estados Explícitos */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#26262B] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={executionState === 'loading'}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#33333D] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202026] transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={executionState === 'loading' || computedPayAmountCents <= 0}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-xs flex items-center gap-2 ${
                  executionState === 'success'
                    ? 'bg-emerald-600'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500'
                } ${executionState === 'loading' || computedPayAmountCents <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {executionState === 'loading' && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                )}
                {executionState === 'success' && (
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {executionState === 'idle' && 'Confirmar Pagamento'}
                  {executionState === 'loading' && 'A processar baixa...'}
                  {executionState === 'success' && 'Baixa Concluída!'}
                  {executionState === 'error' && 'Tentar Novamente'}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
