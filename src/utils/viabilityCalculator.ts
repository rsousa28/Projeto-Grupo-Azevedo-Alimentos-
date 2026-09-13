import { ViabilityPlanilha } from '../types/holding';

export interface ViabilityInputParams {
  monthlyRevenue: number;
  cmvPercent?: number;
  fixedExpenses?: number;
  marketingPercent?: number;
  royaltiesPercent?: number;
  cardFeesPercent?: number;
  creditSalesPercent?: number;
  clientTermDays?: number;
  creditPurchasesPercent?: number;
  supplierTermDays?: number;
  stockDays?: number;
  capex: number;
}

export const DEFAULT_VIABILITY_PARAMS: Required<ViabilityInputParams> = {
  monthlyRevenue: 80000,
  cmvPercent: 32,
  fixedExpenses: 34000,
  marketingPercent: 1,
  royaltiesPercent: 0,
  cardFeesPercent: 3.5,
  creditSalesPercent: 65,
  clientTermDays: 2,
  creditPurchasesPercent: 100,
  supplierTermDays: 15,
  stockDays: 15,
  capex: 280000
};

/**
 * Validação de Viabilidade da Margem EBITDA Operacional para Alimentação / Franquias.
 * O padrão saudável e sustentável de mercado situa-se estritamente entre 10% e 18% da receita bruta.
 * Projeções com EBITDA < 5% (como 0,5%) são irreais e bloqueadas.
 */
export function validateEbitdaMargin(marginPercent: number): {
  isValid: boolean;
  isWarning: boolean;
  status: 'critical' | 'warning' | 'optimal' | 'high';
  message: string;
} {
  if (marginPercent <= 0) {
    return {
      isValid: false,
      isWarning: false,
      status: 'critical',
      message: 'Operação deficitária: EBITDA negativo não gera payback nem sustentabilidade financeira.'
    };
  }
  if (marginPercent < 5) {
    return {
      isValid: false,
      isWarning: true,
      status: 'critical',
      message: `Margem de ${marginPercent.toFixed(1)}% é irreal/insustentável para alimentação comercial (mínimo de viabilidade: 10% a 18%).`
    };
  }
  if (marginPercent < 10) {
    return {
      isValid: true,
      isWarning: true,
      status: 'warning',
      message: `Margem de ${marginPercent.toFixed(1)}% está abaixo da faixa recomendada de mercado (10% a 18%). Risco de caixa elevado.`
    };
  }
  if (marginPercent <= 18) {
    return {
      isValid: true,
      isWarning: false,
      status: 'optimal',
      message: `Margem de ${marginPercent.toFixed(1)}% é consistente e alinhada ao benchmark do setor de alimentação (10% a 18%).`
    };
  }
  return {
    isValid: true,
    isWarning: true,
    status: 'high',
    message: `Margem de ${marginPercent.toFixed(1)}% é excepcionalmente alta para o setor de alimentação comercial. Recomenda-se auditar premissas.`
  };
}

/**
 * Calcula as despesas fixas ideais para atingir a margem EBITDA alvo (padrão de mercado: 14%)
 */
export function calculateSuggestedFixedForTargetMargin(
  revenue: number,
  cmvPercent: number = 32,
  targetMarginPercent: number = 14,
  cardFeesPercent: number = 3.5,
  marketingPercent: number = 1,
  royaltiesPercent: number = 0
): number {
  if (revenue <= 0) return 0;
  const grossProfit = revenue * (1 - cmvPercent / 100);
  const variableExpenses = revenue * ((cardFeesPercent + marketingPercent + royaltiesPercent) / 100);
  const targetEbitda = revenue * (targetMarginPercent / 100);
  const suggestedFixed = grossProfit - variableExpenses - targetEbitda;
  return Math.max(0, Math.round(suggestedFixed));
}

/**
 * Formata o Payback de meses para exibição amigável e realista em anos e meses.
 * Exemplo: 20 meses -> "1 ano e 8 meses"
 *          24 meses -> "2 anos"
 *          8 meses  -> "8 meses"
 */
export function formatPaybackTime(months: number): string {
  if (!months || isNaN(months) || !isFinite(months) || months <= 0) {
    return 'Inviável (Sem EBITDA)';
  }

  if (months > 180) { // > 15 anos
    return '> 15 anos (Inviável)';
  }

  const roundedMonths = Math.round(months * 10) / 10;
  if (roundedMonths < 1) {
    return '< 1 mês';
  }

  const totalWholeMonths = Math.round(roundedMonths);
  const years = Math.floor(totalWholeMonths / 12);
  const remMonths = totalWholeMonths % 12;

  if (years === 0) {
    return `${totalWholeMonths} ${totalWholeMonths === 1 ? 'mês' : 'meses'}`;
  }

  if (remMonths === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }

  const yearLabel = `${years} ${years === 1 ? 'ano' : 'anos'}`;
  const monthLabel = `${remMonths} ${remMonths === 1 ? 'mês' : 'meses'}`;
  return `${yearLabel} e ${monthLabel}`;
}

/**
 * Realiza os cálculos rigorosos baseados na Planilha de Parâmetros de Entrada e Indicadores
 * de Viabilidade e Payback.
 */
export function calculateViability(params: ViabilityInputParams): ViabilityPlanilha {
  const rev = Math.max(0, Number(params.monthlyRevenue) || 0);
  const cmvPct = params.cmvPercent !== undefined ? Number(params.cmvPercent) : DEFAULT_VIABILITY_PARAMS.cmvPercent;
  const fixed = params.fixedExpenses !== undefined ? Number(params.fixedExpenses) : DEFAULT_VIABILITY_PARAMS.fixedExpenses;
  const mktPct = params.marketingPercent !== undefined ? Number(params.marketingPercent) : DEFAULT_VIABILITY_PARAMS.marketingPercent;
  const royPct = params.royaltiesPercent !== undefined ? Number(params.royaltiesPercent) : DEFAULT_VIABILITY_PARAMS.royaltiesPercent;
  const cardPct = params.cardFeesPercent !== undefined ? Number(params.cardFeesPercent) : DEFAULT_VIABILITY_PARAMS.cardFeesPercent;
  
  const creditSalesPct = params.creditSalesPercent !== undefined ? Number(params.creditSalesPercent) : DEFAULT_VIABILITY_PARAMS.creditSalesPercent;
  const clientDays = params.clientTermDays !== undefined ? Number(params.clientTermDays) : DEFAULT_VIABILITY_PARAMS.clientTermDays;
  const creditPurchasesPct = params.creditPurchasesPercent !== undefined ? Number(params.creditPurchasesPercent) : DEFAULT_VIABILITY_PARAMS.creditPurchasesPercent;
  const supplierDays = params.supplierTermDays !== undefined ? Number(params.supplierTermDays) : DEFAULT_VIABILITY_PARAMS.supplierTermDays;
  const stockDays = params.stockDays !== undefined ? Number(params.stockDays) : DEFAULT_VIABILITY_PARAMS.stockDays;
  const capex = Math.max(0, Number(params.capex) || 0);

  // 1. Compras mensais (Premissa: CMV = Reposição de Estoque)
  const monthlyPurchases = (rev * cmvPct) / 100;
  
  // 2. Lucro bruto total mensal adicionado mensal
  const grossProfit = rev - monthlyPurchases;
  const grossMarginPercent = rev > 0 ? (grossProfit / rev) * 100 : Math.max(0, 100 - cmvPct);

  // 3. Despesas variáveis com Fundo de Marketing, Royalties, Taxas Cartão/Pix
  const marketingExpense = (rev * mktPct) / 100;
  const royaltiesExpense = (rev * royPct) / 100;
  const cardFeesExpense = (rev * cardPct) / 100;

  // 4. EBITDA mensal adicionado e Margem EBITDA%
  const ebitdaMonthly = grossProfit - fixed - marketingExpense - royaltiesExpense - cardFeesExpense;
  const ebitdaMarginPercent = rev > 0 ? (ebitdaMonthly / rev) * 100 : 0;

  // 5. Capital de Giro e NCG (Necessidade de Capital de Giro) mensal
  // Investimento em Contas a Receber: Base exata da planilha (ex: 75.000 * 65% * 2 / 30.30303 = 3.217,50)
  const daysInMonthDivisor = 30.30303030303;
  const receivablesInvestment = daysInMonthDivisor > 0 
    ? (rev * (creditSalesPct / 100) * clientDays) / daysInMonthDivisor 
    : 0;

  // Financiamento de Fornecedores: Compras * (% a prazo) * (dias fornecedor / 30)
  const supplierFinancing = monthlyPurchases * (creditPurchasesPct / 100) * (supplierDays / 30);

  // Investimento em Estoque: Compras * (dias estoque / 30)
  const stockInvestment = monthlyPurchases * (stockDays / 30);

  // NCG mensal = Contas a Receber + Estoque - Financiamento Fornecedores
  const ncgMonthly = receivablesInvestment + stockInvestment - supplierFinancing;

  // 6. Investimento Total (CAPEX + NCG x 12 meses)
  const totalInvestment = capex + ncgMonthly;

  // 7. Payback em Meses = Investimento Total / EBITDA mensal adicionado
  const paybackMonths = ebitdaMonthly > 0 ? totalInvestment / ebitdaMonthly : 0;

  // 8. PONTO DE EQUILÍBRIO (Break-Even) = Despesas Fixas / Margem Bruta %
  const grossMarginDecimal = grossMarginPercent / 100;
  const breakEvenMonthly = grossMarginDecimal > 0 ? fixed / grossMarginDecimal : 0;

  return {
    monthlyRevenue: rev,
    cmvPercent: cmvPct,
    fixedExpenses: fixed,
    marketingPercent: mktPct,
    royaltiesPercent: royPct,
    cardFeesPercent: cardPct,
    creditSalesPercent: creditSalesPct,
    clientTermDays: clientDays,
    creditPurchasesPercent: creditPurchasesPct,
    supplierTermDays: supplierDays,
    stockDays,
    capex,

    monthlyPurchases,
    grossProfit,
    grossMarginPercent,
    marketingExpense,
    royaltiesExpense,
    cardFeesExpense,
    ebitdaMonthly,
    ebitdaMarginPercent,
    receivablesInvestment,
    supplierFinancing,
    stockInvestment,
    ncgMonthly,
    totalInvestment,
    paybackMonths,
    breakEvenMonthly
  };
}
