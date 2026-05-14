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
  { 
    month: 'Janeiro', 
    faturamento: 110000, 
    receitaBalcao: 49500, 
    receitaDelivery: 60500, 
    receitaIfood: 45000, 
    receitaWedo: 15500, 
    taxes: 6600, 
    cmv: 35000, 
    cmvBalcao: 14000,
    cmvDelivery: 21000,
    payroll: 22000, 
    royalties: 5500, 
    rent: 8000, 
    marketing: 3000, 
    operational: 5000, 
    ebitda: 24900, 
    netProfit: 19900, 
    quantidadePedidos: 1650,
    despesasVariaveis: 12000,
    resultadoFinanceiro: 1500,
    details: {
      deducoes: { darfSimples: 6600 },
      cmvDetailed: { balcao: 14000, delivery: 21000 },
      despesasVariaveis: { taxaCartao: 2200, taxaMotoqueiro: 3000, taxaIfood: 4500, royalties: 2300 },
      colaboradores: { salarios: 15000, encargos: 4000, beneficios: 3000 },
      funcionamento: { aluguel: 6000, energia: 2000 },
      administrativas: { contabilidade: 800, limpeza: 500 }
    }
  },
  { 
    month: 'Fevereiro', 
    faturamento: 115000, 
    receitaBalcao: 51750, 
    receitaDelivery: 63250, 
    receitaIfood: 48000, 
    receitaWedo: 15250, 
    taxes: 6900, 
    cmv: 36000, 
    cmvBalcao: 14400,
    cmvDelivery: 21600,
    payroll: 22000, 
    royalties: 5750, 
    rent: 8000, 
    marketing: 3000, 
    operational: 5000, 
    ebitda: 28350, 
    netProfit: 23350, 
    quantidadePedidos: 1720,
    despesasVariaveis: 12500,
    resultadoFinanceiro: 1600,
    details: {
      deducoes: { darfSimples: 6900 },
      cmvDetailed: { balcao: 14400, delivery: 21600 },
      despesasVariaveis: { taxaCartao: 2300, taxaMotoqueiro: 3100, taxaIfood: 4700, royalties: 2400 },
      colaboradores: { salarios: 15000, encargos: 4000, beneficios: 3000 },
      funcionamento: { aluguel: 6000, energia: 2000 }
    }
  },
  { 
    month: 'Março', 
    faturamento: 125430, 
    receitaBalcao: 56443, 
    receitaDelivery: 68987, 
    receitaIfood: 52000, 
    receitaWedo: 16987, 
    taxes: 7525, 
    cmv: 40600, 
    cmvBalcao: 16240,
    cmvDelivery: 24360,
    payroll: 22000, 
    royalties: 6271, 
    rent: 8000, 
    marketing: 4000, 
    operational: 5500, 
    ebitda: 31534, 
    netProfit: 32240, 
    quantidadePedidos: 1831,
    despesasVariaveis: 13500,
    resultadoFinanceiro: 1700,
    details: {
      deducoes: { darfSimples: 7525 },
      cmvDetailed: { balcao: 16240, delivery: 24360 },
      despesasVariaveis: { taxaCartao: 2500, taxaMotoqueiro: 3200, taxaIfood: 5600, royalties: 2200 },
      colaboradores: { salarios: 15000, encargos: 4000, beneficios: 3000 },
      funcionamento: { aluguel: 6000, energia: 2000 }
    }
  },
];

export const topProducts: ProductPerformance[] = [];

export const inventoryItems: Insumo[] = [];

export const deliveryChannels = [
  { name: 'iFood', valor: 65400, color: '#EA1D2C' },
  { name: 'WEDO', valor: 31830, color: '#0066FF' },
  { name: 'Balcão', valor: 28200, color: '#FFB800' },
];
