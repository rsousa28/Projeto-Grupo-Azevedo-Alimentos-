import { useMemo, useState, useCallback } from 'react';
import { StoreLiability } from '../types/holding';
import { 
  TreasuryLiability, 
  Cents, 
  MoneyUtils, 
  SettleLiabilityPayload,
  PendingLiabilityRecord,
  OverdueLiabilityRecord,
  SettledLiabilityRecord
} from '../types/treasuryDomain';
import { HoldingStorage } from '../services/holdingStorage';

/**
 * Custom Hook para conversão bidirecional entre o modelo de persistência 
 * e o Modelo de Domínio Rico (DDD com Discriminated Unions e Centavos).
 */
export function useTreasuryLiabilities(rawLiabilities: StoreLiability[], onDataChanged: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Adaptação dos dados de persistência para o Domínio Tipado Estrito
  const domainLiabilities = useMemo<TreasuryLiability[]>(() => {
    return rawLiabilities.map((item): TreasuryLiability => {
      const balanceCents: Cents = MoneyUtils.fromFloat(item.totalAmount);
      const isSettled = item.status === 'Quitado' || balanceCents <= 0;

      if (isSettled) {
        const settledRecord: SettledLiabilityRecord = {
          id: item.id,
          debtorEntityId: item.unit,
          category: item.category,
          creditor: item.creditor,
          principalCents: MoneyUtils.fromFloat(item.totalAmount + (item.lastPaymentAmount || 0)),
          createdAtIso: item.createdAt,
          notes: item.notes,
          status: 'SETTLED',
          outstandingBalanceCents: 0,
          settledAtIso: item.lastPaymentDate || new Date().toISOString(),
          settlementPayerEntityId: item.payerResponsibility || item.unit,
          settlementReceiptReceiptId: `REC-${item.id.slice(0, 8).toUpperCase()}`,
          settlementAmountCents: MoneyUtils.fromFloat(item.lastPaymentAmount || item.totalAmount),
          settlementMethod: 'PIX',
        };
        return settledRecord;
      }

      if (item.status === 'Atrasado') {
        const overdueRecord: OverdueLiabilityRecord = {
          id: item.id,
          debtorEntityId: item.unit,
          category: item.category,
          creditor: item.creditor,
          principalCents: balanceCents,
          createdAtIso: item.createdAt,
          notes: item.notes,
          status: 'OVERDUE',
          outstandingBalanceCents: balanceCents,
          installmentMonthlyCents: MoneyUtils.fromFloat(item.monthlyPayment || 0),
          installmentsRemaining: item.installmentsRemaining ?? 1,
          dueDay: item.dueDay ?? 10,
          daysOverdue: 15, // Simulação prudencial
          payerEntityId: item.payerResponsibility || item.unit,
        };
        return overdueRecord;
      }

      const pendingRecord: PendingLiabilityRecord = {
        id: item.id,
        debtorEntityId: item.unit,
        category: item.category,
        creditor: item.creditor,
        principalCents: balanceCents,
        createdAtIso: item.createdAt,
        notes: item.notes,
        status: 'PENDING',
        outstandingBalanceCents: balanceCents,
        installmentMonthlyCents: MoneyUtils.fromFloat(item.monthlyPayment || 0),
        installmentsRemaining: item.installmentsRemaining ?? 1,
        dueDay: item.dueDay ?? 10,
        payerEntityId: item.payerResponsibility || item.unit,
      };
      return pendingRecord;
    });
  }, [rawLiabilities]);

  // Ação com Idempotência e Tratamento de Erros
  const executeSettlement = useCallback(async (payload: SettleLiabilityPayload): Promise<boolean> => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Conversão segura de Cents para o serviço de persistência
      const floatAmount = MoneyUtils.toFloat(payload.amountCents);
      
      HoldingStorage.payLiability(payload.liabilityId, floatAmount, {
        paymentDate: payload.paymentDateIso,
        payerAccount: payload.payerEntityId,
        notes: `[IdempotencyKey: ${payload.idempotencyKey}] Método: ${payload.paymentMethod}. ${payload.receiptNote || ''}`
      });

      onDataChanged();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na execução da baixa da obrigação.';
      setSubmissionError(msg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [onDataChanged]);

  return {
    domainLiabilities,
    isSubmitting,
    submissionError,
    executeSettlement,
  };
}
