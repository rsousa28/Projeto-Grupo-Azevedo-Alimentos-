// Cardápio inicial da Vero Pasta para começar a Precificação PRO já preenchida.
// Preços de compra são referências de mercado (nov/2026): ajuste com as notas reais.
// Nutrientes por 100 g / 100 ml aproximados da Tabela TACO e de rótulos comuns.
import type {
  BaseRecipe,
  Combo,
  Ingredient,
  Nutrients,
  OperationalSheet,
  Packaging,
  PricingConfig,
  PricingData,
  Product,
  RecipeLine,
  Unit,
} from './types';

const now = () => new Date().toISOString();

export function defaultConfig(): PricingConfig {
  return {
    taxPct: 0.06,
    cardFeePct: 0.025,
    deliveryFeePct: 0.23,
    deliveryCardFeePct: 0.032,
    targetMarginPct: 0.15,
    cmvTargetPct: 0.32,
    revenueEstimate: 0,
    payrollMode: 'unit',
    expenses: [],
    employees: [],
    equipment: [],
    energy: [],
    categories: ['Massas', 'Lasanhas', 'Parmegianas', 'Wraps', 'Sobremesas', 'Bebidas'],
    updatedAt: now(),
  };
}

type N = Partial<Nutrients>;

const ING: Array<[string, string, Unit, number, number, number, string, N, number?]> = [
  // id, nome, unidade, qtd bruta, qtd líquida, preço, fornecedor, nutrientes, g por unidade
  ['massa-seca', 'Spaghetti grano duro 500g', 'g', 500, 500, 8.9, 'Atacadão', { kcal: 371, carb: 75, sugarTotal: 2.7, protein: 13, fatTotal: 1.5, fatSat: 0.3, fiber: 3.2, sodium: 6 }],
  ['massa-lasanha', 'Massa para lasanha 500g', 'g', 500, 500, 9.5, 'Atacadão', { kcal: 371, carb: 75, sugarTotal: 2.7, protein: 13, fatTotal: 1.5, fatSat: 0.3, fiber: 3.2, sodium: 6 }],
  ['farinha', 'Farinha de trigo tipo 00 1kg', 'g', 1000, 1000, 7.9, 'Atacadão', { kcal: 360, carb: 75, sugarTotal: 0.3, protein: 9.8, fatTotal: 1.4, fatSat: 0.2, fiber: 2.3, sodium: 1 }],
  ['ovo', 'Ovo branco (bandeja 30)', 'un', 30, 30, 22.9, 'Granja Local', { kcal: 143, carb: 1.6, sugarTotal: 0.4, protein: 13, fatTotal: 8.9, fatSat: 2.6, sodium: 168 }, 50],
  ['tomate-pelado', 'Tomate pelado lata 2,5kg', 'g', 2500, 2500, 34.9, 'Distribuidora Itália', { kcal: 21, carb: 3.9, sugarTotal: 2.6, protein: 1, fatTotal: 0.2, fiber: 1.2, sodium: 130 }],
  ['cebola', 'Cebola 1kg', 'g', 1000, 900, 5.99, 'CEASA', { kcal: 39, carb: 8.9, sugarTotal: 4.2, protein: 1.7, fatTotal: 0.1, fiber: 2.2, sodium: 1 }],
  ['alho', 'Alho descascado 1kg', 'g', 1000, 1000, 32.9, 'CEASA', { kcal: 113, carb: 23.9, sugarTotal: 1, protein: 7, fatTotal: 0.2, fiber: 4.3, sodium: 5 }],
  ['azeite', 'Azeite extra virgem 5L', 'ml', 5000, 5000, 189.9, 'Distribuidora Itália', { kcal: 884, fatTotal: 100, fatSat: 14 }],
  ['oleo', 'Óleo de soja 900ml', 'ml', 900, 900, 7.49, 'Atacadão', { kcal: 884, fatTotal: 100, fatSat: 15 }],
  ['manteiga', 'Manteiga com sal 500g', 'g', 500, 500, 24.9, 'Laticínios Serra', { kcal: 726, fatTotal: 82, fatSat: 51, fatTrans: 3, protein: 0.4, sodium: 579 }],
  ['creme-leite', 'Creme de leite 1kg', 'g', 1000, 1000, 21.9, 'Laticínios Serra', { kcal: 221, carb: 4.5, sugarTotal: 4.5, protein: 1.5, fatTotal: 22, fatSat: 14, sodium: 52 }],
  ['leite', 'Leite integral 1L', 'ml', 1000, 1000, 5.49, 'Laticínios Serra', { kcal: 61, carb: 4.7, sugarTotal: 4.7, protein: 3.2, fatTotal: 3.3, fatSat: 2.1, sodium: 50 }],
  ['parmesao', 'Queijo parmesão ralado 1kg', 'g', 1000, 1000, 89.9, 'Laticínios Serra', { kcal: 453, carb: 1.7, protein: 35.6, fatTotal: 33.5, fatSat: 21, sodium: 1844 }],
  ['mussarela', 'Queijo mussarela 1kg', 'g', 1000, 1000, 39.9, 'Laticínios Serra', { kcal: 330, carb: 3, protein: 22.6, fatTotal: 25.2, fatSat: 15, sodium: 581 }],
  ['frango', 'Peito de frango 1kg', 'g', 1000, 870, 21.9, 'Avícola Cearense', { kcal: 119, protein: 21.5, fatTotal: 3, fatSat: 0.9, sodium: 56 }],
  ['carne-moida', 'Patinho moído 1kg', 'g', 1000, 950, 42.9, 'Frigorífico Central', { kcal: 133, protein: 21.7, fatTotal: 4.5, fatSat: 2, sodium: 49 }],
  ['bacon', 'Bacon em cubos 1kg', 'g', 1000, 1000, 44.9, 'Frigorífico Central', { kcal: 400, carb: 1, protein: 14, fatTotal: 38, fatSat: 13, sodium: 1500 }],
  ['farinha-rosca', 'Farinha panko 1kg', 'g', 1000, 1000, 24.9, 'Atacadão', { kcal: 395, carb: 72, sugarTotal: 6, sugarAdded: 4, protein: 13, fatTotal: 5, fatSat: 1, fiber: 4, sodium: 732 }],
  ['tortilha', 'Tortilha para wrap (pacote 10)', 'un', 10, 10, 17.9, 'Atacadão', { kcal: 300, carb: 50, sugarTotal: 2, sugarAdded: 1, protein: 8, fatTotal: 7, fatSat: 3, fiber: 2, sodium: 600 }, 40],
  ['alface', 'Alface americana (pé)', 'g', 500, 400, 4.5, 'CEASA', { kcal: 11, carb: 1.7, protein: 1.3, fatTotal: 0.2, fiber: 1.8, sodium: 3 }],
  ['manjericao', 'Manjericão fresco (maço 100g)', 'g', 100, 70, 4.0, 'CEASA', { kcal: 23, carb: 2.6, protein: 3.2, fatTotal: 0.6, fiber: 1.6, sodium: 4 }],
  ['sal', 'Sal refinado 1kg', 'g', 1000, 1000, 3.49, 'Atacadão', { sodium: 39000 }],
  ['acucar', 'Açúcar refinado 1kg', 'g', 1000, 1000, 4.99, 'Atacadão', { kcal: 387, carb: 100, sugarTotal: 100, sugarAdded: 100 }],
  ['pimenta', 'Pimenta-do-reino moída 100g', 'g', 100, 100, 6.9, 'Atacadão', { kcal: 251, carb: 64, protein: 10, fatTotal: 3.3, fiber: 25, sodium: 20 }],
  ['coca', 'Refrigerante cola lata 350ml (fardo 12)', 'un', 12, 12, 38.9, 'Distribuidora Bebidas', { kcal: 42, carb: 10.6, sugarTotal: 10.6, sugarAdded: 10.6, sodium: 10 }, 350],
  ['agua', 'Água mineral 500ml (fardo 12)', 'un', 12, 12, 14.9, 'Distribuidora Bebidas', {}, 500],
];

const PACK: Array<[string, string, number, number]> = [
  ['pote-termico', 'Pote térmico 500ml c/ tampa', 100, 186],
  ['marmita-aluminio', 'Marmita de alumínio 650g c/ tampa', 100, 190],
  ['saco-kraft', 'Saco kraft delivery', 100, 60],
  ['lacre', 'Lacre de segurança adesivo', 500, 50],
  ['guardanapo', 'Guardanapo (pacote 50)', 50, 3.49],
  ['kit-talher', 'Kit talher + guardanapo', 100, 45],
  ['envelope-wrap', 'Envelope antigordura para wrap', 200, 150],
  ['sache-parmesao', 'Sachê de parmesão 10g', 100, 79],
];

const ing = (id: string, qty: number): RecipeLine => ({ kind: 'ingredient', refId: `ing-${id}`, qty });
const rec = (id: string, qty: number): RecipeLine => ({ kind: 'recipe', refId: `rec-${id}`, qty });
const pk = (id: string, qty = 1) => ({ packagingId: `pack-${id}`, qty });

const RECIPES: Array<[string, string, Unit, number, number, number, RecipeLine[]]> = [
  ['molho-tomate', 'Molho de tomate da casa', 'g', 2000, 60, 1, [ing('tomate-pelado', 2400), ing('cebola', 200), ing('alho', 30), ing('azeite', 60), ing('manjericao', 15), ing('sal', 20), ing('acucar', 10)]],
  ['molho-branco', 'Molho branco (bechamel)', 'g', 1500, 25, 1, [ing('leite', 1200), ing('manteiga', 80), ing('farinha', 80), ing('creme-leite', 200), ing('sal', 8)]],
  ['massa-fresca', 'Massa fresca de ovos', 'g', 1500, 40, 1, [ing('farinha', 1000), ing('ovo', 10), ing('sal', 10), ing('azeite', 20)]],
  ['ragu', 'Ragu à bolonhesa', 'g', 1600, 90, 1, [ing('carne-moida', 1000), rec('molho-tomate', 800), ing('cebola', 100), ing('alho', 15), ing('azeite', 30), ing('sal', 10), ing('pimenta', 2)]],
  ['frango-empanado', 'Frango empanado', 'g', 1100, 40, 1, [ing('frango', 1000), ing('ovo', 3), ing('farinha-rosca', 200), ing('farinha', 100), ing('sal', 10), ing('oleo', 200)]],
];

const ops = (utensils: string[], steps: Array<[string, string]>, assembly: string, checks: string[]): OperationalSheet => ({
  utensils,
  steps: steps.map(([title, text], i) => ({ id: `step-${i + 1}`, title, text })),
  assembly,
  checks,
});

const DELIVERY_PASTA = [pk('pote-termico'), pk('saco-kraft'), pk('lacre'), pk('kit-talher')];

interface SeedProduct {
  id: string;
  name: string;
  category: string;
  kind?: 'product' | 'drink';
  lines: RecipeLine[];
  salePrice: number;
  deliveryPrice: number;
  monthlySales: number;
  laborMinutes?: number;
  energy?: Array<[string, number, number]>;
  packaging?: ReturnType<typeof pk>[];
  deliveryPackaging?: ReturnType<typeof pk>[];
  portionLabel?: string;
  liquid?: boolean;
  ops?: OperationalSheet;
}

const PRODUCTS: SeedProduct[] = [
  {
    id: 'spaghetti-sugo', name: 'Spaghetti ao sugo', category: 'Massas', salePrice: 39.9, deliveryPrice: 46.9, monthlySales: 300,
    lines: [ing('massa-seca', 120), rec('molho-tomate', 180), ing('parmesao', 15), ing('manjericao', 2)],
    laborMinutes: 6, energy: [['fogao', 12, 4]], packaging: [pk('guardanapo')], deliveryPackaging: DELIVERY_PASTA,
    ops: ops(['Balança', 'Panela de cozimento', 'Frigideira', 'Pegador de massa', 'Concha', 'Prato fundo'],
      [['Prepare a estação', 'Separe e confira as porções. Água em fervura com sal.'],
       ['Cozinhe a massa', 'Cozinhe 120 g de spaghetti por 8 a 9 minutos (al dente).'],
       ['Aqueça o molho', 'Na frigideira, aqueça 180 g de molho de tomate da casa.'],
       ['Salteie', 'Escorra a massa direto na frigideira e envolva no molho por 1 minuto.'],
       ['Finalize', 'Empratar em ninho, parmesão por cima e folhas de manjericão.']],
      'Massa → molho → parmesão → manjericão', ['Massa al dente', 'Molho envolvendo toda a massa', 'Prato limpo nas bordas']),
  },
  {
    id: 'fettuccine-alfredo', name: 'Fettuccine Alfredo', category: 'Massas', salePrice: 49.9, deliveryPrice: 57.9, monthlySales: 180,
    lines: [rec('massa-fresca', 200), rec('molho-branco', 180), ing('parmesao', 20), ing('manteiga', 10)],
    laborMinutes: 7, energy: [['fogao', 10, 4]], packaging: [pk('guardanapo')], deliveryPackaging: DELIVERY_PASTA,
    ops: ops(['Balança', 'Panela de cozimento', 'Frigideira', 'Pegador de massa', 'Prato fundo'],
      [['Prepare a estação', 'Separe massa fresca, molho branco, manteiga e parmesão.'],
       ['Cozinhe a massa', 'Massa fresca cozinha em 2 a 3 minutos.'],
       ['Monte o molho', 'Derreta a manteiga, junte o molho branco e metade do parmesão.'],
       ['Finalize', 'Envolva a massa no molho e finalize com o restante do parmesão.']],
      'Massa → molho → parmesão', ['Molho cremoso sem talhar', 'Massa sem grudar']),
  },
  {
    id: 'spaghetti-bolonhesa', name: 'Spaghetti à bolonhesa', category: 'Massas', salePrice: 46.9, deliveryPrice: 54.9, monthlySales: 350,
    lines: [ing('massa-seca', 120), rec('ragu', 200), ing('parmesao', 15)],
    laborMinutes: 6, energy: [['fogao', 12, 4]], packaging: [pk('guardanapo')], deliveryPackaging: DELIVERY_PASTA,
    ops: ops(['Balança', 'Panela de cozimento', 'Frigideira', 'Pegador de massa', 'Concha'],
      [['Cozinhe a massa', '120 g de spaghetti, 8 a 9 minutos.'],
       ['Aqueça o ragu', '200 g de ragu na frigideira até ferver.'],
       ['Finalize', 'Massa no molho, empratar e parmesão por cima.']],
      'Massa → ragu → parmesão', ['Ragu bem quente', 'Porção conferida na balança']),
  },
  {
    id: 'lasanha-bolonhesa', name: 'Lasanha à bolonhesa', category: 'Lasanhas', salePrice: 52.9, deliveryPrice: 59.9, monthlySales: 220,
    lines: [ing('massa-lasanha', 120), rec('ragu', 250), rec('molho-branco', 150), ing('mussarela', 100), ing('parmesao', 15)],
    laborMinutes: 10, energy: [['forno', 40, 8]], packaging: [pk('guardanapo')], deliveryPackaging: [pk('marmita-aluminio'), pk('saco-kraft'), pk('lacre'), pk('kit-talher')],
    ops: ops(['Balança', 'Assadeira', 'Concha', 'Espátula', 'Forno'],
      [['Monte as camadas', 'Molho branco no fundo, massa, ragu e mussarela. Repita 3 vezes.'],
       ['Gratine', 'Parmesão por cima e forno a 200 °C por 40 minutos (8 porções).'],
       ['Porcione', 'Descanse 10 minutos e corte em 8 porções iguais.']],
      'Molho branco → massa → ragu → mussarela (3x) → parmesão', ['Gratinado dourado', 'Porção com 3 camadas visíveis']),
  },
  {
    id: 'parmegiana-frango', name: 'Parmegiana de frango', category: 'Parmegianas', salePrice: 54.9, deliveryPrice: 62.9, monthlySales: 260,
    lines: [rec('frango-empanado', 220), rec('molho-tomate', 150), ing('mussarela', 80), ing('parmesao', 10), ing('massa-seca', 100)],
    laborMinutes: 9, energy: [['fritadeira', 6, 4], ['forno', 8, 6]], packaging: [pk('guardanapo')], deliveryPackaging: [pk('marmita-aluminio'), pk('saco-kraft'), pk('lacre'), pk('kit-talher')],
    ops: ops(['Balança', 'Fritadeira', 'Assadeira', 'Pegador', 'Panela de cozimento'],
      [['Frite o frango', 'Frango empanado a 180 °C por 6 minutos até dourar.'],
       ['Cubra e gratine', 'Molho de tomate, mussarela e parmesão. Forno até derreter.'],
       ['Acompanhamento', 'Spaghetti ao sugo de 100 g ao lado.']],
      'Frango → molho → mussarela → parmesão; massa ao lado', ['Empanado crocante nas bordas', 'Queijo derretido']),
  },
  {
    id: 'wrap-frango', name: 'Wrap de frango crocante', category: 'Wraps', salePrice: 32.9, deliveryPrice: 38.9, monthlySales: 150,
    lines: [ing('tortilha', 1), rec('frango-empanado', 120), ing('alface', 30), rec('molho-branco', 40), ing('mussarela', 30)],
    laborMinutes: 5, energy: [['fritadeira', 6, 4]], packaging: [pk('envelope-wrap'), pk('guardanapo')], deliveryPackaging: [pk('saco-kraft'), pk('lacre')],
    ops: ops(['Balança', 'Chapa', 'Faca', 'Tábua'],
      [['Aqueça a tortilha', '30 segundos de cada lado na chapa.'],
       ['Recheie', 'Molho, alface, frango fatiado e mussarela.'],
       ['Feche', 'Enrole firme, corte na diagonal e embale no envelope.']],
      'Tortilha → molho → alface → frango → mussarela', ['Wrap firme, sem vazar']),
  },
  { id: 'coca-lata', name: 'Refrigerante cola lata', category: 'Bebidas', kind: 'drink', salePrice: 7, deliveryPrice: 8, monthlySales: 400, lines: [ing('coca', 1)], portionLabel: '1 lata', liquid: true },
  { id: 'agua', name: 'Água mineral 500ml', category: 'Bebidas', kind: 'drink', salePrice: 5, deliveryPrice: 6, monthlySales: 250, lines: [ing('agua', 1)], portionLabel: '1 garrafa', liquid: true },
];

export function seedVeroPasta(): PricingData {
  const t = now();
  const config: PricingConfig = {
    ...defaultConfig(),
    expenses: [
      { id: 'exp-aluguel', name: 'Aluguel', value: 6000, kind: 'fixed' },
      { id: 'exp-energia', name: 'Energia (conta da loja)', value: 2500, kind: 'fixed' },
      { id: 'exp-agua', name: 'Água', value: 400, kind: 'fixed' },
      { id: 'exp-internet', name: 'Internet e telefone', value: 150, kind: 'fixed' },
      { id: 'exp-contador', name: 'Contabilidade', value: 800, kind: 'fixed' },
      { id: 'exp-sistema', name: 'Sistemas (PDV, iFood)', value: 200, kind: 'fixed' },
      { id: 'exp-marketing', name: 'Marketing e anúncios', value: 800, kind: 'variable' },
      { id: 'exp-manutencao', name: 'Manutenção', value: 300, kind: 'variable' },
    ],
    employees: [
      { id: 'emp-cozinheiro', name: 'Cozinheiro', role: 'Cozinha', salary: 2400, chargesPct: 0.36, benefits: 400, hoursPerMonth: 220 },
      { id: 'emp-auxiliar', name: 'Auxiliar de cozinha', role: 'Cozinha', salary: 1700, chargesPct: 0.36, benefits: 400, hoursPerMonth: 220 },
      { id: 'emp-atendente', name: 'Atendente', role: 'Salão', salary: 1700, chargesPct: 0.36, benefits: 400, hoursPerMonth: 220 },
    ],
    equipment: [
      { id: 'eq-fogao', name: 'Fogão industrial 6 bocas', value: 4500, lifeYears: 10, residualValue: 500 },
      { id: 'eq-forno', name: 'Forno elétrico', value: 9000, lifeYears: 10, residualValue: 1000 },
      { id: 'eq-geladeira', name: 'Geladeira comercial', value: 6000, lifeYears: 10, residualValue: 600 },
      { id: 'eq-freezer', name: 'Freezer horizontal', value: 4000, lifeYears: 8, residualValue: 400 },
      { id: 'eq-fritadeira', name: 'Fritadeira elétrica', value: 2500, lifeYears: 6, residualValue: 0 },
    ],
    energy: [
      { id: 'en-fogao', name: 'Fogão industrial (1 boca)', type: 'gas', cylinderPrice: 480, cylinderKg: 45, kgPerHour: 0.25 },
      { id: 'en-forno', name: 'Forno elétrico', type: 'electric', powerWatts: 4000, kwhPrice: 0.95 },
      { id: 'en-fritadeira', name: 'Fritadeira elétrica', type: 'electric', powerWatts: 3500, kwhPrice: 0.95 },
    ],
    updatedAt: t,
  };

  const ingredients: Ingredient[] = ING.map(([id, name, unit, purchaseQty, netQty, price, supplier, nutrients, gramsPerUnit], i) => ({
    id: `ing-${id}`,
    code: String(i + 1).padStart(4, '0'),
    name,
    unit,
    purchaseQty,
    netQty,
    price,
    supplier,
    nutrients,
    ...(gramsPerUnit ? { gramsPerUnit } : {}),
    priceHistory: [{ date: t, price, purchaseQty }],
    updatedAt: t,
  }));

  const packaging: Packaging[] = PACK.map(([id, name, packQty, packPrice], i) => ({
    id: `pack-${id}`,
    code: String(i + 1).padStart(4, '0'),
    name,
    packQty,
    packPrice,
    updatedAt: t,
  }));

  const recipes: BaseRecipe[] = RECIPES.map(([id, name, unit, yieldQty, prepMinutes, workers, lines], i) => ({
    id: `rec-${id}`,
    code: String(i + 1).padStart(4, '0'),
    name,
    unit,
    yieldQty,
    prepMinutes,
    workers,
    lossFactor: 1,
    lines,
    updatedAt: t,
  }));

  let productCount = 0;
  let drinkCount = 0;
  const products: Product[] = PRODUCTS.map((p) => {
    const kind = p.kind || 'product';
    const code = kind === 'drink' ? `B${String(++drinkCount).padStart(2, '0')}` : `P${String(++productCount).padStart(2, '0')}`;
    return {
      id: `prod-${p.id}`,
      code,
      kind,
      name: p.name,
      category: p.category,
      lines: p.lines,
      packaging: p.packaging || [],
      deliveryPackaging: p.deliveryPackaging || [],
      energy: (p.energy || []).map(([src, minutes, batchUnits]) => ({ sourceId: `en-${src}`, minutes, batchUnits })),
      laborMinutes: p.laborMinutes || 0,
      laborWorkers: p.laborMinutes ? 1 : 0,
      extraCost: 0,
      salePrice: p.salePrice,
      deliveryPrice: p.deliveryPrice,
      monthlySales: p.monthlySales,
      portionLabel: p.portionLabel || '1 prato',
      ...(p.liquid ? { liquid: true } : {}),
      ...(p.ops ? { ops: p.ops } : {}),
      version: 1,
      updatedAt: t,
    };
  });

  const combos: Combo[] = [
    {
      id: 'combo-bolonhesa-refri',
      code: 'C01',
      name: 'Spaghetti à bolonhesa + refrigerante',
      items: [
        { productId: 'prod-spaghetti-bolonhesa', qty: 1 },
        { productId: 'prod-coca-lata', qty: 1 },
      ],
      packaging: [],
      salePrice: 49.9,
      deliveryPrice: 58.9,
      monthlySales: 120,
      updatedAt: t,
    },
  ];

  return { config, ingredients, packaging, recipes, products, combos };
}
