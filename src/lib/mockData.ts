import { DREData, Metric, ProductPerformance, Insumo } from '../types';

export const mockMetrics: Metric[] = [
  { label: 'Faturamento Total', valor: 0, change: 0, trend: 'neutral', format: 'currency' },
  { label: 'Lucro Líquido', valor: 0, change: 0, trend: 'neutral', format: 'currency' },
  { label: 'CMV Médio', valor: 0, change: 0, trend: 'neutral', format: 'percent' },
  { label: 'Ticket Médio', valor: 0, change: 0, trend: 'neutral', format: 'currency' },
  { label: 'Pedidos Totais', valor: 0, change: 0, trend: 'neutral', format: 'number' },
  { label: 'Margem Operac.', valor: 0, change: 0, trend: 'neutral', format: 'percent' },
];

export const metaVsRealizado = [
  { name: 'Meta', valor: 0, color: '#8884d8' },
  { name: 'Realizado', valor: 0, color: '#0066FF' },
];

export const salesByHour = [
  { hour: '11h', vendas: 0 },
  { hour: '12h', vendas: 0 },
  { hour: '13h', vendas: 0 },
  { hour: '14h', vendas: 0 },
  { hour: '17h', vendas: 0 },
  { hour: '18h', vendas: 0 },
  { hour: '19h', vendas: 0 },
  { hour: '20h', vendas: 0 },
  { hour: '21h', vendas: 0 },
  { hour: '22h', vendas: 0 },
  { hour: '23h', vendas: 0 },
];

export const salesByDay = [
  { day: 'Seg', valor: 0 },
  { day: 'Ter', valor: 0 },
  { day: 'Qua', valor: 0 },
  { day: 'Qui', valor: 0 },
  { day: 'Sex', valor: 0 },
  { day: 'Sáb', valor: 0 },
  { day: 'Dom', valor: 0 },
];

export const mostProfitable = [];

export const lowMarginProducts = [];

export const dreTimeline: DREData[] = [];

export const topProducts: ProductPerformance[] = [];

export const inventoryItems: Insumo[] = [];

export const deliveryChannels = [
  { name: 'iFood', valor: 0, color: '#EA1D2C' },
  { name: 'WEDO', valor: 0, color: '#0066FF' },
  { name: 'Balcão', valor: 0, color: '#FFB800' },
];
