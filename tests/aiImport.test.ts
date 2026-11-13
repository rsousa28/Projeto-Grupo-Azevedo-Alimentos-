import { describe, expect, it } from 'vitest';
import { buildImportPlan, findExampleData, mergeExtractions, planWrites, toBase, type AiExtraction, type ImportPlan } from '../src/lib/pricing/aiImport';
import { buildContext, productCost } from '../src/lib/pricing/engine';
import { defaultConfig, seedVeroPasta } from '../src/lib/pricing/seed';
import type { PricingData } from '../src/lib/pricing/types';

const NOW = '2026-11-13T12:00:00.000Z';
const empty = (): PricingData => ({ config: defaultConfig(), ingredients: [], packaging: [], recipes: [], products: [], combos: [] });

const extraction: AiExtraction = {
  fichas: [
    {
      name: 'MOLHO DE TOMATE DA CASA',
      kind: 'recipe',
      yieldQty: 2,
      yieldUnit: 'kg',
      ingredients: [
        { name: 'Tomate pelado', qty: 2.5, unit: 'kg', lineCost: 37.5 },
        { name: 'Cebola', qty: 200, unit: 'g', unitCost: 6, costUnit: 'kg' },
        { name: 'Azeite', qty: 50, unit: 'ml' },
      ],
    },
    {
      name: 'Spaghetti ao sugo',
      kind: 'product',
      category: 'MASSAS',
      salePrice: 42,
      prepMinutes: 8,
      ingredients: [
        { name: 'Spaghetti', qty: 120, unit: 'g', unitCost: 17.8, costUnit: 'kg' },
        { name: 'Molho de tomate da casa', qty: 150, unit: 'g', isRecipe: true },
        { name: 'Parmesão ralado', qty: 15, unit: 'gr' },
        { name: 'Caixa delivery kraft', qty: 1, unit: 'un', isPackaging: true, lineCost: 1.2 },
      ],
      steps: ['Cozinhar a massa por 8 minutos', 'Aquecer o molho e montar'],
    },
  ],
  sales: [
    { product: 'SPAGHETTI SUGO', month: '2026-09', qty: 300 },
    { product: 'SPAGHETTI SUGO', month: '2026-10', qty: 340 },
    { product: 'Spaghetti sugo', month: '2026-10', qty: 20 }, // mesma linha repetida no relatório: soma
    { product: 'Coca-Cola lata', month: '2026-10', qty: 410 },
  ],
  warnings: ['Ficha "Fettuccine" ilegível na foto'],
};

describe('IA das fichas: unidades', () => {
  it('converte para g, ml e un', () => {
    expect(toBase(2.5, 'KG')).toEqual({ qty: 2500, unit: 'g', known: true });
    expect(toBase(1.5, 'Litros')).toEqual({ qty: 1500, unit: 'ml', known: true });
    expect(toBase(15, 'gr')).toEqual({ qty: 15, unit: 'g', known: true });
    expect(toBase(2, 'fatias')).toEqual({ qty: 2, unit: 'un', known: true });
    expect(toBase(3, 'colher')).toMatchObject({ unit: 'un', known: false });
  });

  it('junta as respostas de várias abas sem repetir ficha', () => {
    const merged = mergeExtractions([
      { fichas: [{ name: 'Lasanha', kind: 'product', ingredients: [{ name: 'Massa', qty: 1, unit: 'un' }] }], sales: [], warnings: [] },
      { fichas: [{ name: 'LASANHA', kind: 'product', ingredients: [{ name: 'Massa', qty: 1, unit: 'un' }, { name: 'Molho', qty: 100, unit: 'g' }] }], warnings: ['x'] },
      { sales: [{ product: 'Lasanha', month: '2026-10', qty: 0 }] },
    ]);
    expect(merged.fichas).toHaveLength(1);
    expect(merged.fichas[0].ingredients).toHaveLength(2);
    expect(merged.sales).toHaveLength(0); // quantidade zero não entra
    expect(merged.warnings).toEqual(['x']);
  });
});

describe('IA das fichas: cardápio de exemplo', () => {
  it('reconhece o exemplo intacto e preserva o que alguém editou', () => {
    const data = seedVeroPasta();
    const roundTrip: PricingData = JSON.parse(JSON.stringify(data)); // como volta do banco
    roundTrip.products[0] = { ...roundTrip.products[0], salePrice: 44.9 };
    const ex = findExampleData(roundTrip);
    expect(ex.present).toBe(true);
    expect(ex.remove.products).not.toContain(data.products[0].id);
    expect(ex.remove.products).toHaveLength(data.products.length - 1);
    expect(ex.remove.ingredients).toHaveLength(data.ingredients.length);
    expect(ex.remove.config.expenses).toHaveLength(data.config.expenses.length);
    expect(ex.kept).toEqual([data.products[0].name]);
    expect(findExampleData(empty()).present).toBe(false);
  });
});

describe('IA das fichas: plano de cadastro', () => {
  const plan: ImportPlan = buildImportPlan(extraction, empty(), { removeExample: false, salesMode: 'average', now: NOW });

  it('cria receita base, produto, ingredientes e embalagem ligados entre si', () => {
    expect(plan.recipes).toHaveLength(1);
    const recipe = plan.recipes[0];
    expect(recipe).toMatchObject({ action: 'create', item: { name: 'Molho de tomate da casa', unit: 'g', yieldQty: 2000 } });
    expect(recipe.item.lines).toHaveLength(3);

    expect(plan.products).toHaveLength(1);
    const p = plan.products[0].item;
    expect(p).toMatchObject({ name: 'Spaghetti ao sugo', kind: 'product', category: 'Massas', salePrice: 42, laborMinutes: 8, code: 'P01' });
    expect(p.lines).toEqual([
      expect.objectContaining({ kind: 'ingredient', qty: 120 }),
      { kind: 'recipe', refId: recipe.item.id, qty: 150 },
      expect.objectContaining({ kind: 'ingredient', qty: 15 }),
    ]);
    expect(p.packaging).toHaveLength(1);
    expect(p.ops?.steps.map((s) => s.text)).toEqual(['Cozinhar a massa por 8 minutos', 'Aquecer o molho e montar']);
    expect(plan.newCategories).toEqual([]); // "Massas" já existe nas categorias padrão
  });

  it('preço do ingrediente vem do custo da ficha quando existe', () => {
    const byName = Object.fromEntries(plan.newIngredients.map((i) => [i.name, i]));
    expect(byName['Tomate pelado']).toMatchObject({ unit: 'g', purchaseQty: 1000, price: 15 }); // R$ 37,50 por 2,5 kg
    expect(byName['Cebola']).toMatchObject({ price: 6 });
    expect(byName['Spaghetti']).toMatchObject({ price: 17.8 });
    expect(byName['Azeite']).toMatchObject({ unit: 'ml', price: 0 }); // sem custo: a nota fiscal preenche
    expect(plan.newPackaging[0]).toMatchObject({ name: 'Caixa delivery kraft', packQty: 1, packPrice: 1.2 });
  });

  it('vendas por mês viram a média mensal do produto', () => {
    expect(plan.sales).toEqual([
      expect.objectContaining({ productName: 'Spaghetti ao sugo', monthly: 330, months: ['2026-09', '2026-10'] }), // (300 + 360) / 2
    ]);
    expect(plan.unmatchedSales).toEqual(['Coca-Cola lata']);
    const last = buildImportPlan(extraction, empty(), { removeExample: false, salesMode: 'last', now: NOW });
    expect(last.sales[0].monthly).toBe(360);
  });

  it('avisa o que faltou', () => {
    expect(plan.warnings).toContain('Ficha "Fettuccine" ilegível na foto');
  });

  it('com o exemplo carregado, atualiza a ficha existente ou cria nova se o exemplo sair', () => {
    const seed = seedVeroPasta();
    const keepEx = buildImportPlan(extraction, seed, { removeExample: false, salesMode: 'average', now: NOW });
    const spaghetti = keepEx.products[0];
    expect(spaghetti.action).toBe('update');
    expect(spaghetti.item.id).toBe('prod-spaghetti-sugo');
    expect(spaghetti.item.version).toBe(2);
    // "Tomate pelado" reconhece o "Tomate pelado lata 2,5kg" do exemplo e propõe o preço da ficha
    expect(keepEx.priceUpdates).toEqual([expect.objectContaining({ id: 'ing-tomate-pelado', before: 34.9, after: 37.5 })]);

    const replace = buildImportPlan(extraction, seed, { removeExample: true, salesMode: 'average', now: NOW });
    expect(replace.products[0].action).toBe('create');
    expect(replace.priceUpdates).toEqual([]);
    expect(replace.products[0].item.code).toBe('P01'); // sem o exemplo, as fichas reais começam do P01
    expect(keepEx.products.find((p) => p.action === 'create')).toBeUndefined();
  });
});

describe('IA das fichas: gravação', () => {
  it('grava só o marcado e leva junto a receita que o produto usa', () => {
    const plan = buildImportPlan(extraction, empty(), { removeExample: false, salesMode: 'average', now: NOW });
    const all = planWrites(plan, empty(), {
      products: new Set(plan.products.map((p) => p.key)),
      recipes: new Set(),
      priceUpdates: new Set(),
      applySales: true,
      removeExample: false,
    });
    expect(all.counts).toMatchObject({ products: 1, recipes: 1, ingredients: 5, packaging: 1, sales: 1, removed: 0 });
    const product = all.writes.find((w) => w.kind === 'products')!.item as any;
    expect(product.monthlySales).toBe(330);

    const none = planWrites(plan, empty(), { products: new Set(), recipes: new Set(), priceUpdates: new Set(), applySales: false, removeExample: false });
    expect(none.writes).toEqual([]);

    // a ficha gravada calcula custo com o cadastro novo:
    // massa 120 g × R$ 17,80/kg + molho 150 g (R$ 38,70 rende 2 kg) + parmesão ainda sem preço
    const data: PricingData = { ...empty() };
    for (const w of all.writes) (data as any)[w.kind].push(w.item);
    const cost = productCost(buildContext(data), product);
    expect(cost.ingredients).toBeCloseTo(2.136 + 2.9025, 4);
    expect(cost.packaging).toBeCloseTo(1.2, 4);
  });

  it('tira o exemplo intacto, inclusive despesas e equipe, quando pedido', () => {
    const seed = JSON.parse(JSON.stringify(seedVeroPasta())) as PricingData;
    const plan = buildImportPlan(extraction, seed, { removeExample: true, salesMode: 'average', now: NOW });
    const out = planWrites(plan, seed, {
      products: new Set(plan.products.map((p) => p.key)),
      recipes: new Set(plan.recipes.map((r) => r.key)),
      priceUpdates: new Set(),
      applySales: true,
      removeExample: true,
    });
    expect(out.deletes.filter((d) => d.kind === 'products')).toHaveLength(seed.products.length);
    expect(out.deletes.filter((d) => d.kind === 'combos')).toHaveLength(seed.combos.length);
    expect(out.config).toMatchObject({ expenses: [], employees: [], equipment: [], energy: [] });
  });
});
