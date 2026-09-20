import { BankLoan, StoreLiability, StoreBenchmark, UnitBinding, StoreOnlyBinding, InvestmentProject } from '../types/holding';

export const DEFAULT_STORE_BENCHMARKS: Record<StoreOnlyBinding, StoreBenchmark> = {
  B32: {
    id: '1',
    code: 'B32',
    name: 'Bebelu Mossoró',
    brand: 'BEBELU SANDUÍCHES',
    location: 'Mossoró - RN',
    monthlyRevenue: 0,
    ebitda: 0,
    cmv: 0,
    margin: 0,
    operationalStatus: 'Operação Ativa'
  },
  B28: {
    id: '2',
    code: 'B28',
    name: 'Bebelu Rio Mar',
    brand: 'BEBELU SANDUÍCHES',
    location: 'Fortaleza - CE (Shopping Rio Mar)',
    monthlyRevenue: 0,
    ebitda: 0,
    cmv: 0,
    margin: 0,
    operationalStatus: 'Operação Ativa'
  },
  VERO: {
    id: '3',
    code: 'VERO',
    name: 'Vero Pasta',
    brand: 'VERO PASTA ITALIANA',
    location: 'Fortaleza - CE (Aldeota)',
    monthlyRevenue: 0,
    ebitda: 0,
    cmv: 0,
    margin: 0,
    operationalStatus: 'Em Expansão'
  }
};

export const STORE_BENCHMARKS: Record<StoreOnlyBinding, StoreBenchmark> = DEFAULT_STORE_BENCHMARKS;

// Listas iniciais zeradas para que o usuário inicie o preenchimento do zero
export const INITIAL_BANK_LOANS: BankLoan[] = [];
export const INITIAL_STORE_LIABILITIES: StoreLiability[] = [];
export const INITIAL_INVESTMENTS: InvestmentProject[] = [];

export interface CashBalances {
  holding: number;
  B32: number;
  B28: number;
  VERO: number;
  lastUpdated?: string;
}

export const DEFAULT_CASH_BALANCES: CashBalances = {
  holding: 185000,
  B32: 68400,
  B28: 45200,
  VERO: 56800,
  lastUpdated: new Date().toISOString()
};

const LOANS_KEY = 'holding_bank_loans_v3';
const LIABILITIES_KEY = 'holding_liabilities_v3';
const CLOSED_STORES_KEY = 'holding_closed_stores_v1';
const INVESTMENTS_KEY = 'holding_investments_v3';
const STORES_BENCHMARKS_KEY = 'holding_benchmarks_v3';
const CASH_BALANCES_KEY = 'holding_cash_balances_v2';

/**
 * Sanitiza e sincroniza coerência de dados de projetos de investimento.
 * Regra crítica de negócio: Se o projeto estiver 'Concluído / Inaugurado', o aporte
 * acumulado não pode estar em 0% (sincroniza com o capex previsto de 100%) e a previsão
 * não pode ser 'Em definição' (sincroniza para 'Inaugurado').
 */
export function sanitizeInvestment(inv: InvestmentProject): InvestmentProject {
  const isCompleted = inv.stage === 'Concluído / Inaugurado';
  let spent = Number(inv.spentSoFar) || 0;
  let target = inv.targetLaunch || '';

  if (isCompleted) {
    if (spent <= 0) {
      spent = Number(inv.capexBudget) > 0 ? Number(inv.capexBudget) : 250000;
    }
    if (!target || target.trim() === '' || target.toLowerCase().includes('definição')) {
      target = 'Inaugurado';
    }
  }

  return {
    ...inv,
    spentSoFar: spent,
    targetLaunch: target
  };
}

// Limpeza automática pontual de dados mock antigos em sessões do navegador
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const legacyMigrated = localStorage.getItem('holding_migrated_to_zero_v3');
    if (!legacyMigrated) {
      localStorage.removeItem('holding_bank_loans_v2');
      localStorage.removeItem('holding_investments_v2');
      localStorage.removeItem('holding_closed_stores_v1');
      localStorage.removeItem('holding_benchmarks_v2');
      localStorage.setItem('holding_migrated_to_zero_v3', 'true');
    }
  } catch (e) {
    // ignore
  }
}

export const INITIAL_CLOSED_STORES: string[] = [];

export const HoldingStorage = {
  getLoans(): BankLoan[] {
    try {
      const stored = localStorage.getItem(LOANS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading bank loans:', e);
    }
    return INITIAL_BANK_LOANS;
  },

  saveLoans(loans: BankLoan[]) {
    try {
      localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
    } catch (e) {
      console.error('Error saving bank loans:', e);
    }
  },

  addLoan(newLoan: Omit<BankLoan, 'id' | 'createdAt'>): BankLoan {
    const loans = this.getLoans();
    const created: BankLoan = {
      ...newLoan,
      id: `LOAN-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [created, ...loans];
    this.saveLoans(updated);
    return created;
  },

  updateLoan(id: string, updates: Partial<BankLoan>): BankLoan[] {
    const loans = this.getLoans();
    const updated = loans.map(l => (l.id === id ? { ...l, ...updates } : l));
    this.saveLoans(updated);
    return updated;
  },

  payInstallment(loanId: string): BankLoan[] {
    const loans = this.getLoans();
    const updated = loans.map(l => {
      if (l.id === loanId) {
        const nextPaid = Math.min(l.installmentsTotal, l.installmentsPaid + 1);
        const ratioPaid = nextPaid / l.installmentsTotal;
        const newBalance = Math.max(0, Math.round(l.principal * (1 - ratioPaid)));
        const status: BankLoan['status'] = nextPaid === l.installmentsTotal ? 'Liquidado' : 'Em Dia';
        return {
          ...l,
          installmentsPaid: nextPaid,
          currentBalance: newBalance,
          status
        };
      }
      return l;
    });
    this.saveLoans(updated);
    return updated;
  },

  deleteLoan(id: string): BankLoan[] {
    const loans = this.getLoans();
    const filtered = loans.filter(l => l.id !== id);
    this.saveLoans(filtered);
    return filtered;
  },

  // Liabilities (Outros Passivos)
  getLiabilities(): StoreLiability[] {
    try {
      const stored = localStorage.getItem(LIABILITIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((li: StoreLiability) => 
            !li.unit?.toLowerCase().includes('benfica') && 
            !li.unit?.toLowerCase().includes('north shopping') &&
            !li.unitName?.toLowerCase().includes('benfica') &&
            !li.unitName?.toLowerCase().includes('north shopping')
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(LIABILITIES_KEY, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error('Error loading liabilities:', e);
    }
    return INITIAL_STORE_LIABILITIES;
  },

  saveLiabilities(liabilities: StoreLiability[]) {
    try {
      localStorage.setItem(LIABILITIES_KEY, JSON.stringify(liabilities));
    } catch (e) {
      console.error('Error saving liabilities:', e);
    }
  },

  addLiability(newLiab: Omit<StoreLiability, 'id' | 'createdAt'>): StoreLiability {
    const liabs = this.getLiabilities();
    const created: StoreLiability = {
      ...newLiab,
      id: `LIAB-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [created, ...liabs];
    this.saveLiabilities(updated);
    return created;
  },

  updateLiability(id: string, updates: Partial<StoreLiability>): StoreLiability[] {
    const liabs = this.getLiabilities();
    const updated = liabs.map(li => (li.id === id ? { ...li, ...updates } : li));
    this.saveLiabilities(updated);
    return updated;
  },

  payLiability(
    id: string,
    amountPaid: number,
    options?: {
      isFullSettlement?: boolean;
      decrementInstallment?: boolean;
      paymentDate?: string;
      payerAccount?: string;
      notes?: string;
    }
  ): StoreLiability[] {
    const liabs = this.getLiabilities();
    const updated = liabs.map(li => {
      if (li.id === id) {
        const isFull = options?.isFullSettlement || amountPaid >= li.totalAmount;
        const newTotal = isFull ? 0 : Math.max(0, Math.round((li.totalAmount - amountPaid) * 100) / 100);
        const newStatus: StoreLiability['status'] = newTotal <= 0 ? 'Quitado' : 'Em Dia';

        let newInstallments = li.installmentsRemaining;
        if (isFull) {
          newInstallments = 0;
        } else if (options?.decrementInstallment && newInstallments && newInstallments > 0) {
          newInstallments = Math.max(0, newInstallments - 1);
        }

        const dateStr = options?.paymentDate || new Date().toISOString().split('T')[0];
        const formattedAmount = amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const payerAccountInfo = options?.payerAccount ? ` via ${options.payerAccount}` : '';
        const customNote = options?.notes?.trim() ? ` (${options.notes.trim()})` : '';
        const logEntry = `[Pago ${formattedAmount} em ${dateStr}${payerAccountInfo}${customNote}]`;
        const updatedNotes = li.notes ? `${li.notes}\n${logEntry}` : logEntry;

        return {
          ...li,
          totalAmount: newTotal,
          status: newStatus,
          installmentsRemaining: newInstallments,
          lastPaymentDate: dateStr,
          lastPaymentAmount: amountPaid,
          notes: updatedNotes
        };
      }
      return li;
    });
    this.saveLiabilities(updated);
    return updated;
  },

  deleteLiability(id: string): StoreLiability[] {
    const liabs = this.getLiabilities();
    const filtered = liabs.filter(li => li.id !== id);
    this.saveLiabilities(filtered);
    return filtered;
  },

  // Closed Stores list
  getClosedStores(): string[] {
    try {
      const stored = localStorage.getItem(CLOSED_STORES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove mock stores that the user never had
          const filtered = parsed.filter(
            (s: string) => !s.toLowerCase().includes('benfica') && !s.toLowerCase().includes('north shopping')
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(CLOSED_STORES_KEY, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error('Error loading closed stores:', e);
    }
    return INITIAL_CLOSED_STORES;
  },

  saveClosedStores(stores: string[]) {
    try {
      localStorage.setItem(CLOSED_STORES_KEY, JSON.stringify(stores));
    } catch (e) {
      console.error('Error saving closed stores:', e);
    }
  },

  addClosedStore(storeName: string): string[] {
    const trimmed = storeName.trim();
    if (!trimmed) return this.getClosedStores();
    const formatted = trimmed.includes('[ENCERRADA]') ? trimmed : `${trimmed} [ENCERRADA]`;
    const list = this.getClosedStores();
    if (!list.includes(formatted)) {
      const updated = [...list, formatted];
      this.saveClosedStores(updated);
      return updated;
    }
    return list;
  },

  removeClosedStore(storeName: string): string[] {
    const list = this.getClosedStores();
    const updated = list.filter(s => s !== storeName);
    this.saveClosedStores(updated);
    return updated;
  },

  // Expansion & Investment Projects
  getInvestments(): InvestmentProject[] {
    try {
      const stored = localStorage.getItem(INVESTMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Garante sanitização e coerência para todos os projetos salvos
          return parsed.map(sanitizeInvestment);
        }
      }
    } catch (e) {
      console.error('Error loading investment projects:', e);
    }
    return INITIAL_INVESTMENTS.map(sanitizeInvestment);
  },

  saveInvestments(investments: InvestmentProject[]) {
    try {
      const sanitized = investments.map(sanitizeInvestment);
      localStorage.setItem(INVESTMENTS_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.error('Error saving investment projects:', e);
    }
  },

  addInvestment(newInv: Omit<InvestmentProject, 'id' | 'createdAt'>): InvestmentProject {
    const list = this.getInvestments();
    const createdRaw: InvestmentProject = {
      ...newInv,
      id: `INV-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    const created = sanitizeInvestment(createdRaw);
    const updated = [created, ...list];
    this.saveInvestments(updated);
    return created;
  },

  updateInvestment(id: string, updates: Partial<InvestmentProject>): InvestmentProject[] {
    const list = this.getInvestments();
    const updated = list.map(inv => {
      if (inv.id === id) {
        return sanitizeInvestment({ ...inv, ...updates });
      }
      return inv;
    });
    this.saveInvestments(updated);
    return updated;
  },

  addContribution(id: string, additionalAmount: number): InvestmentProject[] {
    const list = this.getInvestments();
    const updated = list.map(inv => {
      if (inv.id === id) {
        const newSpent = Math.max(0, inv.spentSoFar + additionalAmount);
        return sanitizeInvestment({
          ...inv,
          spentSoFar: newSpent
        });
      }
      return inv;
    });
    this.saveInvestments(updated);
    return updated;
  },

  deleteInvestment(id: string): InvestmentProject[] {
    const list = this.getInvestments();
    const filtered = list.filter(inv => inv.id !== id);
    this.saveInvestments(filtered);
    return filtered;
  },

  // Gestão de Saldos em Caixa (Holding + Lojas)
  getCashBalances(): CashBalances {
    try {
      const stored = localStorage.getItem(CASH_BALANCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_CASH_BALANCES,
            ...parsed
          };
        }
      }
    } catch (e) {
      console.error('Error loading cash balances:', e);
    }
    return DEFAULT_CASH_BALANCES;
  },

  saveCashBalances(balances: CashBalances): CashBalances {
    try {
      const payload: CashBalances = {
        ...balances,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(CASH_BALANCES_KEY, JSON.stringify(payload));
      return payload;
    } catch (e) {
      console.error('Error saving cash balances:', e);
      return balances;
    }
  },

  updateCashBalance(key: keyof CashBalances, value: number): CashBalances {
    const current = this.getCashBalances();
    const updated = {
      ...current,
      [key]: Math.max(0, value)
    };
    return this.saveCashBalances(updated);
  },

  // Store Benchmarks & Metas
  getStoreBenchmarks(): Record<StoreOnlyBinding, StoreBenchmark> {
    try {
      const stored = localStorage.getItem(STORES_BENCHMARKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_STORE_BENCHMARKS,
            ...parsed
          };
        }
      }
    } catch (e) {
      console.error('Error loading store benchmarks:', e);
    }
    return DEFAULT_STORE_BENCHMARKS;
  },

  saveStoreBenchmarks(benchmarks: Record<StoreOnlyBinding, StoreBenchmark>) {
    try {
      localStorage.setItem(STORES_BENCHMARKS_KEY, JSON.stringify(benchmarks));
    } catch (e) {
      console.error('Error saving store benchmarks:', e);
    }
  },

  updateStoreBenchmark(code: StoreOnlyBinding, updates: Partial<StoreBenchmark>): Record<StoreOnlyBinding, StoreBenchmark> {
    const current = this.getStoreBenchmarks();
    const existing = current[code] || DEFAULT_STORE_BENCHMARKS[code];
    const newRevenue = updates.monthlyRevenue !== undefined ? updates.monthlyRevenue : existing.monthlyRevenue;
    const newEbitda = updates.ebitda !== undefined ? updates.ebitda : existing.ebitda;
    const newCmv = updates.cmv !== undefined ? updates.cmv : existing.cmv;
    const newMargin = newRevenue > 0 ? (newEbitda / newRevenue) * 100 : 0;

    const updated: Record<StoreOnlyBinding, StoreBenchmark> = {
      ...current,
      [code]: {
        ...existing,
        ...updates,
        monthlyRevenue: newRevenue,
        ebitda: newEbitda,
        cmv: newCmv,
        margin: newMargin
      }
    };
    this.saveStoreBenchmarks(updated);
    return updated;
  },

  clearAllHoldingData() {
    this.saveLoans([]);
    this.saveLiabilities([]);
    this.saveInvestments([]);
    this.saveClosedStores([]);
    this.saveStoreBenchmarks(DEFAULT_STORE_BENCHMARKS);
    try {
      localStorage.removeItem(LOANS_KEY);
      localStorage.removeItem(LIABILITIES_KEY);
      localStorage.removeItem(INVESTMENTS_KEY);
      localStorage.removeItem(STORES_BENCHMARKS_KEY);
      localStorage.removeItem('holding_bank_loans_v2');
      localStorage.removeItem('holding_investments_v2');
      localStorage.removeItem('holding_closed_stores_v1');
      localStorage.removeItem('holding_benchmarks_v2');
    } catch (e) {}
  },

  resetToDefaults() {
    this.clearAllHoldingData();
  }
};

export const getUnitLabel = (unit: string, isClosed?: boolean) => {
  if (unit === 'B32') {
    return {
      name: 'B32 (Mossoró)',
      tag: 'B32',
      color: '#10B981',
      badgeBg: 'bg-emerald-500/15',
      textBadge: 'text-emerald-400',
      border: 'border-emerald-500/30',
      type: 'ACTIVE' as const,
      isClosed: false,
      isHolding: false
    };
  }
  if (unit === 'B28') {
    return {
      name: 'B28 (Bebelu Rio Mar)',
      tag: 'B28',
      color: '#10B981',
      badgeBg: 'bg-emerald-500/15',
      textBadge: 'text-emerald-400',
      border: 'border-emerald-500/30',
      type: 'ACTIVE' as const,
      isClosed: false,
      isHolding: false
    };
  }
  if (unit === 'VERO') {
    return {
      name: 'Vero Pasta',
      tag: 'VERO',
      color: '#10B981',
      badgeBg: 'bg-emerald-500/15',
      textBadge: 'text-emerald-400',
      border: 'border-emerald-500/30',
      type: 'ACTIVE' as const,
      isClosed: false,
      isHolding: false
    };
  }
  if (unit === 'HOLDING' || unit.toLowerCase().includes('holding') || unit.toLowerCase().includes('matriz') || unit.toLowerCase().includes('grupo az')) {
    return {
      name: 'Grupo AZ (Holding)',
      tag: 'HOLDING',
      color: '#F59E0B',
      badgeBg: 'bg-amber-500/15',
      textBadge: 'text-amber-400',
      border: 'border-amber-500/30',
      type: 'HOLDING' as const,
      isClosed: false,
      isHolding: true
    };
  }
  // Closed / Encerrada
  return {
    name: unit,
    tag: 'ENCERRADA',
    color: '#EF4444',
    badgeBg: 'bg-red-500/10',
    textBadge: 'text-red-400',
    border: 'border-red-500/25',
    type: 'CLOSED' as const,
    isClosed: true,
    isHolding: false
  };
};

export const UNIT_LABELS: Record<string, { name: string; tag: string; color: string; badgeBg: string; textBadge: string; border: string }> = {
  B32: {
    name: 'Bebelu Mossoró',
    tag: 'B32',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    textBadge: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  B28: {
    name: 'Bebelu Rio Mar',
    tag: 'B28',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    textBadge: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  VERO: {
    name: 'Vero Pasta',
    tag: 'VERO',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    textBadge: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  HOLDING: {
    name: 'Holding Central',
    tag: 'HOLDING',
    color: '#F59E0B',
    badgeBg: 'bg-amber-500/15',
    textBadge: 'text-amber-400',
    border: 'border-amber-500/30'
  }
};
