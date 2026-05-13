import { DREData, Metric, ProductPerformance, Insumo } from '../types';

export const mockMetrics: Metric[] = [
  { label: 'Faturamento Total', value: 125430.00, change: 12.5, trend: 'up', format: 'currency' },
  { label: 'Lucro Líquido', value: 32240.00, change: 8.2, trend: 'up', format: 'currency' },
  { label: 'CMV Médio', value: 32.4, change: -2.1, trend: 'down', format: 'percent' },
  { label: 'Ticket Médio', value: 68.50, change: 5.4, trend: 'up', format: 'currency' },
  { label: 'Pedidos Totais', value: 1831, change: 15.2, trend: 'up', format: 'number' },
  { label: 'Margem Operac.', value: 25.7, change: 3.1, trend: 'up', format: 'percent' },
];

export const metaVsRealizado = [
  { name: 'Meta', value: 140000, color: '#8884d8' },
  { name: 'Realizado', value: 125430, color: '#0066FF' },
];

export const salesByHour = [
  { hour: '11h', sales: 45 },
  { hour: '12h', sales: 120 },
  { hour: '13h', sales: 85 },
  { hour: '14h', sales: 40 },
  { hour: '17h', sales: 55 },
  { hour: '18h', sales: 150 },
  { hour: '19h', sales: 280 },
  { hour: '20h', sales: 340 },
  { hour: '21h', sales: 410 },
  { hour: '22h', sales: 290 },
  { hour: '23h', sales: 110 },
];

export const salesByDay = [
  { day: 'Seg', value: 8500 },
  { day: 'Ter', value: 9200 },
  { day: 'Qua', value: 12400 },
  { day: 'Qui', value: 15600 },
  { day: 'Sex', value: 24500 },
  { day: 'Sáb', value: 32100 },
  { day: 'Dom', value: 23130 },
];

export const mostProfitable = [
  { name: 'Pizza Calabresa G', profit: 18.00, margin: 68 },
  { name: 'Combo Casal 4E', profit: 14.50, margin: 58 },
  { name: 'Burger Bebelu Real', profit: 12.20, margin: 62 },
];

export const lowMarginProducts = [
  { name: 'Refrigerante Lata', margin: 15, status: 'crítico' },
  { name: 'Batata Frita P', margin: 22, status: 'atenção' },
  { name: 'Adicional de Bacon', margin: 18, status: 'crítico' },
];

export const dreTimeline: DREData[] = [
  { month: 'Jan', revenue: 110000, taxes: 6600, cmv: 35000, payroll: 22000, royalties: 5500, rent: 8000, marketing: 3000, operational: 5000, ebitda: 24900, netProfit: 19900 },
  { month: 'Fev', revenue: 115000, taxes: 6900, cmv: 36000, payroll: 22000, royalties: 5750, rent: 8000, marketing: 3000, operational: 5000, ebitda: 28350, netProfit: 23350 },
  { month: 'Mar', revenue: 125430, taxes: 7525, cmv: 40600, payroll: 22000, royalties: 6271, rent: 8000, marketing: 4000, operational: 5500, ebitda: 31534, netProfit: 32240 },
];

export const topProducts: ProductPerformance[] = [
  { id: '1', name: 'Pizza Calabresa G', category: 'Pizzas', salesCount: 450, revenue: 26550, margin: 68, cmv: 12.50 },
  { id: '2', name: 'Burger Artesanal Duo', category: 'Lanches', salesCount: 380, revenue: 18240, margin: 62, cmv: 14.80 },
  { id: '3', name: 'Combo Casal 4E', category: 'Combos', salesCount: 290, revenue: 25810, margin: 58, cmv: 35.00 },
  { id: '4', name: 'Pizza Frango Catupiry', category: 'Pizzas', salesCount: 210, revenue: 14490, margin: 65, cmv: 15.20 },
];

export const inventoryItems: Insumo[] = [
  { id: '1', name: 'Farinha de Trigo Especial', unit: 'kg', stock: 120, minStock: 50, price: 4.50, supplier: 'Moinho Real' },
  { id: '2', name: 'Queijo Muçarela', unit: 'kg', stock: 45, minStock: 60, price: 32.90, supplier: 'Laticínios Vale' },
  { id: '3', name: 'Tomate Pelado Italian', unit: 'un', stock: 180, minStock: 100, price: 8.90, supplier: 'Distribuidora Food' },
];

export const deliveryChannels = [
  { name: 'iFood', value: 65400, color: '#EA1D2C' },
  { name: 'Balcão', value: 28200, color: '#1E1E1E' },
  { name: 'App Próprio', value: 31830, color: '#D4A373' },
];
