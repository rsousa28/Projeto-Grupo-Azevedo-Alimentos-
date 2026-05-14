
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'FINANCIAL';
}

export interface Store {
  id: string;
  name: string;
  brand: '4ESTYLOS' | 'BEBELU';
  location: string;
  code?: string;
}

export interface Metric {
  label: string;
  valor: number | string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percent' | 'number';
}

export interface DREData {
  month: string;
  faturamento: number;
  receitaBalcao?: number;
  receitaDelivery?: number;
  receitaIfood?: number;
  receitaWedo?: number;
  taxes: number;
  cmv: number;
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
  
  // Detailed breakdown breakdown
  details?: {
    deducoes?: Record<string, number>;
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
}

export interface Insumo {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
}
