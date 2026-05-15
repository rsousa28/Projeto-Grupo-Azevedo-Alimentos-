
export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'MANAGER' | 'FINANCIAL' | 'MANAGER_4ESTYLOS_MOSSORO' | 'MANAGER_BEBELU_MOSSORO' | 'MANAGER_BEBELU_RIOMAR_PAPICU';
  password?: string;
}

export interface Store {
  id: string;
  name: string;
  brand: '4ESTYLOS' | 'BEBELU' | 'GRUPO AZEVEDO';
  location: string;
  code?: string;
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
  // Sub-totals for the detailed model
  despesasVariaveis?: number;
  resultadoFinanceiro?: number;
  
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
    griFinal?: number;
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

export interface Insumo {
  id: string;
  name: string;
  unit: string;
  price: number;
  supplier: string;
}
