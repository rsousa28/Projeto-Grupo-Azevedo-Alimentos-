// NF-e de entrada: leitura do XML, reconhecimento dos itens e cálculo dos novos preços.
// Funções puras (sem DOM), para rodar igual no navegador, no servidor e nos testes.
import type {
  Ingredient,
  Invoice,
  InvoiceItem,
  Packaging,
  PricingData,
  SupplierItemMap,
  Unit,
} from './types';

// ---------------------------------------------------------------
// Leitura do XML (procNFe ou NFe; NF-e modelo 55 e NFC-e 65)
// ---------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .trim();
}

const open = (tag: string) => `<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>`;
const close = (tag: string) => `</(?:[\\w-]+:)?${tag}>`;

function block(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`${open(tag)}([\\s\\S]*?)${close(tag)}`))?.[1];
}

function blocks(xml: string, tag: string): Array<{ attrs: string; body: string }> {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}(\\s[^>]*)?>([\\s\\S]*?)${close(tag)}`, 'g');
  return Array.from(xml.matchAll(re), (m) => ({ attrs: m[1] || '', body: m[2] }));
}

function text(xml: string | undefined, tag: string): string {
  if (!xml) return '';
  const inner = block(xml, tag);
  return inner === undefined ? '' : decode(inner);
}

function num(xml: string | undefined, tag: string): number {
  const v = Number(text(xml, tag));
  return Number.isFinite(v) ? v : 0;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export class InvoiceParseError extends Error {}

export function parseNFeXml(xml: string): Omit<Invoice, 'status' | 'source' | 'createdAt' | 'updatedAt'> {
  const inf = xml.match(new RegExp(`<(?:[\\w-]+:)?infNFe(\\s[^>]*)>([\\s\\S]*?)${close('infNFe')}`));
  if (!inf) throw new InvoiceParseError('Este arquivo não é o XML de uma NF-e. Use o arquivo .xml que o fornecedor envia por e-mail.');
  const attrs = inf[1];
  const body = inf[2];

  const keyFromId = onlyDigits(attrs.match(/Id="([^"]+)"/)?.[1] || '');
  const key = keyFromId.length === 44 ? keyFromId : onlyDigits(text(xml, 'chNFe'));
  if (key.length !== 44) throw new InvoiceParseError('Não encontrei a chave de acesso (44 dígitos) neste XML.');

  const ide = block(body, 'ide');
  const emit = block(body, 'emit');
  const dest = block(body, 'dest');
  const totals = block(body, 'ICMSTot');

  const items: InvoiceItem[] = blocks(body, 'det').map((d, i) => {
    const prod = block(d.body, 'prod') || '';
    const nItem = Number(d.attrs.match(/nItem="(\d+)"/)?.[1]) || i + 1;
    const ean = text(prod, 'cEAN');
    return {
      index: nItem,
      code: text(prod, 'cProd'),
      ...(ean && ean !== 'SEM GTIN' ? { ean } : {}),
      description: text(prod, 'xProd'),
      ncm: text(prod, 'NCM') || undefined,
      unit: text(prod, 'uCom').toUpperCase(),
      qty: num(prod, 'qCom'),
      unitPrice: num(prod, 'vUnCom'),
      total: num(prod, 'vProd'),
      discount: num(prod, 'vDesc'),
    };
  });
  if (items.length === 0) throw new InvoiceParseError('A nota não tem itens.');

  const issued = text(ide, 'dhEmi') || text(ide, 'dEmi');
  return {
    id: key,
    number: text(ide, 'nNF'),
    series: text(ide, 'serie'),
    issuedAt: issued ? new Date(issued.length === 10 ? `${issued}T12:00:00-03:00` : issued).toISOString() : new Date().toISOString(),
    supplierCnpj: onlyDigits(text(emit, 'CNPJ') || text(emit, 'CPF')),
    supplierName: text(emit, 'xFant') || text(emit, 'xNome'),
    recipientCnpj: onlyDigits(text(dest, 'CNPJ') || text(dest, 'CPF')),
    recipientName: text(dest, 'xNome') || undefined,
    total: num(totals, 'vNF') || items.reduce((s, it) => s + it.total - it.discount, 0),
    items,
  };
}

// ---------------------------------------------------------------
// Conversão de unidades: 1 unidade da nota = quantas g / ml / un do cadastro
// ---------------------------------------------------------------

const MEASURE: Record<string, { base: Unit; mult: number }> = {
  KG: { base: 'g', mult: 1000 },
  KGS: { base: 'g', mult: 1000 },
  KILO: { base: 'g', mult: 1000 },
  G: { base: 'g', mult: 1 },
  GR: { base: 'g', mult: 1 },
  GRS: { base: 'g', mult: 1 },
  L: { base: 'ml', mult: 1000 },
  LT: { base: 'ml', mult: 1000 },
  LTS: { base: 'ml', mult: 1000 },
  LITRO: { base: 'ml', mult: 1000 },
  ML: { base: 'ml', mult: 1 },
};

const toNum = (s: string) => Number(s.replace(',', '.'));

/** Tamanho escrito na descrição: "PELADO 2,5KG" -> 2500 g; "CX 12X1L" -> 12000 ml; "12 X 350ML" -> 4200 ml */
function sizeFromDescription(description: string, base: Unit): number | null {
  const d = description.toUpperCase();
  const multi = d.match(/(\d+)\s*X\s*(\d+(?:[.,]\d+)?)\s*(KG|GR?|LT?|ML)\b/);
  if (multi) {
    const m = MEASURE[multi[3]];
    if (m && m.base === base) return toNum(multi[1]) * toNum(multi[2]) * m.mult;
  }
  const single = d.match(/(\d+(?:[.,]\d+)?)\s*(KG|GR?|LT?|ML)\b/);
  if (single) {
    const m = MEASURE[single[2]];
    if (m && m.base === base) return toNum(single[1]) * m.mult;
  }
  return null;
}

/** Quantidade de unidades na embalagem da nota: "C/12", "CX 12", "FD12", "12UN", "PCT 50" */
function countFromDescription(description: string): number | null {
  const d = description.toUpperCase();
  const m = d.match(/(?:C\/|CX\.?\s*|FD\.?\s*|PCT\.?\s*|PC\.?\s*|PACOTE\s*)(\d+)\b/) || d.match(/\b(\d+)\s*(?:UN|UND|UNID|UNIDADES)\b/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Unidades de nota que são embalagens com várias unidades dentro
const PACKS = new Set(['CX', 'CXA', 'FD', 'FDO', 'PCT', 'PT', 'DZ', 'SC', 'BD', 'KIT']);

export function guessFactor(item: Pick<InvoiceItem, 'unit' | 'description'>, unit: Unit, registeredQty: number): number {
  const measure = MEASURE[item.unit];
  if (measure && measure.base === unit) return measure.mult;
  const count = item.unit === 'DZ' ? 12 : countFromDescription(item.description);
  if (unit === 'un') {
    if (['UN', 'UND', 'UNID', 'PC', 'PCA', 'PECA'].includes(item.unit)) return 1;
    return count ?? Math.max(1, registeredQty);
  }
  const size = sizeFromDescription(item.description, unit);
  if (size !== null) {
    // "CREME DE LEITE 1KG CX C/12" vendido por CX: 12 x 1 kg
    const isMulti = /\d+\s*X\s*\d/i.test(item.description);
    return PACKS.has(item.unit) && count && !isMulti ? size * count : size;
  }
  return Math.max(1, registeredQty);
}

// ---------------------------------------------------------------
// Reconhecimento: memória por fornecedor + semelhança de nome
// ---------------------------------------------------------------

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'para', 'tipo', 'e', 'a', 'o', 'em', 'kg', 'g', 'gr', 'ml', 'l', 'lt', 'un', 'und', 'cx', 'pct', 'fd', 'pc', 'c', 'x']);

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d/.test(t));
}

function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  return min >= 4 && (a.startsWith(b) || b.startsWith(a));
}

/** Semelhança entre 0 e 1 (coeficiente de Dice sobre as palavras, aceitando abreviações por prefixo). */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const used = new Set<number>();
  let hits = 0;
  for (const x of ta) {
    const j = tb.findIndex((y, idx) => !used.has(idx) && tokenMatch(x, y));
    if (j >= 0) {
      used.add(j);
      hits++;
    }
  }
  return (2 * hits) / (ta.length + tb.length);
}

export const mapId = (supplierCnpj: string, code: string) => `${supplierCnpj}_${code}`.replace(/[^a-zA-Z0-9_-]/g, '-');

export interface MatchSuggestion {
  target: 'ingredient' | 'packaging';
  refId: string;
  score: number;
}

export function suggestMatch(item: InvoiceItem, data: Pick<PricingData, 'ingredients' | 'packaging'>): MatchSuggestion | null {
  let best: MatchSuggestion | null = null;
  for (const ing of data.ingredients) {
    const score = nameSimilarity(item.description, ing.name);
    if (!best || score > best.score) best = { target: 'ingredient', refId: ing.id, score };
  }
  for (const p of data.packaging) {
    const score = nameSimilarity(item.description, p.name);
    if (!best || score > best.score) best = { target: 'packaging', refId: p.id, score };
  }
  return best && best.score >= 0.4 ? best : null;
}

/** Preenche os vínculos de uma nota nova: primeiro pela memória do fornecedor, depois por semelhança. */
export function prepareInvoiceItems(
  invoice: Pick<Invoice, 'supplierCnpj' | 'items'>,
  data: Pick<PricingData, 'ingredients' | 'packaging'>,
  maps: SupplierItemMap[],
): InvoiceItem[] {
  const memory = new Map(maps.map((m) => [m.id, m]));
  return invoice.items.map((item) => {
    const saved = memory.get(mapId(invoice.supplierCnpj, item.code));
    if (saved && (saved.target === 'ignore' || refExists(data, saved.target, saved.refId))) {
      return { ...item, target: saved.target, refId: saved.refId, factor: saved.factor, apply: saved.target !== 'ignore' };
    }
    const s = suggestMatch(item, data);
    if (!s) return { ...item, apply: false };
    return { ...item, target: s.target, refId: s.refId, factor: defaultFactor(item, data, s.target, s.refId), apply: true };
  });
}

function refExists(data: Pick<PricingData, 'ingredients' | 'packaging'>, target: string, refId?: string) {
  if (!refId) return false;
  return target === 'ingredient' ? data.ingredients.some((i) => i.id === refId) : data.packaging.some((p) => p.id === refId);
}

export function defaultFactor(
  item: Pick<InvoiceItem, 'unit' | 'description'>,
  data: Pick<PricingData, 'ingredients' | 'packaging'>,
  target: 'ingredient' | 'packaging',
  refId: string,
): number {
  if (target === 'ingredient') {
    const ing = data.ingredients.find((i) => i.id === refId);
    return ing ? guessFactor(item, ing.unit, ing.purchaseQty) : 1;
  }
  const p = data.packaging.find((x) => x.id === refId);
  return p ? guessFactor(item, 'un', p.packQty) : 1;
}

// ---------------------------------------------------------------
// Novos preços
// ---------------------------------------------------------------

/** Preço efetivo de 1 unidade da nota, já com desconto. */
export function effectiveUnitPrice(item: Pick<InvoiceItem, 'qty' | 'total' | 'discount' | 'unitPrice'>): number {
  return item.qty > 0 ? (item.total - (item.discount || 0)) / item.qty : item.unitPrice;
}

export interface PriceChange<T> {
  before: T;
  after: T;
  oldPrice: number;  // preço da embalagem cadastrada (purchaseQty / packQty)
  newPrice: number;
  delta: number;     // variação (0,1 = +10%)
  baseUnitCost: number; // custo por g / ml / un vindo da nota
}

export interface InvoiceUpdates {
  ingredients: Array<PriceChange<Ingredient>>;
  packaging: Array<PriceChange<Packaging>>;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Calcula os novos preços dos itens marcados para atualizar. Itens que apontam para o mesmo cadastro
 * entram pela média ponderada (total pago ÷ quantidade convertida). Preço igual ao atual fica de fora.
 */
export function computeInvoiceUpdates(invoice: Pick<Invoice, 'items'>, data: Pick<PricingData, 'ingredients' | 'packaging'>): InvoiceUpdates {
  const sums = new Map<string, { paid: number; baseQty: number }>();
  for (const item of invoice.items) {
    if (!item.apply || !item.refId || (item.target !== 'ingredient' && item.target !== 'packaging')) continue;
    const factor = item.factor && item.factor > 0 ? item.factor : 1;
    const key = `${item.target}:${item.refId}`;
    const acc = sums.get(key) || { paid: 0, baseQty: 0 };
    acc.paid += effectiveUnitPrice(item) * item.qty;
    acc.baseQty += item.qty * factor;
    sums.set(key, acc);
  }

  const out: InvoiceUpdates = { ingredients: [], packaging: [] };
  for (const [key, { paid, baseQty }] of sums) {
    if (baseQty <= 0) continue;
    const baseUnitCost = paid / baseQty;
    const [target, refId] = key.split(/:(.+)/);
    if (target === 'ingredient') {
      const ing = data.ingredients.find((i) => i.id === refId);
      if (!ing) continue;
      const newPrice = round2(baseUnitCost * ing.purchaseQty);
      if (newPrice === ing.price) continue; // mesmo preço: nada a gravar
      out.ingredients.push({
        before: ing,
        after: { ...ing, price: newPrice },
        oldPrice: ing.price,
        newPrice,
        delta: ing.price > 0 ? newPrice / ing.price - 1 : 0,
        baseUnitCost,
      });
    } else {
      const p = data.packaging.find((x) => x.id === refId);
      if (!p) continue;
      const newPrice = round2(baseUnitCost * p.packQty);
      if (newPrice === p.packPrice) continue;
      out.packaging.push({
        before: p,
        after: { ...p, packPrice: newPrice },
        oldPrice: p.packPrice,
        newPrice,
        delta: p.packPrice > 0 ? newPrice / p.packPrice - 1 : 0,
        baseUnitCost,
      });
    }
  }
  return out;
}

export function formatCnpj(cnpj: string): string {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
