
export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'FINANCIAL' | 'MANAGER_BEBELU_MOSSORO' | 'MANAGER_BEBELU_RIOMAR_PAPICU' | 'MANAGER_VERO_PASTA';
  password?: string;
  biometricEnabled?: boolean;
}

export type UnitType = 'STORE' | 'HOLDING';

export interface Unit {
  id: string;
  name: string;
  code: string;
  brand: 'BEBELU' | 'VERO PASTA' | 'GRUPO AZEVEDO' | string;
  location: string;
  type: UnitType;
  subtitle?: string;
  isCorporate?: boolean;
}

// Store alias to preserve full backward compatibility across the entire system
export type Store = Unit;

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  allowedRoles?: User['role'][];
  description?: string;
  type?: UnitType;
}

export interface Metric {
  label: string;
  valor: number | string;
  change: number | string;
  trend: 'up' | 'down' | 'neutral' | string;
  format: 'currency' | 'percent' | 'number';
}

export interface DREData {
  month: string;
  year?: string;
  faturamento: number;
  metaFaturamento?: number;
  metaNps?: number;
  cmvAlvo?: number;
  tempoMedio?: number;
  avaliacaoIfood?: number;
  receitaBalcao?: number;
  receitaDelivery?: number;
  receitaIfood?: number;
  receitaWedo?: number;
  taxes: number;
  cmv: number;
  cmvBalcao?: number;
  cmvDelivery?: number;
  payroll: number;
  royalties: number;
  rent: number;
  marketing: number;
  operational: number;
  ebitda: number;
  netProfit: number;
  quantidadePedidos?: number;
  yearlyHistory?: Record<string, number>;
  // Sub-totals for the detailed model
  despesasVariaveis?: number;
  resultadoFinanceiro?: number;
  entradasNaoOperacionais?: number | Record<string, number>;
  saidasNaoOperacionais?: number | Record<string, number>;
  resultadoFinalCaixa?: number;
  
  // Detailed breakdown
  details?: {
    deducoes?: Record<string, number>;
    cmvDetailed?: Record<string, number>;
    despesasVariaveis?: Record<string, number>;
    colaboradores?: Record<string, number>;
    funcionamento?: Record<string, number>;
    manutencao?: Record<string, number>;
    comerciais?: Record<string, number>;
    administrativas?: Record<string, number>;
    resultadoFinanceiro?: Record<string, number>;
    entradasNaoOperacionais?: Record<string, number>;
    saidasNaoOperacionais?: Record<string, number>;
    griFinal?: number;
    salesByHour?: Record<string, number>;
    marketingCampaigns?: {
      pedidosPromocao: number;
      pedidosMaisDeUmaPromo?: number;
      vendasValor: number;
      investidoLoja: number;
      investidoPlataforma?: number;
    };
  };
}

export interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  quantidadeVendas: number;
  faturamento: number;
  margin: number;
  cmv: number;
  active?: boolean;
}

export interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  value: number;
  status: 'PENDING' | 'CONFIRMED';
  paymentMethod: string;
  storeId?: string;
}

export interface Insumo {
  id: string;
  name: string;
  unit: string;
  price: number;
  supplier: string;
}

export interface AccountPayable {
  id: string;
  storeId: string;
  storeName: string;
  supplier: string;
  description: string;
  category: string;
  costCenter: string;
  value: number;
  interest: number;
  fine: number;
  discount: number;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod: string;
  bank: string;
  barcode?: string;
  documentNumber?: string;
  notes?: string;
  status: 'Pendente' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Cancelado' | 'Agendado';
  recurrence: 'Nenhuma' | 'Semanal' | 'Mensal' | 'Anual' | 'Personalizado';
  installmentsCount?: number;
  installmentNumber?: number;
  parentGroupId?: string;
  attachedFile?: string; // base64
  receiptFile?: string; // base64
  taxInvoiceFile?: string; // base64
  partialAmountPaid?: number;
  createdAt: string;
}
