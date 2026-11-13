// Importação com IA: o Gemini lê as fichas técnicas e o relatório de vendas (planilha, PDF ou foto) e
// devolve dados estruturados. Aqui eles viram um plano de cadastro (o que é novo, o que atualiza, o que
// sai do cardápio de exemplo) que a pessoa confere antes de gravar. Funções puras (sem DOM).
import { newId, nextCode } from './engine';
import { nameSimilarity } from './nfe';
import { seedVeroPasta } from './seed';
import type { PricingWrite } from './usePricingData';
import type { BaseRecipe, Ingredient, OperationalSheet, PackLine, Packaging, PricingConfig, PricingData, Product, RecipeLine, Unit } from './types';

// ---------------------------------------------------------------
// O que a IA devolve
// ---------------------------------------------------------------

export interface AiLine {
  name: string;
  qty: number;
  unit: string;
  lineCost?: number; // custo total desta linha da ficha (R$)
  unitCost?: number; // custo de 1 costUnit (R$ por kg, por litro, por unidade...)
  costUnit?: string;
  isPackaging?: boolean;
  isRecipe?: boolean; // preparo da casa com ficha própria (molho, massa fresca...)
}

export interface AiFicha {
  name: string;
  kind?: 'product' | 'recipe' | 'drink';
  category?: string;
  yieldQty?: number;
  yieldUnit?: string;
  salePrice?: number;
  deliveryPrice?: number;
  prepMinutes?: number;
  ingredients: AiLine[];
  steps?: string[];
}

export interface AiSale {
  product: string;
  month: string; // AAAA-MM
  qty: number;
  revenue?: number;
}

export interface AiExtraction {
  fichas: AiFicha[];
  sales: AiSale[];
  warnings: string[];
}

const LINE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    qty: { type: 'NUMBER' },
    unit: { type: 'STRING' },
    lineCost: { type: 'NUMBER' },
    unitCost: { type: 'NUMBER' },
    costUnit: { type: 'STRING' },
    isPackaging: { type: 'BOOLEAN' },
    isRecipe: { type: 'BOOLEAN' },
  },
  required: ['name', 'qty', 'unit'],
};

export const FICHAS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fichas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          kind: { type: 'STRING', description: 'product, recipe ou drink' },
          category: { type: 'STRING' },
          yieldQty: { type: 'NUMBER' },
          yieldUnit: { type: 'STRING' },
          salePrice: { type: 'NUMBER' },
          deliveryPrice: { type: 'NUMBER' },
          prepMinutes: { type: 'NUMBER' },
          ingredients: { type: 'ARRAY', items: LINE_SCHEMA },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['name', 'kind', 'ingredients'],
      },
    },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['fichas', 'warnings'],
};

export const SALES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sales: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          product: { type: 'STRING' },
          month: { type: 'STRING' },
          qty: { type: 'NUMBER' },
          revenue: { type: 'NUMBER' },
        },
        required: ['product', 'month', 'qty'],
      },
    },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['sales', 'warnings'],
};

export const FICHAS_INSTRUCTION = `Você lê fichas técnicas de restaurante (planilha em texto CSV, PDF ou foto) e devolve JSON.
Para cada ficha encontrada:
- name: nome do produto ou do preparo, como está escrito.
- kind: "product" para prato vendido ao cliente, "drink" para bebida vendida, "recipe" para preparo base usado em outras fichas (molhos, massas frescas, recheios, caldos).
- category: categoria do cardápio se aparecer (Massas, Lasanhas, Sobremesas...).
- yieldQty e yieldUnit: rendimento total da ficha (para preparo base) ou peso da porção.
- salePrice e deliveryPrice: preço de venda no salão e no delivery, só se aparecerem.
- prepMinutes: tempo de preparo em minutos, só se aparecer.
- ingredients: uma linha por insumo da ficha.
  · name: só o nome do insumo, como se compra. NÃO coloque no nome a porção nem a unidade de compra: "Queijo Mussarela (40g)" vira name "Queijo Mussarela"; "Carne de Sol 1 KG (60 g)" vira "Carne de Sol"; "Sache de Ketchup UND (3 un)" vira "Sache de Ketchup".
  · qty e unit: a quantidade usada NESTE prato (a porção), não a embalagem comprada. Ex.: 40 g de mussarela → qty 40, unit "g"; 10 ml de azeite → qty 10, unit "ml"; 2 sachês → qty 2, unit "un".
  · unitCost e costUnit: o preço de compra do insumo e a unidade desse preço (R$ 35,00 o quilo → unitCost 35, costUnit "kg"; R$ 0,46 o litro → costUnit "l"; R$ 1,12 a unidade → costUnit "un").
  · lineCost: o custo da porção usada no prato, se a ficha mostrar.
  · isPackaging = true para embalagens e descartáveis (caixa, pote, tampa, marmitex, sacola, papel bandeja, guardanapo, sachê, talher, copo, canudo).
  · isRecipe = true quando o item for um preparo da casa que tem ficha própria.
- steps: modo de preparo em passos curtos, se houver.
Regras: não invente nada que não esteja no arquivo. Números no formato brasileiro (1.234,56 = 1234.56). Ignore linhas de total e subtotal. Escreva em warnings o que estiver ilegível, ambíguo ou incompleto, citando a ficha.`;

export const SALES_INSTRUCTION = `Você lê relatórios de vendas de restaurante (planilha em texto CSV, PDF ou foto) e devolve JSON.
Para cada produto e cada mês: product (nome como está no relatório), month no formato AAAA-MM, qty (quantidade vendida) e revenue (faturamento do produto no mês, se houver).
- Se o relatório for de um único período sem data nas linhas, use o mês do título, do cabeçalho ou do nome do arquivo. Se não houver mês em lugar nenhum, use "0000-00".
- Some linhas repetidas do mesmo produto no mesmo mês.
- Ignore linhas de total, subtotal, taxa de serviço, couvert, gorjeta, taxa de entrega e descontos.
- Números no formato brasileiro (1.234,56 = 1234.56). Não invente nada. Escreva em warnings o que estiver ilegível ou ambíguo.`;

/** Junta as respostas de cada arquivo/aba. Ficha repetida (mesmo nome) fica com a versão mais completa. */
export function mergeExtractions(parts: Array<Partial<AiExtraction>>): AiExtraction {
  const fichas = new Map<string, AiFicha>();
  const sales: AiSale[] = [];
  const warnings: string[] = [];
  for (const p of parts) {
    for (const raw of p.fichas || []) {
      if (!raw?.name || !Array.isArray(raw.ingredients)) continue;
      const k = strip(String(raw.kind || ''));
      const f: AiFicha = { ...raw, kind: k.startsWith('rec') || k.startsWith('prep') ? 'recipe' : k.startsWith('drink') || k.startsWith('beb') ? 'drink' : 'product' };
      const key = normName(f.name);
      const prev = fichas.get(key);
      if (!prev || f.ingredients.length > prev.ingredients.length) fichas.set(key, f);
    }
    for (const s of p.sales || []) if (s?.product && Number(s.qty) > 0) sales.push({ ...s, qty: Number(s.qty) });
    for (const w of p.warnings || []) if (w) warnings.push(String(w));
  }
  return { fichas: [...fichas.values()], sales, warnings };
}

// ---------------------------------------------------------------
// Unidades e custos
// ---------------------------------------------------------------

const strip = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

export const normName = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const KG = ['kg', 'kgs', 'kilo', 'kilos', 'quilo', 'quilos', 'quilograma', 'quilogramas'];
const G = ['g', 'gr', 'grs', 'grama', 'gramas'];
const MG = ['mg', 'miligrama', 'miligramas'];
const L = ['l', 'lt', 'lts', 'litro', 'litros'];
const ML = ['ml', 'mililitro', 'mililitros'];
const UN = ['un', 'und', 'unid', 'unidade', 'unidades', 'u', 'pc', 'pca', 'peca', 'pecas', 'pct', 'pacote', 'pacotes', 'fatia', 'fatias', 'folha', 'folhas', 'dente', 'dentes', 'lata', 'latas', 'garrafa', 'garrafas', 'cx', 'caixa', 'caixas', 'porcao', 'porcoes'];

/** Converte para a unidade do cadastro: g, ml ou un. */
export function toBase(qty: number, unit: string): { qty: number; unit: Unit; known: boolean } {
  const u = strip(unit);
  const q = Number(qty) || 0;
  if (KG.includes(u)) return { qty: q * 1000, unit: 'g', known: true };
  if (G.includes(u)) return { qty: q, unit: 'g', known: true };
  if (MG.includes(u)) return { qty: q / 1000, unit: 'g', known: true };
  if (L.includes(u)) return { qty: q * 1000, unit: 'ml', known: true };
  if (ML.includes(u)) return { qty: q, unit: 'ml', known: true };
  if (UN.includes(u)) return { qty: q, unit: 'un', known: true };
  return { qty: q, unit: 'un', known: false };
}

/** Custo de 1 g / ml / un a partir da linha da ficha, quando a ficha traz custo. */
export function costPerBase(line: AiLine, base: { qty: number; unit: Unit }): number | null {
  if (Number(line.lineCost) > 0 && base.qty > 0) return Number(line.lineCost) / base.qty;
  if (Number(line.unitCost) > 0) {
    const ref = toBase(1, line.costUnit || (base.unit === 'g' ? 'kg' : base.unit === 'ml' ? 'l' : 'un'));
    if (!ref.known || ref.unit !== base.unit) return null;
    return Number(line.unitCost) / ref.qty;
  }
  return null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

const PORTION_RE = /\s*\(\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramas?|ml|l|lt|litros?|un|und|unid|unidades?)\b\.?[^)]*\)\s*$/i;
// Só a unidade de compra genérica ("1 KG", "KG", "UND", "1 L"); medidas que identificam o produto ("350 ml") ficam
const BUY_TOKEN_RE = /(?:^|\s)(1\s*(?:kg|kgs|l|lt|litro|und|unid|un)|kg|kgs|lt|litro|und|unid)\.?(?=\s|$)/gi;
const PACKAGING_RE = /\b(embalage\w*|marmitex|pote|tampa|sacola|papel bandeja|bandeja|guardanapo|sach[eê]s?|talher\w*|garfo|faca descart\w*|colher descart\w*|copo|canudo|caixa|filme pvc|papel alum\w*)\b/i;

export interface CleanName {
  name: string;
  portion?: { qty: number; unit: string }; // porção escrita no nome: "(40g)"
  buyHint?: 'kg' | 'l' | 'un'; // "1 KG", "UND" no nome
}

/**
 * Tira do nome do insumo a porção e a unidade de compra que muitas fichas trazem junto:
 * "Carne de Sol 1 KG (60 g)" -> { name: "Carne de Sol", portion: 60 g, buyHint: kg }.
 */
export function cleanIngredientName(raw: string): CleanName {
  let name = String(raw || '').replace(/\s+/g, ' ').trim();
  let portion: CleanName['portion'];
  const m = name.match(PORTION_RE);
  if (m) {
    portion = { qty: Number(m[1].replace(',', '.')), unit: m[2] };
    name = name.slice(0, m.index).trim();
  }
  let buyHint: CleanName['buyHint'];
  name = name
    .replace(BUY_TOKEN_RE, (_, token: string) => {
      const t = token.toLowerCase().replace(/^1\s*/, '');
      buyHint = t.startsWith('k') ? 'kg' : t.startsWith('l') ? 'l' : 'un';
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { name: name || String(raw).trim(), ...(portion ? { portion } : {}), ...(buyHint ? { buyHint } : {}) };
}

/** É embalagem ou descartável pelo nome (quando a IA não marcou). */
export const looksLikePackaging = (name: string) => PACKAGING_RE.test(name);

function cleanName(s: string): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t && t === t.toUpperCase()) return t.charAt(0) + t.slice(1).toLowerCase(); // "QUEIJO MUSSARELA" -> "Queijo mussarela"
  return t;
}

// ---------------------------------------------------------------
// Cardápio de exemplo
// ---------------------------------------------------------------

/** JSON com as chaves em ordem e sem campos vazios: o mesmo item lido do banco compara igual ao original. */
function stable(v: any): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined && v[k] !== null)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

const comparable = (v: any) => {
  const { updatedAt, priceHistory, version, ...rest } = v || {};
  return stable(rest);
};

export interface ExampleData {
  present: boolean;
  remove: {
    ingredients: string[];
    packaging: string[];
    recipes: string[];
    products: string[];
    combos: string[];
    config: { expenses: string[]; employees: string[]; equipment: string[]; energy: string[] };
  };
  /** Itens do exemplo que alguém editou: ficam no cadastro. */
  kept: string[];
}

/** Itens do cardápio de exemplo ainda iguais ao original (os editados ficam). */
export function findExampleData(data: PricingData): ExampleData {
  const seed = seedVeroPasta();
  const kept: string[] = [];
  const pick = <T extends { id: string; name: string }>(current: T[], original: T[]): string[] => {
    const byId = new Map(original.map((o) => [o.id, o]));
    const out: string[] = [];
    for (const c of current) {
      const o = byId.get(c.id);
      if (!o) continue;
      if (comparable(c) === comparable(o)) out.push(c.id);
      else kept.push(c.name);
    }
    return out;
  };
  const remove = {
    ingredients: pick(data.ingredients, seed.ingredients),
    packaging: pick(data.packaging, seed.packaging),
    recipes: pick(data.recipes, seed.recipes),
    products: pick(data.products, seed.products),
    combos: pick(data.combos, seed.combos),
    config: {
      expenses: pick(data.config.expenses || [], seed.config.expenses),
      employees: pick(data.config.employees || [], seed.config.employees),
      equipment: pick(data.config.equipment || [], seed.config.equipment),
      energy: pick(data.config.energy || [], seed.config.energy),
    },
  };
  const count = exampleSize({ remove });
  return { present: count > 0 || kept.length > 0, remove, kept };
}

/** Quantos itens do exemplo saem (cadastros e também despesas, equipe, equipamentos e energia). */
export function exampleSize(example: Pick<ExampleData, 'remove'>): number {
  return Object.values(example.remove).reduce((n, v) => n + (Array.isArray(v) ? v.length : Object.values(v).reduce((m, x) => m + x.length, 0)), 0);
}

// ---------------------------------------------------------------
// Plano de importação
// ---------------------------------------------------------------

export interface PlanEntry<T> {
  key: string;
  action: 'create' | 'update';
  item: T;
  before?: T;
  ingredientIds: string[];
  recipeIds: string[];
  packagingIds: string[];
}

export interface PriceUpdate {
  id: string;
  name: string;
  before: number;
  after: number;
  purchaseQty: number;
  unit: Unit;
}

export interface SalesMatch {
  productId: string;
  productName: string;
  reportName: string;
  monthly: number;
  months: string[];
}

export interface ImportPlan {
  products: PlanEntry<Product>[];
  recipes: PlanEntry<BaseRecipe>[];
  newIngredients: Ingredient[];
  newPackaging: Packaging[];
  priceUpdates: PriceUpdate[];
  sales: SalesMatch[];
  unmatchedSales: string[];
  newCategories: string[];
  example: ExampleData;
  warnings: string[];
}

export interface PlanOptions {
  removeExample: boolean;
  /** Apaga fichas, receitas, ingredientes, embalagens e combos atuais antes de gravar (despesas e equipe ficam). */
  replaceAll?: boolean;
  salesMode: 'average' | 'last';
  now?: string;
}

const MATCH_INGREDIENT = 0.6;
const MATCH_PRODUCT = 0.75;
const MATCH_SALE = 0.6;

function bestMatch<T extends { name: string }>(name: string, pool: T[], min: number): T | null {
  const exact = pool.find((p) => normName(p.name) === normName(name));
  if (exact) return exact;
  let best: T | null = null;
  let score = 0;
  for (const p of pool) {
    const s = nameSimilarity(name, p.name);
    if (s > score) {
      best = p;
      score = s;
    }
  }
  return best && score >= min ? best : null;
}

function opsFromSteps(steps?: string[]): OperationalSheet | undefined {
  const list = (steps || []).map((s) => String(s).trim()).filter(Boolean);
  if (!list.length) return undefined;
  return {
    utensils: [],
    steps: list.map((text, i) => ({ id: `step-${i + 1}`, title: `Passo ${i + 1}`, text })),
    assembly: '',
    checks: [],
  };
}

export function buildImportPlan(extraction: AiExtraction, data: PricingData, options: PlanOptions): ImportPlan {
  const now = options.now || new Date().toISOString();
  const warnings = [...extraction.warnings];
  const example = findExampleData(data);
  // Substituir tudo: as fichas da importação entram como cadastro novo, sem casar com o que existe
  const gone = options.replaceAll
    ? new Set([...data.ingredients, ...data.packaging, ...data.recipes, ...data.products].map((x) => x.id))
    : options.removeExample
      ? new Set([...example.remove.ingredients, ...example.remove.packaging, ...example.remove.recipes, ...example.remove.products])
      : new Set<string>();
  const keep = <T extends { id: string }>(list: T[]) => list.filter((x) => !gone.has(x.id));

  const ingredients = keep(data.ingredients);
  const packaging = keep(data.packaging);
  const existingRecipes = keep(data.recipes);
  const existingProducts = keep(data.products);

  const newIngredients: Ingredient[] = [];
  const newPackaging: Packaging[] = [];
  const priceUpdates = new Map<string, PriceUpdate>();
  // Sem o exemplo, a numeração recomeça do que sobrou (as fichas reais começam do P01)
  const codes = {
    ingredients: ingredients.map((i) => i.code),
    packaging: packaging.map((p) => p.code),
    recipes: existingRecipes.map((r) => r.code),
    product: existingProducts.filter((p) => p.kind === 'product').map((p) => p.code),
    drink: existingProducts.filter((p) => p.kind === 'drink').map((p) => p.code),
  };
  const code = (list: string[], prefix: string, width: number) => {
    const c = nextCode(prefix, list, width);
    list.push(c);
    return c;
  };

  const resolveIngredient = (line: AiLine, base: { qty: number; unit: Unit }, ficha: string): Ingredient => {
    const pool = [...ingredients, ...newIngredients];
    const found = bestMatch(line.name, pool, MATCH_INGREDIENT);
    const cost = costPerBase(line, base);
    if (found) {
      if (found.unit !== base.unit && !(found.unit === 'un' && found.gramsPerUnit)) {
        warnings.push(`${ficha}: "${line.name}" está na ficha em ${base.unit}, mas o cadastro de "${found.name}" usa ${found.unit}. Confira a quantidade.`);
      }
      const isNew = newIngredients.includes(found);
      if (cost !== null && found.unit === base.unit) {
        const after = round2(cost * found.purchaseQty);
        const changed = found.price > 0 ? Math.abs(after / found.price - 1) > 0.01 : after > 0;
        if (isNew) {
          if (!found.price) found.price = after;
        } else if (changed) {
          if (!priceUpdates.has(found.id)) {
            priceUpdates.set(found.id, { id: found.id, name: found.name, before: found.price, after, purchaseQty: found.purchaseQty, unit: found.unit });
          }
        }
      }
      return found;
    }
    const purchaseQty = base.unit === 'un' ? 1 : 1000;
    const created: Ingredient = {
      id: newId('ing'),
      code: code(codes.ingredients, '', 4),
      name: cleanName(line.name),
      unit: base.unit,
      buyUnit: base.unit === 'g' ? 'kg' : base.unit === 'ml' ? 'L' : 'un',
      purchaseQty,
      netQty: purchaseQty,
      price: cost !== null ? round2(cost * purchaseQty) : 0,
      updatedAt: now,
    };
    newIngredients.push(created);
    return created;
  };

  const resolvePackaging = (line: AiLine): Packaging => {
    const pool = [...packaging, ...newPackaging];
    const found = bestMatch(line.name, pool, MATCH_INGREDIENT);
    if (found) return found;
    const qty = Number(line.qty) || 1;
    const unitPrice = Number(line.lineCost) > 0 ? Number(line.lineCost) / qty : Number(line.unitCost) > 0 ? Number(line.unitCost) : 0;
    const created: Packaging = {
      id: newId('pack'),
      code: code(codes.packaging, '', 4),
      name: cleanName(line.name),
      packQty: 1,
      packPrice: round2(unitPrice),
      updatedAt: now,
    };
    newPackaging.push(created);
    return created;
  };

  // 1) Receitas base primeiro (os produtos podem usá-las), criando o "esqueleto" de todas antes das linhas
  const recipeFichas = extraction.fichas.filter((f) => f.kind === 'recipe');
  const productFichas = extraction.fichas.filter((f) => f.kind !== 'recipe');
  const recipePlan: PlanEntry<BaseRecipe>[] = recipeFichas.map((f) => {
    const existing = bestMatch(f.name, existingRecipes, MATCH_PRODUCT);
    const yieldBase = f.yieldQty ? toBase(f.yieldQty, f.yieldUnit || 'g') : null;
    const item: BaseRecipe = existing
      ? { ...existing, lines: [], updatedAt: now }
      : {
          id: newId('rec'),
          code: code(codes.recipes, '', 4),
          name: cleanName(f.name),
          unit: yieldBase?.unit || 'g',
          yieldQty: yieldBase?.qty || 0,
          prepMinutes: Number(f.prepMinutes) || 0,
          workers: 1,
          lossFactor: 1,
          lines: [],
          updatedAt: now,
        };
    if (existing && yieldBase) {
      item.unit = yieldBase.unit;
      item.yieldQty = yieldBase.qty;
    }
    if (existing && f.prepMinutes) item.prepMinutes = Number(f.prepMinutes);
    return { key: `rec:${normName(f.name)}`, action: existing ? 'update' : 'create', item, before: existing || undefined, ingredientIds: [], recipeIds: [], packagingIds: [] };
  });
  const recipePool = () => [...existingRecipes.filter((r) => !recipePlan.some((p) => p.item.id === r.id)), ...recipePlan.map((p) => p.item)];

  const buildLines = (f: AiFicha, entry: { ingredientIds: string[]; recipeIds: string[]; packagingIds: string[] }, selfId?: string) => {
    const lines: RecipeLine[] = [];
    const packs: PackLine[] = [];
    for (const raw of f.ingredients || []) {
      if (!raw?.name) continue;
      const clean = cleanIngredientName(raw.name);
      const line: AiLine = {
        ...raw,
        name: clean.name,
        ...(!raw.costUnit && Number(raw.unitCost) > 0 && clean.buyHint ? { costUnit: clean.buyHint } : {}),
      };
      let base = toBase(Number(raw.qty) || 0, raw.unit);
      if (clean.portion) {
        const p = toBase(clean.portion.qty, clean.portion.unit);
        // A porção do nome vale quando a IA pegou a quantidade da compra (1000 ml de azeite, 1 un de calabresa)
        const tookPurchase =
          !(base.qty > 0) ||
          (p.unit === base.unit && base.qty >= 1000 && p.qty < base.qty) ||
          (p.unit !== base.unit && base.unit === 'un' && base.qty <= 1);
        if (p.known && p.qty > 0 && tookPurchase) {
          if (base.qty > 0) warnings.push(`${f.name}: "${clean.name}" entrou com ${p.qty} ${p.unit}, a porção escrita na ficha (a IA tinha lido ${base.qty} ${base.unit}).`);
          base = p;
        } else if (p.known && p.unit === base.unit && Math.abs(p.qty - base.qty) > 1e-9) {
          warnings.push(`${f.name}: "${clean.name}" diz ${p.qty} ${p.unit} no nome e ${base.qty} ${base.unit} na quantidade. Ficou ${base.qty} ${base.unit}; confira.`);
        }
      }
      if (!(base.qty > 0)) continue;
      if (!base.known) warnings.push(`${f.name}: unidade "${raw.unit}" de "${clean.name}" não reconhecida, considerei como unidade.`);
      if (line.isPackaging || looksLikePackaging(line.name)) {
        const p = resolvePackaging(line);
        packs.push({ packagingId: p.id, qty: base.unit === 'un' ? base.qty : 1 });
        entry.packagingIds.push(p.id);
        continue;
      }
      const recipe = bestMatch(line.name, recipePool().filter((r) => r.id !== selfId), line.isRecipe ? MATCH_INGREDIENT : MATCH_PRODUCT);
      if (recipe) {
        lines.push({ kind: 'recipe', refId: recipe.id, qty: round3(base.qty) });
        entry.recipeIds.push(recipe.id);
        continue;
      }
      if (line.isRecipe) warnings.push(`${f.name}: "${line.name}" parece um preparo da casa, mas não veio a ficha dele. Entrou como ingrediente.`);
      const ing = resolveIngredient(line, base, f.name);
      lines.push({ kind: 'ingredient', refId: ing.id, qty: round3(base.qty) });
      entry.ingredientIds.push(ing.id);
    }
    return { lines, packs };
  };

  recipeFichas.forEach((f, i) => {
    const entry = recipePlan[i];
    const { lines } = buildLines(f, entry, entry.item.id);
    entry.item.lines = lines;
    if (!entry.item.yieldQty) {
      const sameUnit = lines.filter((l) => l.kind === 'ingredient' && newOrExisting(l.refId)?.unit === entry.item.unit);
      entry.item.yieldQty = round3(sameUnit.reduce((s, l) => s + l.qty, 0));
      warnings.push(`${f.name}: a ficha não informa o rendimento. Usei a soma dos ingredientes (${entry.item.yieldQty} ${entry.item.unit}); ajuste se houver perda no preparo.`);
    }
  });
  function newOrExisting(id: string) {
    return newIngredients.find((x) => x.id === id) || ingredients.find((x) => x.id === id);
  }

  // 2) Produtos e bebidas
  const categories = new Set(data.config.categories || []);
  const newCategories: string[] = [];
  const productPlan: PlanEntry<Product>[] = productFichas.map((f) => {
    const kind: Product['kind'] = f.kind === 'drink' ? 'drink' : 'product';
    const existing = bestMatch(f.name, existingProducts.filter((p) => p.kind === kind), MATCH_PRODUCT);
    const entry: PlanEntry<Product> = {
      key: `prod:${normName(f.name)}`,
      action: existing ? 'update' : 'create',
      item: null as unknown as Product,
      before: existing || undefined,
      ingredientIds: [],
      recipeIds: [],
      packagingIds: [],
    };
    const { lines, packs } = buildLines(f, entry);
    const category = cleanName(f.category || '') || existing?.category || (kind === 'drink' ? 'Bebidas' : 'Outros');
    if (!categories.has(category)) {
      categories.add(category);
      newCategories.push(category);
    }
    const ops = existing?.ops || opsFromSteps(f.steps);
    entry.item = existing
      ? {
          ...existing,
          category,
          lines,
          packaging: packs.length ? packs : existing.packaging,
          salePrice: Number(f.salePrice) > 0 ? Number(f.salePrice) : existing.salePrice,
          ...(Number(f.deliveryPrice) > 0 ? { deliveryPrice: Number(f.deliveryPrice) } : {}),
          laborMinutes: Number(f.prepMinutes) > 0 ? Number(f.prepMinutes) : existing.laborMinutes,
          ...(ops ? { ops } : {}),
          version: (existing.version || 1) + 1,
          updatedAt: now,
        }
      : {
          id: newId('prod'),
          code: code(kind === 'drink' ? codes.drink : codes.product, kind === 'drink' ? 'B' : 'P', 2),
          kind,
          name: cleanName(f.name),
          category,
          lines,
          packaging: packs,
          deliveryPackaging: [],
          energy: [],
          laborMinutes: Number(f.prepMinutes) || 0,
          laborWorkers: Number(f.prepMinutes) > 0 ? 1 : 0,
          extraCost: 0,
          salePrice: Number(f.salePrice) || 0,
          ...(Number(f.deliveryPrice) > 0 ? { deliveryPrice: Number(f.deliveryPrice) } : {}),
          monthlySales: 0,
          portionLabel: kind === 'drink' ? '1 unidade' : '1 prato',
          ...(ops ? { ops } : {}),
          version: 1,
          updatedAt: now,
        };
    if (!(entry.item.salePrice > 0)) warnings.push(`${f.name}: sem preço de venda na ficha. Preencha na aba Fichas técnicas.`);
    return entry;
  });

  // 3) Vendas por mês -> quantidade mensal de cada produto
  const groups = new Map<string, { name: string; months: Map<string, number> }>();
  for (const s of extraction.sales) {
    const key = normName(s.product);
    const g = groups.get(key) || { name: s.product, months: new Map<string, number>() };
    const month = /^\d{4}-\d{2}$/.test(s.month) ? s.month : '0000-00';
    g.months.set(month, (g.months.get(month) || 0) + Number(s.qty));
    groups.set(key, g);
  }
  const productPool = [
    ...existingProducts.filter((p) => !productPlan.some((e) => e.item.id === p.id)),
    ...productPlan.map((e) => e.item),
  ];
  const sales: SalesMatch[] = [];
  const unmatchedSales: string[] = [];
  const byProduct = new Map<string, SalesMatch>();
  for (const g of groups.values()) {
    const product = bestMatch(g.name, productPool, MATCH_SALE);
    if (!product) {
      unmatchedSales.push(g.name);
      continue;
    }
    const months = [...g.months.keys()].sort();
    const values = months.map((m) => g.months.get(m) || 0);
    const prev = byProduct.get(product.id);
    if (prev) {
      // dois nomes do relatório para o mesmo produto (ex.: salão e delivery): soma
      const extra = options.salesMode === 'last' ? values[values.length - 1] : values.reduce((a, b) => a + b, 0) / values.length;
      prev.monthly = Math.round(prev.monthly + extra);
      prev.reportName += ` + ${g.name}`;
      continue;
    }
    const monthly = Math.round(options.salesMode === 'last' ? values[values.length - 1] : values.reduce((a, b) => a + b, 0) / values.length);
    const match: SalesMatch = { productId: product.id, productName: product.name, reportName: g.name, monthly, months };
    byProduct.set(product.id, match);
    sales.push(match);
  }

  return {
    products: productPlan,
    recipes: recipePlan,
    newIngredients,
    newPackaging,
    priceUpdates: [...priceUpdates.values()],
    sales,
    unmatchedSales,
    newCategories,
    example,
    warnings: [...new Set(warnings)],
  };
}

// ---------------------------------------------------------------
// Gravação do que foi marcado
// ---------------------------------------------------------------

export interface PlanSelection {
  products: Set<string>; // keys
  recipes: Set<string>;
  priceUpdates: Set<string>; // ingredient ids
  applySales: boolean;
  removeExample: boolean;
  replaceAll?: boolean;
}

export interface PlanWrites {
  writes: PricingWrite[];
  deletes: Array<{ kind: 'ingredients' | 'packaging' | 'recipes' | 'products' | 'combos'; id: string }>;
  config: Partial<PricingConfig> | null;
  counts: { products: number; recipes: number; ingredients: number; packaging: number; prices: number; sales: number; removed: number };
}

export function planWrites(plan: ImportPlan, data: PricingData, sel: PlanSelection): PlanWrites {
  const products = plan.products.filter((p) => sel.products.has(p.key));
  // Receita usada por um produto marcado entra mesmo desmarcada (senão a ficha ficaria quebrada)
  const recipeIds = new Set(products.flatMap((p) => p.recipeIds));
  const recipes = plan.recipes.filter((r) => sel.recipes.has(r.key) || recipeIds.has(r.item.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of plan.recipes) {
      if (recipes.includes(r)) continue;
      if (recipes.some((x) => x.recipeIds.includes(r.item.id))) {
        recipes.push(r);
        grew = true;
      }
    }
  }
  const usedIngredients = new Set([...products, ...recipes].flatMap((e) => e.ingredientIds));
  const usedPackaging = new Set(products.flatMap((e) => e.packagingIds));
  const ingredients = plan.newIngredients.filter((i) => usedIngredients.has(i.id));
  const packaging = plan.newPackaging.filter((p) => usedPackaging.has(p.id));

  const productItems = new Map(products.map((p) => [p.item.id, { ...p.item }]));
  const salesWrites: Product[] = [];
  if (sel.applySales) {
    for (const s of plan.sales) {
      const planned = productItems.get(s.productId);
      if (planned) planned.monthlySales = s.monthly;
      else {
        const existing = data.products.find((p) => p.id === s.productId);
        if (existing) salesWrites.push({ ...existing, monthlySales: s.monthly });
      }
    }
  }

  const priceWrites: Ingredient[] = plan.priceUpdates
    .filter((u) => sel.priceUpdates.has(u.id))
    .map((u) => {
      const ing = data.ingredients.find((i) => i.id === u.id)!;
      return { ...ing, price: u.after, priceHistory: [...(ing.priceHistory || []), { date: new Date().toISOString(), price: u.after, purchaseQty: ing.purchaseQty, source: 'Ficha técnica (IA)' }].slice(-30) };
    });

  const writes: PricingWrite[] = [
    ...ingredients.map((item): PricingWrite => ({ kind: 'ingredients', item })),
    ...priceWrites.map((item): PricingWrite => ({ kind: 'ingredients', item })),
    ...packaging.map((item): PricingWrite => ({ kind: 'packaging', item })),
    ...recipes.map((r): PricingWrite => ({ kind: 'recipes', item: r.item })),
    ...[...productItems.values()].map((item): PricingWrite => ({ kind: 'products', item })),
    ...salesWrites.map((item): PricingWrite => ({ kind: 'products', item })),
  ];

  const deletes: PlanWrites['deletes'] = [];
  const deleted = new Set<string>();
  const drop = (kind: PlanWrites['deletes'][number]['kind'], id: string) => {
    if (deleted.has(`${kind}:${id}`)) return;
    deleted.add(`${kind}:${id}`);
    deletes.push({ kind, id });
  };
  if (sel.replaceAll) {
    for (const c of data.combos) drop('combos', c.id);
    for (const p of data.products) drop('products', p.id);
    for (const r of data.recipes) drop('recipes', r.id);
    for (const p of data.packaging) drop('packaging', p.id);
    for (const i of data.ingredients) drop('ingredients', i.id);
  }
  let config: Partial<PricingConfig> | null = null;
  if (sel.removeExample) {
    const r = plan.example.remove;
    for (const id of r.combos) drop('combos', id);
    for (const id of r.products) drop('products', id);
    for (const id of r.recipes) drop('recipes', id);
    for (const id of r.packaging) drop('packaging', id);
    for (const id of r.ingredients) drop('ingredients', id);
    const without = (list: Array<{ id: string }> | undefined, ids: string[]) => (list || []).filter((x) => !ids.includes(x.id));
    config = {
      expenses: without(data.config.expenses, r.config.expenses) as PricingConfig['expenses'],
      employees: without(data.config.employees, r.config.employees) as PricingConfig['employees'],
      equipment: without(data.config.equipment, r.config.equipment) as PricingConfig['equipment'],
      energy: without(data.config.energy, r.config.energy) as PricingConfig['energy'],
    };
  }
  if (plan.newCategories.length) {
    config = { ...(config || {}), categories: [...(data.config.categories || []), ...plan.newCategories] };
  }

  return {
    writes,
    deletes,
    config,
    counts: {
      products: products.length,
      recipes: recipes.length,
      ingredients: ingredients.length,
      packaging: packaging.length,
      prices: priceWrites.length,
      sales: sel.applySales ? plan.sales.length : 0,
      removed: deletes.length,
    },
  };
}
