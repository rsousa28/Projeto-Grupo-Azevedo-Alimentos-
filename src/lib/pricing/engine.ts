// Motor de cálculo da Precificação PRO. Funções puras, sem React nem Firestore,
// para poder testar cada conta (tests/pricingEngine.test.ts).
import type {
  BaseRecipe,
  Combo,
  EnergyLine,
  EnergySource,
  Ingredient,
  Nutrients,
  PackLine,
  Packaging,
  PricingConfig,
  PricingData,
  Product,
  RecipeLine,
} from './types';

export type Channel = 'salao' | 'delivery';

const safeDiv = (a: number, b: number) => (b > 0 && Number.isFinite(a) ? a / b : 0);

// ---------------------------------------------------------------
// Itens básicos
// ---------------------------------------------------------------

/** Custo por g/ml/un aproveitado: o preço pago dividido pela quantidade líquida. */
export function ingredientUnitCost(ing: Ingredient): number {
  return safeDiv(ing.price, ing.netQty || ing.purchaseQty);
}

/** Fator de correção = bruta / líquida (1,05 = 5% de perda na limpeza). */
export function correctionFactor(ing: Ingredient): number {
  return ing.netQty > 0 ? ing.purchaseQty / ing.netQty : 1;
}

export function packagingUnitCost(p: Packaging): number {
  return safeDiv(p.packPrice, p.packQty);
}

export function employeeMonthlyCost(e: { salary: number; chargesPct: number; benefits: number }): number {
  return e.salary * (1 + (e.chargesPct || 0)) + (e.benefits || 0);
}

/** Custo médio do minuto de trabalho da equipe (folha total / minutos trabalhados). */
export function laborCostPerMinute(config: PricingConfig): number {
  const cost = config.employees.reduce((s, e) => s + employeeMonthlyCost(e), 0);
  const minutes = config.employees.reduce((s, e) => s + (e.hoursPerMonth || 0) * 60, 0);
  return safeDiv(cost, minutes);
}

export function monthlyDepreciation(config: PricingConfig): number {
  return config.equipment.reduce(
    (s, eq) => s + safeDiv(Math.max(0, eq.value - (eq.residualValue || 0)), (eq.lifeYears || 0) * 12),
    0,
  );
}

/** Custo de energia por hora de uso do equipamento. */
export function energyCostPerHour(src: EnergySource): number {
  if (src.type === 'gas') {
    return (src.kgPerHour || 0) * safeDiv(src.cylinderPrice || 0, src.cylinderKg || 0);
  }
  return ((src.powerWatts || 0) / 1000) * (src.kwhPrice || 0);
}

export function energyLineCost(src: EnergySource | undefined, line: EnergyLine): number {
  if (!src) return 0;
  return safeDiv(energyCostPerHour(src) * (line.minutes / 60), line.batchUnits || 1);
}

// ---------------------------------------------------------------
// Contexto com índices e memória (receitas podem usar outras receitas)
// ---------------------------------------------------------------

export interface PricingContext {
  data: PricingData;
  ingredients: Map<string, Ingredient>;
  packaging: Map<string, Packaging>;
  recipes: Map<string, BaseRecipe>;
  products: Map<string, Product>;
  energy: Map<string, EnergySource>;
  laborPerMinute: number;
  recipeCostMemo: Map<string, RecipeCost>;
}

export function buildContext(data: PricingData): PricingContext {
  return {
    data,
    ingredients: new Map(data.ingredients.map((i) => [i.id, i])),
    packaging: new Map(data.packaging.map((p) => [p.id, p])),
    recipes: new Map(data.recipes.map((r) => [r.id, r])),
    products: new Map(data.products.map((p) => [p.id, p])),
    energy: new Map(data.config.energy.map((e) => [e.id, e])),
    laborPerMinute: laborCostPerMinute(data.config),
    recipeCostMemo: new Map(),
  };
}

export interface RecipeCost {
  ingredients: number;
  labor: number;
  total: number;
  unitCost: number; // por g/ml/un do rendimento
}

function laborApplies(ctx: PricingContext) {
  return ctx.data.config.payrollMode !== 'fixed';
}

export function recipeCost(ctx: PricingContext, recipeId: string, stack: string[] = []): RecipeCost {
  const memo = ctx.recipeCostMemo.get(recipeId);
  if (memo) return memo;
  const empty = { ingredients: 0, labor: 0, total: 0, unitCost: 0 };
  const r = ctx.recipes.get(recipeId);
  if (!r || stack.includes(recipeId)) return empty; // ciclo: receita usando a si mesma

  const ingredients = r.lines.reduce((s, l) => s + lineCost(ctx, l, [...stack, recipeId]), 0);
  const labor = laborApplies(ctx) ? (r.prepMinutes || 0) * (r.workers || 0) * ctx.laborPerMinute : 0;
  const total = (ingredients + labor) * (r.lossFactor || 1);
  const result = { ingredients, labor, total, unitCost: safeDiv(total, r.yieldQty) };
  ctx.recipeCostMemo.set(recipeId, result);
  return result;
}

export function lineUnitCost(ctx: PricingContext, line: RecipeLine, stack: string[] = []): number {
  if (line.kind === 'ingredient') {
    const ing = ctx.ingredients.get(line.refId);
    return ing ? ingredientUnitCost(ing) : 0;
  }
  return recipeCost(ctx, line.refId, stack).unitCost;
}

export function lineCost(ctx: PricingContext, line: RecipeLine, stack: string[] = []): number {
  return (line.qty || 0) * lineUnitCost(ctx, line, stack);
}

export function packLinesCost(ctx: PricingContext, lines: PackLine[] | undefined): number {
  return (lines || []).reduce((s, l) => {
    const p = ctx.packaging.get(l.packagingId);
    return s + (p ? packagingUnitCost(p) * (l.qty || 0) : 0);
  }, 0);
}

// ---------------------------------------------------------------
// Estrutura do mês: custos fixos e faturamento
// ---------------------------------------------------------------

export function monthlyPayroll(config: PricingConfig): number {
  return config.employees.reduce((s, e) => s + employeeMonthlyCost(e), 0);
}

export interface MonthlyStructure {
  fixedExpenses: number;
  variableExpenses: number;
  depreciation: number;
  payroll: number;       // folha no custo fixo (só no modo 'fixed')
  total: number;         // tudo o que precisa ser pago no mês além do custo direto
}

export function monthlyStructure(config: PricingConfig): MonthlyStructure {
  const fixedExpenses = config.expenses.filter((e) => e.kind === 'fixed').reduce((s, e) => s + e.value, 0);
  const variableExpenses = config.expenses.filter((e) => e.kind === 'variable').reduce((s, e) => s + e.value, 0);
  const depreciation = monthlyDepreciation(config);
  const payroll = config.payrollMode === 'fixed' ? monthlyPayroll(config) : 0;
  return {
    fixedExpenses,
    variableExpenses,
    depreciation,
    payroll,
    total: fixedExpenses + variableExpenses + depreciation + payroll,
  };
}

export function monthlyRevenue(data: PricingData): number {
  if (data.config.revenueEstimate > 0) return data.config.revenueEstimate;
  const products = data.products.reduce((s, p) => s + (p.salePrice || 0) * (p.monthlySales || 0), 0);
  const combos = data.combos.reduce((s, c) => s + (c.salePrice || 0) * (c.monthlySales || 0), 0);
  return products + combos;
}

/** Quanto cada R$ 1 vendido precisa reservar para pagar a estrutura do mês. */
export function overheadPct(data: PricingData): number {
  return safeDiv(monthlyStructure(data.config).total, monthlyRevenue(data));
}

export function channelFeePct(config: PricingConfig, channel: Channel): number {
  return channel === 'delivery'
    ? config.taxPct + config.deliveryFeePct + config.deliveryCardFeePct
    : config.taxPct + config.cardFeePct;
}

/**
 * Preço sugerido pelo markup divisor: custo / (1 - impostos/taxas - estrutura - margem).
 * Retorna null quando os percentuais somam 95% ou mais (não existe preço que feche a conta).
 */
export function suggestedPrice(unitCost: number, feePct: number, overhead: number, marginPct: number): number | null {
  const divisor = 1 - feePct - overhead - marginPct;
  if (divisor <= 0.05 || unitCost <= 0) return null;
  return unitCost / divisor;
}

// ---------------------------------------------------------------
// Produto
// ---------------------------------------------------------------

export interface ProductCost {
  ingredients: number;
  packaging: number;
  energy: number;
  labor: number;
  extras: number;
  total: number;
}

export function productCost(ctx: PricingContext, p: Product, channel: Channel = 'salao'): ProductCost {
  const ingredients = p.lines.reduce((s, l) => s + lineCost(ctx, l), 0);
  const packaging =
    packLinesCost(ctx, p.packaging) + (channel === 'delivery' ? packLinesCost(ctx, p.deliveryPackaging) : 0);
  const energy = p.energy.reduce((s, l) => s + energyLineCost(ctx.energy.get(l.sourceId), l), 0);
  const labor = laborApplies(ctx) ? (p.laborMinutes || 0) * (p.laborWorkers || 0) * ctx.laborPerMinute : 0;
  const extras = p.extraCost || 0;
  return { ingredients, packaging, energy, labor, extras, total: ingredients + packaging + energy + labor + extras };
}

export interface ProductMetrics {
  channel: Channel;
  price: number;
  cost: ProductCost;
  feePct: number;
  fees: number;           // impostos + taxas sobre o preço
  contribution: number;   // preço - custo - taxas
  contributionPct: number;
  overheadShare: number;  // parte da estrutura do mês que este produto paga
  profit: number;         // lucro líquido por unidade
  profitPct: number;
  cmvPct: number;         // (ingredientes + embalagens) / preço
  targetMarginPct: number;
  suggested: number | null;
  marginReached: boolean;
  hasPrice: boolean;
}

export function productMetrics(
  ctx: PricingContext,
  p: Product,
  channel: Channel = 'salao',
  overhead = overheadPct(ctx.data),
): ProductMetrics {
  const cost = productCost(ctx, p, channel);
  const price = channel === 'delivery' ? p.deliveryPrice || p.salePrice || 0 : p.salePrice || 0;
  const feePct = channelFeePct(ctx.data.config, channel);
  const fees = price * feePct;
  const contribution = price - cost.total - fees;
  const overheadShare = price * overhead;
  const profit = contribution - overheadShare;
  const targetMarginPct = p.targetMarginPct ?? ctx.data.config.targetMarginPct;
  const profitPct = safeDiv(profit, price);
  return {
    channel,
    price,
    cost,
    feePct,
    fees,
    contribution,
    contributionPct: safeDiv(contribution, price),
    overheadShare,
    profit,
    profitPct,
    cmvPct: safeDiv(cost.ingredients + cost.packaging, price),
    targetMarginPct,
    suggested: suggestedPrice(cost.total, feePct, overhead, targetMarginPct),
    marginReached: price > 0 && profitPct >= targetMarginPct - 1e-9,
    hasPrice: price > 0,
  };
}

// ---------------------------------------------------------------
// Combos
// ---------------------------------------------------------------

export interface ComboMetrics {
  cost: number;
  itemsListPrice: number; // soma dos preços avulsos
  discountPct: number;
  price: number;
  contribution: number;
  profit: number;
  profitPct: number;
  suggested: number | null;
  marginReached: boolean;
}

export function comboMetrics(ctx: PricingContext, c: Combo, overhead = overheadPct(ctx.data)): ComboMetrics {
  let cost = packLinesCost(ctx, c.packaging);
  let itemsListPrice = 0;
  for (const item of c.items) {
    const p = ctx.products.get(item.productId);
    if (!p) continue;
    cost += productCost(ctx, p).total * item.qty;
    itemsListPrice += (p.salePrice || 0) * item.qty;
  }
  const price = c.salePrice || 0;
  const feePct = channelFeePct(ctx.data.config, 'salao');
  const contribution = price - cost - price * feePct;
  const profit = contribution - price * overhead;
  const profitPct = safeDiv(profit, price);
  const target = ctx.data.config.targetMarginPct;
  return {
    cost,
    itemsListPrice,
    discountPct: itemsListPrice > 0 ? 1 - price / itemsListPrice : 0,
    price,
    contribution,
    profit,
    profitPct,
    suggested: suggestedPrice(cost, feePct, overhead, target),
    marginReached: price > 0 && profitPct >= target - 1e-9,
  };
}

// ---------------------------------------------------------------
// Visão geral do mês
// ---------------------------------------------------------------

export interface Overview {
  revenue: number;
  structure: MonthlyStructure;
  overheadPct: number;
  avgPrice: number;
  avgContribution: number; // margem de contribuição média por unidade (ponderada pelas vendas)
  avgProfit: number;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  monthResult: number;     // contribuição total - estrutura
  unitsSold: number;
  belowTarget: number;     // produtos com margem não alcançada
  withoutPrice: number;
}

export function overview(ctx: PricingContext): Overview {
  const structure = monthlyStructure(ctx.data.config);
  const revenue = monthlyRevenue(ctx.data);
  const oh = safeDiv(structure.total, revenue);
  const sellable = ctx.data.products;
  const metrics = sellable.map((p) => ({ p, m: productMetrics(ctx, p, 'salao', oh) }));
  const priced = metrics.filter((x) => x.m.hasPrice);

  const unitsSold = priced.reduce((s, x) => s + (x.p.monthlySales || 0), 0);
  const weight = (x: (typeof priced)[number]) => (unitsSold > 0 ? x.p.monthlySales || 0 : 1);
  const totalWeight = priced.reduce((s, x) => s + weight(x), 0);
  const avg = (f: (x: (typeof priced)[number]) => number) =>
    safeDiv(priced.reduce((s, x) => s + f(x) * weight(x), 0), totalWeight);

  const avgPrice = avg((x) => x.m.price);
  const avgContribution = avg((x) => x.m.contribution);
  const avgProfit = avg((x) => x.m.profit);
  const breakEvenUnits = avgContribution > 0 ? Math.ceil(structure.total / avgContribution) : null;
  const contributionTotal = priced.reduce((s, x) => s + x.m.contribution * (x.p.monthlySales || 0), 0);
  const comboContribution = ctx.data.combos.reduce(
    (s, c) => s + comboMetrics(ctx, c, oh).contribution * (c.monthlySales || 0),
    0,
  );

  return {
    revenue,
    structure,
    overheadPct: oh,
    avgPrice,
    avgContribution,
    avgProfit,
    breakEvenUnits,
    breakEvenRevenue: breakEvenUnits !== null ? breakEvenUnits * avgPrice : null,
    monthResult: contributionTotal + comboContribution - structure.total,
    unitsSold,
    belowTarget: priced.filter((x) => !x.m.marginReached).length,
    withoutPrice: metrics.length - priced.length,
  };
}

// ---------------------------------------------------------------
// Impacto de mudança de preço de um ingrediente
// ---------------------------------------------------------------

export interface PriceImpact {
  productId: string;
  name: string;
  costBefore: number;
  costAfter: number;
  profitPctBefore: number;
  profitPctAfter: number;
  losesTarget: boolean;
}

/** Simula a troca de um ingrediente e devolve os produtos afetados (direta ou indiretamente). */
export function ingredientPriceImpact(data: PricingData, updated: Ingredient): PriceImpact[] {
  const before = buildContext(data);
  const after = buildContext({
    ...data,
    ingredients: data.ingredients.map((i) => (i.id === updated.id ? updated : i)),
  });
  const impacts: PriceImpact[] = [];
  for (const p of data.products) {
    const b = productMetrics(before, p);
    const a = productMetrics(after, p);
    if (Math.abs(a.cost.total - b.cost.total) < 0.0001) continue;
    impacts.push({
      productId: p.id,
      name: p.name,
      costBefore: b.cost.total,
      costAfter: a.cost.total,
      profitPctBefore: b.profitPct,
      profitPctAfter: a.profitPct,
      losesTarget: b.marginReached && !a.marginReached,
    });
  }
  return impacts.sort((x, y) => y.costAfter - y.costBefore - (x.costAfter - x.costBefore));
}

/** Onde um ingrediente ou receita é usado (para avisar antes de excluir). */
export function usagesOf(data: PricingData, kind: 'ingredient' | 'recipe', id: string): string[] {
  const uses = (lines: RecipeLine[]) => lines.some((l) => l.kind === kind && l.refId === id);
  return [
    ...data.recipes.filter((r) => uses(r.lines)).map((r) => `Receita: ${r.name}`),
    ...data.products.filter((p) => uses(p.lines)).map((p) => p.name),
  ];
}

export function packagingUsages(data: PricingData, id: string): string[] {
  const uses = (lines?: PackLine[]) => (lines || []).some((l) => l.packagingId === id);
  return [
    ...data.products.filter((p) => uses(p.packaging) || uses(p.deliveryPackaging)).map((p) => p.name),
    ...data.combos.filter((c) => uses(c.packaging)).map((c) => `Combo: ${c.name}`),
  ];
}

// ---------------------------------------------------------------
// Tabela nutricional (RDC 429/2020 e IN 75/2020)
// ---------------------------------------------------------------

export const NUTRIENT_KEYS: (keyof Nutrients)[] = [
  'kcal',
  'carb',
  'sugarTotal',
  'sugarAdded',
  'protein',
  'fatTotal',
  'fatSat',
  'fatTrans',
  'fiber',
  'sodium',
];

export const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  kcal: 'Valor energético (kcal)',
  carb: 'Carboidratos (g)',
  sugarTotal: 'Açúcares totais (g)',
  sugarAdded: 'Açúcares adicionados (g)',
  protein: 'Proteínas (g)',
  fatTotal: 'Gorduras totais (g)',
  fatSat: 'Gorduras saturadas (g)',
  fatTrans: 'Gorduras trans (g)',
  fiber: 'Fibra alimentar (g)',
  sodium: 'Sódio (mg)',
};

// Valores diários de referência (IN 75/2020, Anexo II). Açúcares totais não têm %VD.
export const DAILY_VALUES: Partial<Record<keyof Nutrients, number>> = {
  kcal: 2000,
  carb: 300,
  sugarAdded: 50,
  protein: 50,
  fatTotal: 65,
  fatSat: 20,
  fatTrans: 2,
  fiber: 25,
  sodium: 2000,
};

// Limites da rotulagem frontal "ALTO EM" por 100 g / 100 ml (RDC 429/2020, Anexo XV)
export const HIGH_IN_LIMITS = {
  solid: { sugarAdded: 15, fatSat: 6, sodium: 600 },
  liquid: { sugarAdded: 7.5, fatSat: 3, sodium: 300 },
};

export const zeroNutrients = (): Nutrients => ({
  kcal: 0,
  carb: 0,
  sugarTotal: 0,
  sugarAdded: 0,
  protein: 0,
  fatTotal: 0,
  fatSat: 0,
  fatTrans: 0,
  fiber: 0,
  sodium: 0,
});

function addScaled(target: Nutrients, src: Partial<Nutrients> | undefined, factor: number) {
  if (!src) return;
  for (const k of NUTRIENT_KEYS) target[k] += (src[k] || 0) * factor;
}

export interface NutritionLine {
  name: string;
  grams: number;
  nutrients: Nutrients;
  missing: boolean; // sem dados nutricionais ou sem peso por unidade
}

interface NutritionProfile {
  grams: number;
  nutrients: Nutrients;
  lines: NutritionLine[];
}

function ingredientGrams(ing: Ingredient, qty: number): number | null {
  if (ing.unit === 'un') return ing.gramsPerUnit ? qty * ing.gramsPerUnit : null;
  return qty;
}

function linesNutrition(ctx: PricingContext, lines: RecipeLine[], stack: string[]): NutritionProfile {
  const total = zeroNutrients();
  const out: NutritionLine[] = [];
  let grams = 0;
  for (const line of lines) {
    if (line.kind === 'ingredient') {
      const ing = ctx.ingredients.get(line.refId);
      if (!ing) continue;
      const g = ingredientGrams(ing, line.qty);
      const n = zeroNutrients();
      const hasData = !!ing.nutrients && NUTRIENT_KEYS.some((k) => (ing.nutrients?.[k] || 0) > 0);
      if (g !== null) addScaled(n, ing.nutrients, g / 100);
      addScaled(total, n, 1);
      grams += g || 0;
      out.push({ name: ing.name, grams: g || 0, nutrients: n, missing: g === null || !hasData });
    } else {
      const r = ctx.recipes.get(line.refId);
      if (!r || stack.includes(r.id)) continue;
      const inner = linesNutrition(ctx, r.lines, [...stack, r.id]);
      // Rendimento em g/ml já desconta perda de água no preparo; em 'un' usa o peso cru por unidade.
      const yieldGrams = r.unit === 'un' ? inner.grams : r.yieldQty;
      const share = safeDiv(line.qty, r.yieldQty);
      const n = zeroNutrients();
      addScaled(n, inner.nutrients, share);
      addScaled(total, n, 1);
      const g = yieldGrams * share;
      grams += g;
      out.push({ name: r.name, grams: g, nutrients: n, missing: inner.lines.some((l) => l.missing) });
    }
  }
  return { grams, nutrients: total, lines: out };
}

export interface NutritionFacts {
  totalGrams: number;
  portionGrams: number;
  per100: Nutrients;
  perPortion: Nutrients;
  vdPct: Partial<Record<keyof Nutrients, number>>;
  highIn: { sugarAdded: boolean; fatSat: boolean; sodium: boolean };
  lines: NutritionLine[];
  missing: string[];
}

export function productNutrition(ctx: PricingContext, p: Product): NutritionFacts {
  const profile = linesNutrition(ctx, p.lines, []);
  const totalGrams = profile.grams;
  const portionGrams = p.portionGrams && p.portionGrams > 0 ? p.portionGrams : totalGrams;
  const per100 = zeroNutrients();
  addScaled(per100, profile.nutrients, safeDiv(100, totalGrams));
  const perPortion = zeroNutrients();
  addScaled(perPortion, per100, portionGrams / 100);
  const vdPct: Partial<Record<keyof Nutrients, number>> = {};
  for (const k of NUTRIENT_KEYS) {
    const dv = DAILY_VALUES[k];
    if (dv) vdPct[k] = perPortion[k] / dv;
  }
  const limits = p.liquid ? HIGH_IN_LIMITS.liquid : HIGH_IN_LIMITS.solid;
  return {
    totalGrams,
    portionGrams,
    per100,
    perPortion,
    vdPct,
    highIn: {
      sugarAdded: per100.sugarAdded >= limits.sugarAdded,
      fatSat: per100.fatSat >= limits.fatSat,
      sodium: per100.sodium >= limits.sodium,
    },
    lines: profile.lines,
    missing: profile.lines.filter((l) => l.missing).map((l) => l.name),
  };
}

/** Arredondamento para o rótulo: inteiro a partir de 10, uma casa abaixo disso. */
export function roundNutrient(key: keyof Nutrients, value: number): string {
  if (key === 'kcal' || key === 'sodium') return String(Math.round(value));
  if (value >= 10) return String(Math.round(value));
  if (value < 0.05) return '0';
  return value.toFixed(1).replace('.', ',').replace(',0', '');
}

// ---------------------------------------------------------------
// Utilidades de cadastro
// ---------------------------------------------------------------

export function nextCode(prefix: string, codes: string[], width = 2): string {
  const max = codes.reduce((m, c) => {
    const n = parseInt(String(c).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, '0')}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
