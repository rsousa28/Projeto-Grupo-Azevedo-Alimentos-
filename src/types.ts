
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
}

export interface Metric {
  label: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percent' | 'number';
}

export interface DREData {
  month: string;
  revenue: number;
  taxes: number;
  cmv: number;
  payroll: number;
  royalties: number;
  rent: number;
  marketing: number;
  operational: number;
  ebitda: number;
  netProfit: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  salesCount: number;
  revenue: number;
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
