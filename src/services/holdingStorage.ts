import { BankLoan, StoreLiability, StoreBenchmark, UnitBinding, StoreOnlyBinding } from '../types/holding';

export const STORE_BENCHMARKS: Record<StoreOnlyBinding, StoreBenchmark> = {
  B32: {
    id: '1',
    code: 'B32',
    name: 'Bebelu Mossoró',
    brand: 'BEBELU SANDUÍCHES',
    location: 'Mossoró - RN',
    monthlyRevenue: 284500,
    ebitda: 45520,
    cmv: 96730,
    margin: 16.0,
    operationalStatus: 'Operação Positiva'
  },
  B28: {
    id: '2',
    code: 'B28',
    name: 'Bebelu Rio Mar',
    brand: 'BEBELU SANDUÍCHES',
    location: 'Fortaleza - CE (Shopping Rio Mar)',
    monthlyRevenue: 241800,
    ebitda: 36270,
    cmv: 84630,
    margin: 15.0,
    operationalStatus: 'Operação Positiva'
  },
  VERO: {
    id: '3',
    code: 'VERO',
    name: 'Vero Pasta',
    brand: 'VERO PASTA ITALIANA',
    location: 'Fortaleza - CE (Aldeota)',
    monthlyRevenue: 198400,
    ebitda: 37690,
    cmv: 59520,
    margin: 19.0,
    operationalStatus: 'Em Expansão'
  }
};

export const INITIAL_BANK_LOANS: BankLoan[] = [
  {
    id: 'LOAN-01',
    bank: 'Santander Empresas',
    modality: 'Capital de Giro Expansão',
    principal: 450000,
    currentBalance: 312000,
    installmentsTotal: 36,
    installmentsPaid: 11,
    monthlyPayment: 15850,
    rate: 'CDI + 2.8% a.a.',
    dueDate: '2026-09-25',
    unit: 'VERO',
    status: 'Em Dia',
    createdAt: '2025-10-15',
    notes: 'Financiamento para estruturação da cozinha italiana e ampliação de salão'
  },
  {
    id: 'LOAN-02',
    bank: 'Banco do Brasil',
    modality: 'PRONAMPE / FCO',
    principal: 300000,
    currentBalance: 245000,
    installmentsTotal: 48,
    installmentsPaid: 9,
    monthlyPayment: 8920,
    rate: 'Selic + 4.5% a.a.',
    dueDate: '2026-09-18',
    unit: 'B32',
    status: 'Em Dia',
    createdAt: '2025-12-01',
    notes: 'Linha subsidiada de investimento para modernização da unidade Mossoró'
  },
  {
    id: 'LOAN-03',
    bank: 'Bradesco Corporate',
    modality: 'Finame / Equipamentos',
    principal: 280000,
    currentBalance: 168000,
    installmentsTotal: 24,
    installmentsPaid: 10,
    monthlyPayment: 13400,
    rate: 'TJLP + 3.1% a.a.',
    dueDate: '2026-09-30',
    unit: 'B28',
    status: 'Em Dia',
    createdAt: '2025-11-20',
    notes: 'Aquisição de fritadeiras industriais e câmara fria para Bebelu Rio Mar'
  },
  {
    id: 'LOAN-04',
    bank: 'Caixa Econômica',
    modality: 'Giro Caixa Rápido',
    principal: 150000,
    currentBalance: 115000,
    installmentsTotal: 24,
    installmentsPaid: 6,
    monthlyPayment: 7200,
    rate: 'CDI + 3.2% a.a.',
    dueDate: '2026-10-05',
    unit: 'HOLDING',
    status: 'Em Dia',
    createdAt: '2026-03-10',
    notes: 'Reserva central de liquidez e apoio aos mútuos da Holding'
  }
];

export const INITIAL_STORE_LIABILITIES: StoreLiability[] = [
  {
    id: 'LIAB-01',
    unit: 'B32',
    category: 'Tributos Parcelados (REFIS/Simples)',
    creditor: 'Receita Federal / PGFN',
    totalAmount: 94000,
    monthlyPayment: 2600,
    installmentsRemaining: 36,
    status: 'Em Dia',
    dueDate: '2026-09-20',
    createdAt: '2026-01-15',
    notes: 'Parcelamento especial Simples Nacional com amortização linear'
  },
  {
    id: 'LIAB-02',
    unit: 'B32',
    category: 'Fornecedores Renegociados',
    creditor: 'Distribuidora Carnes & Pães Nordeste',
    totalAmount: 38000,
    monthlyPayment: 4750,
    installmentsRemaining: 8,
    status: 'Em Dia',
    dueDate: '2026-09-28',
    createdAt: '2026-02-10',
    notes: 'Renegociação de safra de proteína bovina em 8 parcelas'
  },
  {
    id: 'LIAB-03',
    unit: 'B28',
    category: 'Aluguel / Condomínio Pendente',
    creditor: 'Administradora Shopping Rio Mar',
    totalAmount: 52000,
    monthlyPayment: 6500,
    installmentsRemaining: 8,
    status: 'Em Negociação',
    dueDate: '2026-09-22',
    createdAt: '2026-03-01',
    notes: 'Diferencial de ar-condicionado e taxa de condomínio em acordo'
  },
  {
    id: 'LIAB-04',
    unit: 'B28',
    category: 'Tributos Parcelados (REFIS/Simples)',
    creditor: 'SEFAZ / ICMS Parcelado',
    totalAmount: 68000,
    monthlyPayment: 3400,
    installmentsRemaining: 20,
    status: 'Em Dia',
    dueDate: '2026-09-30',
    createdAt: '2025-11-10',
    notes: 'Parcelamento ordinário ICMS Substituição Tributária'
  },
  {
    id: 'LIAB-05',
    unit: 'VERO',
    category: 'Fornecedores Renegociados',
    creditor: 'Importadora Queijos & Vinhos Bella',
    totalAmount: 42000,
    monthlyPayment: 5250,
    installmentsRemaining: 8,
    status: 'Em Dia',
    dueDate: '2026-09-15',
    createdAt: '2026-04-05',
    notes: 'Lote inicial de insumos importados para inauguração'
  },
  {
    id: 'LIAB-06',
    unit: 'VERO',
    category: 'Passivo Trabalhista / Acordos',
    creditor: 'Acordo Homologado 1ª Vara',
    totalAmount: 18000,
    monthlyPayment: 3000,
    installmentsRemaining: 6,
    status: 'Em Dia',
    dueDate: '2026-09-10',
    createdAt: '2026-05-12',
    notes: 'Acordo conciliatório extrajudicial com quitação total'
  }
];

const LOANS_KEY = 'holding_bank_loans_v2';
const LIABILITIES_KEY = 'holding_liabilities_v3';
const CLOSED_STORES_KEY = 'holding_closed_stores_v1';

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

  resetToDefaults() {
    this.saveLoans(INITIAL_BANK_LOANS);
    this.saveLiabilities(INITIAL_STORE_LIABILITIES);
    this.saveClosedStores(INITIAL_CLOSED_STORES);
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
