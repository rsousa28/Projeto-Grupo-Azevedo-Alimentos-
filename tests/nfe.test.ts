import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  InvoiceParseError,
  computeInvoiceUpdates,
  effectiveUnitPrice,
  guessFactor,
  mapId,
  nameSimilarity,
  parseNFeXml,
  prepareInvoiceItems,
} from '../src/lib/pricing/nfe';
import { priceChangeImpact } from '../src/lib/pricing/engine';
import { seedVeroPasta } from '../src/lib/pricing/seed';
import type { SupplierItemMap } from '../src/lib/pricing/types';

const xml = readFileSync(new URL('./fixtures/nfe-laticinios.xml', import.meta.url), 'utf8');

describe('leitura do XML da NF-e', () => {
  it('lê cabeçalho, fornecedor, destinatário e itens', () => {
    const nf = parseNFeXml(xml);
    expect(nf.id).toBe('23251112345678000190550010000123451000123456');
    expect(nf.number).toBe('12345');
    expect(nf.series).toBe('1');
    expect(nf.supplierCnpj).toBe('12345678000190');
    expect(nf.supplierName).toBe('Laticinios Serra & Cia');
    expect(nf.recipientCnpj).toBe('98765432000110');
    expect(nf.total).toBeCloseTo(559.06, 2);
    expect(nf.issuedAt).toBe('2026-11-11T12:42:10.000Z');
    expect(nf.items).toHaveLength(4);
    expect(nf.items[0]).toMatchObject({ index: 1, code: '1020', description: 'QUEIJO MUSSARELA PECA KG', unit: 'KG', qty: 4.25, unitPrice: 33, total: 140.25, discount: 0 });
    expect(nf.items[0].ean).toBeUndefined(); // "SEM GTIN"
    expect(nf.items[1].ean).toBe('7891234567895');
    expect(nf.items[2].discount).toBe(5);
  });

  it('recusa arquivos que não são NF-e', () => {
    expect(() => parseNFeXml('<html><body>DANFE</body></html>')).toThrow(InvoiceParseError);
  });
});

describe('conversão de unidades', () => {
  it('KG para gramas, caixa com 12 de 1 kg, pacote de 1 kg, fardo de latas', () => {
    expect(guessFactor({ unit: 'KG', description: 'QUEIJO MUSSARELA PECA KG' }, 'g', 1000)).toBe(1000);
    expect(guessFactor({ unit: 'CX', description: 'CREME DE LEITE UHT 1KG CX C/12' }, 'g', 1000)).toBe(12000);
    expect(guessFactor({ unit: 'PCT', description: 'PARMESAO RALADO 1KG' }, 'g', 1000)).toBe(1000);
    expect(guessFactor({ unit: 'CX', description: 'LEITE INTEGRAL 12X1L' }, 'ml', 1000)).toBe(12000);
    expect(guessFactor({ unit: 'FD', description: 'REFRIGERANTE LATA 350ML FD C/12' }, 'un', 12)).toBe(12);
    expect(guessFactor({ unit: 'UN', description: 'TOMATE PELADO 2,5KG' }, 'g', 2500)).toBe(2500);
    // Sem pista na descrição: 1 unidade da nota = a embalagem cadastrada
    expect(guessFactor({ unit: 'SC', description: 'FARINHA ESPECIAL' }, 'g', 25000)).toBe(25000);
  });

  it('preço efetivo desconta o desconto do item', () => {
    expect(effectiveUnitPrice({ qty: 2, total: 185, discount: 5, unitPrice: 92.5 })).toBe(90);
  });
});

describe('reconhecimento dos itens', () => {
  const data = seedVeroPasta();

  it('semelhança aceita abreviação e ignora unidades', () => {
    expect(nameSimilarity('QUEIJO MUSSARELA PECA KG', 'Queijo mussarela 1kg')).toBeGreaterThan(0.7);
    expect(nameSimilarity('QJO MUSSAREL', 'Queijo mussarela 1kg')).toBeGreaterThan(0.4);
    expect(nameSimilarity('SACOLA PLASTICA BRINDE', 'Queijo mussarela 1kg')).toBe(0);
  });

  it('sugere o cadastro certo e deixa o brinde sem vínculo', () => {
    const nf = parseNFeXml(xml);
    const items = prepareInvoiceItems(nf, data, []);
    expect(items[0]).toMatchObject({ target: 'ingredient', refId: 'ing-mussarela', factor: 1000, apply: true });
    expect(items[1]).toMatchObject({ target: 'ingredient', refId: 'ing-creme-leite', factor: 12000, apply: true });
    expect(items[2]).toMatchObject({ target: 'ingredient', refId: 'ing-parmesao', factor: 1000, apply: true });
    expect(items[3].target).toBeUndefined();
    expect(items[3].apply).toBe(false);
  });

  it('a memória do fornecedor tem prioridade sobre a semelhança', () => {
    const nf = parseNFeXml(xml);
    const maps: SupplierItemMap[] = [
      { id: mapId(nf.supplierCnpj, '9001'), supplierCnpj: nf.supplierCnpj, code: '9001', description: 'SACOLA', target: 'ignore', factor: 1, updatedAt: '' },
      { id: mapId(nf.supplierCnpj, '1020'), supplierCnpj: nf.supplierCnpj, code: '1020', description: 'MUSSARELA', target: 'ingredient', refId: 'ing-mussarela', factor: 1000, updatedAt: '' },
    ];
    const items = prepareInvoiceItems(nf, data, maps);
    expect(items[3]).toMatchObject({ target: 'ignore', apply: false });
    expect(items[0]).toMatchObject({ refId: 'ing-mussarela', factor: 1000, apply: true });
  });
});

describe('novos preços e impacto', () => {
  it('mussarela a R$ 33/kg, creme a R$ 19,90/kg e parmesão com desconto', () => {
    const data = seedVeroPasta();
    const nf = parseNFeXml(xml);
    const items = prepareInvoiceItems(nf, data, []);
    const up = computeInvoiceUpdates({ items }, data);
    const byId = Object.fromEntries(up.ingredients.map((c) => [c.after.id, c]));
    expect(byId['ing-mussarela'].oldPrice).toBe(39.9);
    expect(byId['ing-mussarela'].newPrice).toBe(33);
    expect(byId['ing-mussarela'].delta).toBeCloseTo(33 / 39.9 - 1, 6);
    expect(byId['ing-creme-leite'].newPrice).toBe(19.9);
    expect(byId['ing-parmesao'].newPrice).toBe(90);
    expect(up.packaging).toHaveLength(0);

    const impact = priceChangeImpact(data, up.ingredients.map((c) => c.after));
    const names = impact.map((i) => i.name);
    expect(names).toContain('Lasanha à bolonhesa');
    expect(names).toContain('Fettuccine Alfredo');
    const lasanha = impact.find((i) => i.name === 'Lasanha à bolonhesa')!;
    expect(lasanha.costAfter).toBeLessThan(lasanha.costBefore);
  });

  it('dois itens para o mesmo cadastro entram pela média ponderada', () => {
    const data = seedVeroPasta();
    const items = [
      { index: 1, code: 'a', description: 'MUSSARELA', unit: 'KG', qty: 2, unitPrice: 30, total: 60, discount: 0, target: 'ingredient' as const, refId: 'ing-mussarela', factor: 1000, apply: true },
      { index: 2, code: 'b', description: 'MUSSARELA', unit: 'KG', qty: 1, unitPrice: 36, total: 36, discount: 0, target: 'ingredient' as const, refId: 'ing-mussarela', factor: 1000, apply: true },
    ];
    const up = computeInvoiceUpdates({ items }, data);
    expect(up.ingredients[0].newPrice).toBe(32); // 96 / 3 kg
  });

  it('preço igual ao cadastrado não gera atualização', () => {
    const data = seedVeroPasta();
    const items = [
      { index: 1, code: 'a', description: 'MUSSARELA', unit: 'KG', qty: 1, unitPrice: 39.9, total: 39.9, discount: 0, target: 'ingredient' as const, refId: 'ing-mussarela', factor: 1000, apply: true },
    ];
    expect(computeInvoiceUpdates({ items }, data).ingredients).toHaveLength(0);
  });
});
