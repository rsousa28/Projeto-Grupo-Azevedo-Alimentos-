import { DREData, Metric, ProductPerformance, Insumo } from '../types';

export const mockMetrics: Metric[] = [
  { label: 'Faturamento Total', valor: 125430.00, change: 12.5, trend: 'up', format: 'currency' },
  { label: 'Lucro Líquido', valor: 32240.00, change: 8.2, trend: 'up', format: 'currency' },
  { label: 'CMV Médio', valor: 32.4, change: -2.1, trend: 'down', format: 'percent' },
  { label: 'Ticket Médio', valor: 68.50, change: 5.4, trend: 'up', format: 'currency' },
  { label: 'Pedidos Totais', valor: 1831, change: 15.2, trend: 'up', format: 'number' },
  { label: 'Margem Operac.', valor: 25.7, change: 3.1, trend: 'up', format: 'percent' },
];

export const metaVsRealizado = [
  { name: 'Meta', valor: 140000, color: '#8884d8' },
  { name: 'Realizado', valor: 125430, color: '#0066FF' },
];

export const salesByHour = [
  { hour: '11h', vendas: 45 },
  { hour: '12h', vendas: 120 },
  { hour: '13h', vendas: 85 },
  { hour: '14h', vendas: 40 },
  { hour: '17h', vendas: 55 },
  { hour: '18h', vendas: 150 },
  { hour: '19h', vendas: 280 },
  { hour: '20h', vendas: 340 },
  { hour: '21h', vendas: 410 },
  { hour: '22h', vendas: 290 },
  { hour: '23h', vendas: 110 },
];

export const salesByDay = [
  { day: 'Seg', valor: 8500 },
  { day: 'Ter', valor: 9200 },
  { day: 'Qua', valor: 12400 },
  { day: 'Qui', valor: 15600 },
  { day: 'Sex', valor: 24500 },
  { day: 'Sáb', valor: 32100 },
  { day: 'Dom', valor: 23130 },
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
  { month: 'Janeiro', faturamento: 110000, receitaBalcao: 49500, receitaDelivery: 60500, receitaIfood: 45000, receitaWedo: 15500, taxes: 6600, cmv: 35000, payroll: 22000, royalties: 5500, rent: 8000, marketing: 3000, operational: 5000, ebitda: 24900, netProfit: 19900, quantidadePedidos: 1650 },
  { month: 'Fevereiro', faturamento: 115000, receitaBalcao: 51750, receitaDelivery: 63250, receitaIfood: 48000, receitaWedo: 15250, taxes: 6900, cmv: 36000, payroll: 22000, royalties: 5750, rent: 8000, marketing: 3000, operational: 5000, ebitda: 28350, netProfit: 23350, quantidadePedidos: 1720 },
  { month: 'Março', faturamento: 125430, receitaBalcao: 56443, receitaDelivery: 68987, receitaIfood: 52000, receitaWedo: 16987, taxes: 7525, cmv: 40600, payroll: 22000, royalties: 6271, rent: 8000, marketing: 4000, operational: 5500, ebitda: 31534, netProfit: 32240, quantidadePedidos: 1831 },
];

export const topProducts: ProductPerformance[] = [
  { id: '1', name: 'Pizza Calabresa G', category: 'Pizzas', quantidadeVendas: 450, faturamento: 26550, margin: 68, cmv: 12.50 },
  { id: '2', name: 'Burger Artesanal Duo', category: 'Lanches', quantidadeVendas: 380, faturamento: 18240, margin: 62, cmv: 14.80 },
  { id: '3', name: 'Combo Casal 4E', category: 'Combos', quantidadeVendas: 290, faturamento: 25810, margin: 58, cmv: 35.00 },
  { id: '4', name: 'Pizza Frango Catupiry', category: 'Pizzas', quantidadeVendas: 210, faturamento: 14490, margin: 65, cmv: 15.20 },
];

export const inventoryItems: Insumo[] = [
  { id: '1', name: 'Farinha de Trigo Especial', unit: 'kg', stock: 120, minStock: 50, price: 4.50, supplier: 'Moinho Real' },
  { id: '2', name: 'Queijo Muçarela', unit: 'kg', stock: 45, minStock: 60, price: 32.90, supplier: 'Laticínios Vale' },
  { id: '3', name: 'Tomate Pelado Italian', unit: 'un', stock: 180, minStock: 100, price: 8.90, supplier: 'Distribuidora Food' },
];

export const deliveryChannels = [
  { name: 'iFood', valor: 65400, color: '#EA1D2C' },
  { name: 'WEDO', valor: 31830, color: '#0066FF' },
  { name: 'Balcão', valor: 28200, color: '#FFB800' },
];
