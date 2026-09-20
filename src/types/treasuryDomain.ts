/**
 * Domain-Driven Design (DDD) & Strict Type Definitions
 * Módulo de Gestão de Passivos, Liquidações e Obrigações Financeiras Multiloja/Holding.
 */

// 1. Identificadores de Entidade Fortemente Tipados
export type EntityId = 'B32' | 'B28' | 'VERO' | 'HOLDING' | string;

export interface FinancialEntityRef {
  readonly id: EntityId;
  readonly code: string;
  readonly name: string;
  readonly isClosed?: boolean;
}

// 2. Tipo Monetário Inteiro em Centavos (Prevenção de Floating Point Inaccuracy)
export type Cents = number; // Inteiro (ex: R$ 1.500,50 -> 150050)

export const MoneyUtils = {
  fromFloat: (amount: number): Cents => Math.round(amount * 100),
  toFloat: (cents: Cents): number => cents / 100,
  formatBRL: (cents: Cents): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  },
  parseInputToCents: (val: string | number): Cents => {
    if (typeof val === 'number') return Math.round(val * 100);
    const cleaned = val.replace(/[^\d]/g, '');
    return parseInt(cleaned || '0', 10);
  }
};

// 3. Tipos de Categoria e Modalidade de Acordo
export type LiabilityDomainCategory = 
  | 'TRIBUTARIO'
  | 'TRABALHISTA'
  | 'FORNECEDOR'
  | 'LOCACAO'
  | 'BANCARIO'
  | 'ENCERRAMENTO_LOJA'
  | 'OUTROS';

// 4. União Discriminada (Discriminated Union) para Estados do Ciclo de Vida da Obrigação
interface BaseLiabilityRecord {
  readonly id: string;
  readonly debtorEntityId: EntityId; // Entidade Originadora que gerou o passivo (ex: Loja Encerrada, B28, B32)
  readonly category: LiabilityDomainCategory | string;
  readonly creditor: string;
  readonly principalCents: Cents; // Valor original total contratado
  readonly createdAtIso: string;
  readonly notes?: string;
  readonly agreementDocumentNumber?: string;
}

// Estado: Ativo Pendente (Em Dia ou Aguardando Liquidação)
export interface PendingLiabilityRecord extends BaseLiabilityRecord {
  readonly status: 'PENDING';
  readonly outstandingBalanceCents: Cents; // Saldo devedor restante (> 0)
  readonly installmentMonthlyCents: Cents; // Parcela mensal esperada
  readonly installmentsRemaining: number; // Quantidade de parcelas pendentes
  readonly dueDay: number; // Dia de vencimento (1 a 31)
  readonly payerEntityId: EntityId; // Entidade atribuída para pagamento corrente
}

// Estado: Em Atraso / Notificação Crítica
export interface OverdueLiabilityRecord extends BaseLiabilityRecord {
  readonly status: 'OVERDUE';
  readonly outstandingBalanceCents: Cents;
  readonly installmentMonthlyCents: Cents;
  readonly installmentsRemaining: number;
  readonly dueDay: number;
  readonly daysOverdue: number;
  readonly penaltyInterestCents?: Cents;
  readonly payerEntityId: EntityId;
}

// Estado: Liquidado / Quitado Integralmente
export interface SettledLiabilityRecord extends BaseLiabilityRecord {
  readonly status: 'SETTLED';
  readonly outstandingBalanceCents: 0; // Invariante: Saldo restante é rigorosamente ZERO
  readonly settledAtIso: string; // Data e hora oficial de liquidação
  readonly settlementPayerEntityId: EntityId; // Quem efetivamente pagou a quitação
  readonly settlementReceiptReceiptId: string; // Identificador do comprovativo bancário
  readonly settlementAmountCents: Cents; // Montante efetivo liquidado na baixa final
  readonly settlementMethod: 'PIX' | 'TED' | 'DEBITO_CONTA' | 'RATEIO' | 'COMPENSACAO';
}

// Tipo Geral Discriminated Union
export type TreasuryLiability = 
  | PendingLiabilityRecord 
  | OverdueLiabilityRecord 
  | SettledLiabilityRecord;

// 5. Contrato para Transação de Liquidação / Pagamento com Idempotência
export interface SettleLiabilityPayload {
  readonly liabilityId: string;
  readonly idempotencyKey: string; // UUID v4 para prevenir duplicate posting
  readonly amountCents: Cents;
  readonly payerEntityId: EntityId;
  readonly paymentDateIso: string;
  readonly paymentMethod: 'PIX' | 'TED' | 'DEBITO_CONTA' | 'RATEIO';
  readonly receiptNote?: string;
}

export type PaymentExecutionState = 'idle' | 'loading' | 'success' | 'error';
