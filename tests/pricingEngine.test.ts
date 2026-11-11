import { describe, expect, it } from 'vitest';
import {
  buildContext,
  comboMetrics,
  correctionFactor,
  energyLineCost,
  ingredientPriceImpact,
  ingredientUnitCost,
  laborCostPerMinute,
  monthlyStructure,
  overview,
  productCost,
  productMetrics,
  productNutrition,
  recipeCost,
  roundNutrient,
  suggestedPrice,
} from '../src/lib/pricing/engine';
import type { Ingredient, PricingConfig, PricingData, Product } from '../src/lib/pricing/types';

const now = '2026-11-10T00:00:00.000Z';

const config = (over: Partial<PricingConfig> = {}): PricingConfig => ({
  taxPct: 0.06,
  cardFeePct: 0.03,
  deliveryFeePct: 0.23,
  deliveryCardFeePct: 0.032,
  targetMarginPct: 0.15,
  cmvTargetPct: 0.32,
  revenueEstimate: 0,
  payrollMode: 'unit',
  // 1 funcionário: 2.904 / (200 h * 60) = R$ 0,242 por minuto
  employees: [{ id: 'e1', name: 'Cozinheiro', salary: 2904, chargesPct: 0, benefits: 0, hoursPerMonth: 200 }],
  expenses: [
    { id: 'x1', name: 'Aluguel', value: 3000, kind: 'fixed' },
    { id: 'x2', name: 'Manutenção', value: 500, kind: 'variable' },
  ],
  equipment: [{ id: 'q1', name: 'Forno', value: 12000, lifeYears: 10, residualValue: 0 }],
  energy: [
    { id: 'gas', name: 'Fogão', type: 'gas', cylinderPrice: 130, cylinderKg: 13, kgPerHour: 0.3 },
    { id: 'ele', name: 'Forno', type: 'electric', powerWatts: 3000, kwhPrice: 0.9 },
  ],
  categories: ['Massas'],
  updatedAt: now,
  ...over,
});

const ing = (id: string, over: Partial<Ingredient>): Ingredient => ({
  id,
  code: id,
  name: id,
  unit: 'g',
  purchaseQty: 1000,
  netQty: 1000,
  price: 10,
  updatedAt: now,
  ...over,
});

const product = (over: Partial<Product>): Product => ({
  id: 'p1',
  code: 'P01',
  kind: 'product',
  name: 'Blend no pão',
  category: 'Massas',
  lines: [],
  packaging: [],
  energy: [],
  laborMinutes: 0,
  laborWorkers: 0,
  extraCost: 0,
  salePrice: 30,
  monthlySales: 100,
  version: 1,
  updatedAt: now,
  ...over,
});

function baseData(over: Partial<PricingData> = {}): PricingData {
  return {
    config: config(),
    ingredients: [
      ing('carne', { price: 42, purchaseQty: 1000, netQty: 950 }),
      ing('sal', { price: 3.5, purchaseQty: 1000, netQty: 1000 }),
      ing('pimenta', { price: 6.9, purchaseQty: 100, netQty: 100 }),
      ing('pao', {
        unit: 'un',
        price: 14.9,
        purchaseQty: 6,
        netQty: 6,
        gramsPerUnit: 60,
        nutrients: { kcal: 270, carb: 50, protein: 9, fatTotal: 4, sodium: 500 },
      }),
    ],
    packaging: [{ id: 'cx', code: '0001', name: 'Caixa', packQty: 100, packPrice: 69.9, updatedAt: now }],
    recipes: [
      {
        id: 'blend',
        code: '0001',
        name: 'Blend',
        unit: 'g',
        yieldQty: 1000,
        prepMinutes: 20,
        workers: 1,
        lossFactor: 1,
        lines: [
          { kind: 'ingredient', refId: 'carne', qty: 1000 },
          { kind: 'ingredient', refId: 'sal', qty: 12 },
          { kind: 'ingredient', refId: 'pimenta', qty: 3 },
        ],
        updatedAt: now,
      },
    ],
    products: [],
    combos: [],
    ...over,
  };
}

describe('itens básicos', () => {
  it('custo por grama usa a quantidade líquida, como no sistema de referência', () => {
    const carne = ing('c', { price: 42, purchaseQty: 1000, netQty: 950 });
    expect(ingredientUnitCost(carne)).toBeCloseTo(0.04421, 5);
    expect(correctionFactor(carne)).toBeCloseTo(1.0526, 4);
  });

  it('custo do minuto da equipe', () => {
    expect(laborCostPerMinute(config())).toBeCloseTo(0.242, 6);
  });

  it('gás e energia por unidade produzida', () => {
    const cfg = config();
    // 0,3 kg/h * R$10/kg = R$3/h -> 20 min = R$1 -> 4 unidades = R$0,25
    expect(energyLineCost(cfg.energy[0], { sourceId: 'gas', minutes: 20, batchUnits: 4 })).toBeCloseTo(0.25, 6);
    // 3 kW * 0,9 = R$2,70/h -> 10 min = R$0,45
    expect(energyLineCost(cfg.energy[1], { sourceId: 'ele', minutes: 10, batchUnits: 1 })).toBeCloseTo(0.45, 6);
  });
});

describe('receitas base', () => {
  it('blend: ingredientes + mão de obra = R$ 49,30 e R$ 0,0493/g', () => {
    const ctx = buildContext(baseData());
    const r = recipeCost(ctx, 'blend');
    expect(r.ingredients).toBeCloseTo(44.462, 2);
    expect(r.labor).toBeCloseTo(4.84, 6);
    expect(r.total).toBeCloseTo(49.30, 2);
    expect(r.unitCost).toBeCloseTo(0.0493, 4);
  });

  it('no modo folha fixa a mão de obra não entra duas vezes', () => {
    const ctx = buildContext(baseData({ config: config({ payrollMode: 'fixed' }) }));
    expect(recipeCost(ctx, 'blend').labor).toBe(0);
    expect(monthlyStructure(ctx.data.config).payroll).toBeCloseTo(2904, 6);
  });

  it('receita que usa a si mesma não trava o cálculo', () => {
    const data = baseData();
    data.recipes[0].lines.push({ kind: 'recipe', refId: 'blend', qty: 10 });
    expect(recipeCost(buildContext(data), 'blend').total).toBeCloseTo(49.30, 2);
  });
});

describe('produto', () => {
  const p = product({
    lines: [
      { kind: 'ingredient', refId: 'pao', qty: 1 },
      { kind: 'recipe', refId: 'blend', qty: 150 },
    ],
    packaging: [{ packagingId: 'cx', qty: 1 }],
    energy: [{ sourceId: 'gas', minutes: 20, batchUnits: 4 }],
    laborMinutes: 5,
    laborWorkers: 1,
    extraCost: 0.5,
  });

  it('soma cada etapa do custo', () => {
    const ctx = buildContext(baseData({ products: [p] }));
    const c = productCost(ctx, p);
    expect(c.ingredients).toBeCloseTo(14.9 / 6 + 0.0493 * 150, 2);
    expect(c.packaging).toBeCloseTo(0.699, 3);
    expect(c.energy).toBeCloseTo(0.25, 6);
    expect(c.labor).toBeCloseTo(1.21, 6);
    expect(c.total).toBeCloseTo(c.ingredients + 0.699 + 0.25 + 1.21 + 0.5, 6);
  });

  it('margem, lucro e preço sugerido batem com a conta do markup', () => {
    const data = baseData({ products: [p] });
    const ctx = buildContext(data);
    const m = productMetrics(ctx, p);
    // estrutura: 3000 + 500 + 100 (depreciação) = 3600; faturamento 30 * 100 = 3000 -> 120%
    expect(m.overheadShare).toBeCloseTo(36, 6);
    expect(m.fees).toBeCloseTo(30 * 0.09, 6);
    expect(m.contribution).toBeCloseTo(30 - m.cost.total - 2.7, 6);
    expect(m.marginReached).toBe(false);
    expect(m.suggested).toBeNull(); // estrutura maior que o faturamento: nenhum preço fecha

    const withEstimate = buildContext({ ...data, config: config({ revenueEstimate: 36000 }) });
    const m2 = productMetrics(withEstimate, p);
    const expected = m2.cost.total / (1 - 0.09 - 0.1 - 0.15);
    expect(m2.suggested).toBeCloseTo(expected, 6);
    const atSuggested = productMetrics(withEstimate, { ...p, salePrice: m2.suggested! });
    expect(atSuggested.profitPct).toBeCloseTo(0.15, 6);
    expect(atSuggested.marginReached).toBe(true);
  });

  it('delivery usa comissão do app e preço próprio', () => {
    const ctx = buildContext(baseData({ products: [p] }));
    const m = productMetrics(ctx, { ...p, deliveryPrice: 36 }, 'delivery');
    expect(m.price).toBe(36);
    expect(m.feePct).toBeCloseTo(0.06 + 0.23 + 0.032, 6);
  });

  it('suggestedPrice recusa percentuais impossíveis', () => {
    expect(suggestedPrice(10, 0.5, 0.3, 0.2)).toBeNull();
    expect(suggestedPrice(10, 0.1, 0.1, 0.3)).toBeCloseTo(20, 6);
  });
});

describe('recalcular quando o fornecedor aumenta', () => {
  it('aponta os produtos afetados, inclusive via receita base', () => {
    const p = product({ lines: [{ kind: 'recipe', refId: 'blend', qty: 150 }], salePrice: 30 });
    const data = baseData({ products: [p], config: config({ revenueEstimate: 36000 }) });
    const carne = data.ingredients[0];
    const impacts = ingredientPriceImpact(data, { ...carne, price: 63 });
    expect(impacts).toHaveLength(1);
    expect(impacts[0].costAfter).toBeGreaterThan(impacts[0].costBefore);
    expect(ingredientPriceImpact(data, { ...data.ingredients[1], price: 3.5 })).toHaveLength(0);
  });
});

describe('combos e visão geral', () => {
  it('combo mostra o desconto sobre os itens avulsos', () => {
    const p = product({ lines: [{ kind: 'ingredient', refId: 'sal', qty: 100 }], salePrice: 20 });
    const data = baseData({
      products: [p],
      combos: [{ id: 'c1', code: 'C01', name: 'Combo', items: [{ productId: 'p1', qty: 2 }], packaging: [], salePrice: 36, monthlySales: 10, updatedAt: now }],
      config: config({ revenueEstimate: 36000 }),
    });
    const ctx = buildContext(data);
    const m = comboMetrics(ctx, data.combos[0]);
    expect(m.itemsListPrice).toBe(40);
    expect(m.discountPct).toBeCloseTo(0.1, 6);
    expect(m.cost).toBeCloseTo(0.7, 6);
  });

  it('ponto de equilíbrio = estrutura / contribuição média', () => {
    const p = product({ lines: [{ kind: 'ingredient', refId: 'sal', qty: 100 }], salePrice: 20 });
    const ctx = buildContext(baseData({ products: [p] }));
    const o = overview(ctx);
    const contribution = 20 - 0.35 - 20 * 0.09;
    expect(o.avgContribution).toBeCloseTo(contribution, 6);
    expect(o.breakEvenUnits).toBe(Math.ceil(3600 / contribution));
  });
});

describe('tabela nutricional', () => {
  it('soma pelos gramas, calcula por 100 g, porção e %VD', () => {
    const p = product({ lines: [{ kind: 'ingredient', refId: 'pao', qty: 2 }], portionGrams: 60 });
    const n = productNutrition(buildContext(baseData({ products: [p] })), p);
    expect(n.totalGrams).toBe(120);
    expect(n.per100.kcal).toBeCloseTo(270, 6);
    expect(n.perPortion.kcal).toBeCloseTo(162, 6);
    expect(n.vdPct.kcal).toBeCloseTo(162 / 2000, 6);
    expect(n.vdPct.sugarTotal).toBeUndefined();
    expect(n.highIn.sodium).toBe(false);
    expect(n.missing).toEqual([]);
  });

  it('avisa ingredientes sem dados e marca ALTO EM sódio', () => {
    const p = product({
      lines: [
        { kind: 'ingredient', refId: 'sal', qty: 10 },
        { kind: 'ingredient', refId: 'pao', qty: 1 },
      ],
    });
    const data = baseData({ products: [p] });
    data.ingredients[1].nutrients = { sodium: 39000 };
    const n = productNutrition(buildContext(data), p);
    expect(n.highIn.sodium).toBe(true);
    expect(n.missing).toEqual([]);
    data.ingredients[1].nutrients = undefined;
    expect(productNutrition(buildContext(data), p).missing).toEqual(['sal']);
  });

  it('arredonda como no rótulo', () => {
    expect(roundNutrient('kcal', 484.4)).toBe('484');
    expect(roundNutrient('carb', 27.4)).toBe('27');
    expect(roundNutrient('fatSat', 3.14)).toBe('3,1');
    expect(roundNutrient('fiber', 1.0)).toBe('1');
    expect(roundNutrient('fatTrans', 0.02)).toBe('0');
  });
});
