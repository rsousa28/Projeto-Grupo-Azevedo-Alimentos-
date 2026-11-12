import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { buildDistributionRequest, padNSU, parseDistributionResponse, parseEvent, parseSummary, type DfeClient, type DistResult } from '../server/sefazDfe';
import { runSefazSync, type SefazCompany } from '../server/sefazJob';

const NFE = readFileSync(new URL('./fixtures/nfe-laticinios.xml', import.meta.url), 'utf8');
const KEY = '23251112345678000190550010000123451000123456';
const COMPANY: SefazCompany = { cnpj: '98765432000110', uf: 23, storeId: '3' };
const NOW = new Date('2026-11-12T15:00:00Z');

const summary = (key: string, sit = '1') =>
  `<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><chNFe>${key}</chNFe><CNPJ>12345678000190</CNPJ><xNome>Laticinios Serra</xNome>` +
  `<IE>1</IE><dhEmi>2026-11-11T09:42:10-03:00</dhEmi><tpNF>1</tpNF><vNF>559.06</vNF><digVal>x</digVal><dhRecbto>2026-11-11T09:42:12-03:00</dhRecbto>` +
  `<nProt>1</nProt><cSitNFe>${sit}</cSitNFe></resNFe>`;
const cancelEvent = (key: string) =>
  `<resEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><cOrgao>23</cOrgao><CNPJ>12345678000190</CNPJ><chNFe>${key}</chNFe>` +
  `<dhEvento>2026-11-12T10:00:00-03:00</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><xEvento>Cancelamento</xEvento></resEvento>`;

function soap(cStat: string, ult: number, max: number, docs: Array<[number, string, string]> = []) {
  const lote = docs.length
    ? `<loteDistDFeInt>${docs.map(([nsu, schema, xml]) => `<docZip NSU="${padNSU(nsu)}" schema="${schema}">${gzipSync(Buffer.from(xml)).toString('base64')}</docZip>`).join('')}</loteDistDFeInt>`
    : '';
  return (
    '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
    '<nfeDistDFeInteresseResponse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDistDFeInteresseResult>' +
    `<retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>1</tpAmb><verAplic>1.7</verAplic><cStat>${cStat}</cStat>` +
    `<xMotivo>${cStat === '138' ? 'Documento(s) localizado(s)' : 'Nenhum documento localizado'}</xMotivo><dhResp>2026-11-12T12:00:00-03:00</dhResp>` +
    `<ultNSU>${padNSU(ult)}</ultNSU><maxNSU>${padNSU(max)}</maxNSU>${lote}</retDistDFeInt>` +
    '</nfeDistDFeInteresseResult></nfeDistDFeInteresseResponse></soap:Body></soap:Envelope>'
  );
}

/** Answers each call with the next prepared SEFAZ response and records the NSU asked for. */
function fakeClient(responses: Array<string | Error>): DfeClient & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    async distribution(ultNSU): Promise<DistResult> {
      asked.push(ultNSU);
      const next = responses.shift();
      if (!next) throw new Error('unexpected call');
      if (next instanceof Error) throw next;
      return parseDistributionResponse(next);
    },
  };
}

/** Just enough of the Firestore Admin API for the job: doc get/set/create/update and collection get. */
function fakeDb() {
  const data = new Map<string, any>();
  const copy = (v: any) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const ref = (path: string) => ({
    async get() {
      const v = data.get(path);
      return { exists: v !== undefined, data: () => copy(v) };
    },
    async set(value: any, opts?: { merge?: boolean }) {
      data.set(path, opts?.merge ? { ...(data.get(path) || {}), ...copy(value) } : copy(value));
    },
    async create(value: any) {
      if (data.has(path)) throw Object.assign(new Error('already exists'), { code: 6 });
      data.set(path, copy(value));
    },
    async update(value: any) {
      if (!data.has(path)) throw Object.assign(new Error('not found'), { code: 5 });
      data.set(path, { ...data.get(path), ...copy(value) });
    },
  });
  const db = {
    doc: ref,
    collection: (path: string) => ({
      doc: (id: string) => ref(`${path}/${id}`),
      async get() {
        const prefix = `${path}/`;
        const docs = [...data.entries()]
          .filter(([k]) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
          .map(([k, v]) => ({ id: k.slice(prefix.length), data: () => copy(v) }));
        return { docs };
      },
    }),
  };
  return { db: db as unknown as Firestore, data };
}

const quiet = { log: () => {} };

describe('SEFAZ: pedido e resposta da Distribuição DF-e', () => {
  it('monta o pedido com o CNPJ, a UF e o último NSU com 15 dígitos', () => {
    const body = buildDistributionRequest('98765432000110', 23, '84');
    expect(body).toContain('<CNPJ>98765432000110</CNPJ>');
    expect(body).toContain('<cUFAutor>23</cUFAutor>');
    expect(body).toContain('<ultNSU>000000000000084</ultNSU>');
    expect(body).toContain('<tpAmb>1</tpAmb>');
  });

  it('descompacta os documentos e lê situação e NSUs', () => {
    const res = parseDistributionResponse(soap('138', 3, 9, [[1, 'resNFe_v1.01.xsd', summary(KEY)], [2, 'procNFe_v4.00.xsd', NFE]]));
    expect(res).toMatchObject({ cStat: '138', ultNSU: '000000000000003', maxNSU: '000000000000009' });
    expect(res.docs.map((d) => [d.nsu, d.schema])).toEqual([
      ['000000000000001', 'resNFe_v1.01.xsd'],
      ['000000000000002', 'procNFe_v4.00.xsd'],
    ]);
    expect(res.docs[1].xml).toContain('<infNFe');
  });

  it('lê o resumo e o evento de cancelamento', () => {
    expect(parseSummary(summary(KEY, '3'))).toMatchObject({ key: KEY, supplierCnpj: '12345678000190', total: 559.06, situation: 'cancelled' });
    expect(parseEvent(cancelEvent(KEY))).toEqual({ key: KEY, type: '110111', cancelled: true });
  });

  it('recusa respostas que não são da SEFAZ', () => {
    expect(() => parseDistributionResponse('<html>erro</html>')).toThrow(/Unexpected SEFAZ answer/);
  });
});

describe('SEFAZ: rotina de importação', () => {
  it('transforma o XML completo em nota para conferir e espera 1 hora quando alcança o fim', async () => {
    const { db, data } = fakeDb();
    data.set('stores/3/pricing_ingredients/ing1', { id: 'ing1', name: 'Queijo mussarela', unit: 'g', purchaseQty: 1000, price: 30 });
    const client = fakeClient([soap('138', 3, 3, [[1, 'resNFe_v1.01.xsd', summary(KEY)], [2, 'procNFe_v4.00.xsd', NFE], [3, 'resNFe_v1.01.xsd', summary('1'.repeat(44))]])]);

    const result = await runSefazSync(db, COMPANY, client, { ...quiet, now: NOW });

    expect(client.asked).toEqual(['000000000000000']);
    expect(result).toMatchObject({ calls: 1, invoices: 1, summaries: 2, status: '138' });
    const invoice = data.get(`stores/3/pricing_invoices/${KEY}`);
    expect(invoice).toMatchObject({ status: 'pending', source: 'sefaz', supplierCnpj: '12345678000190', number: '12345' });
    expect(invoice.archived).toBeUndefined();
    expect(invoice.items[0]).toMatchObject({ target: 'ingredient', refId: 'ing1', apply: true }); // vínculo sugerido pelo nome
    expect(data.get(`stores/3/sefaz_documents/${KEY}`)).toMatchObject({ kind: 'full', supplierName: 'Laticinios Serra & Cia' });
    expect(data.get(`stores/3/sefaz_documents/${'1'.repeat(44)}`)).toMatchObject({ kind: 'summary', total: 559.06 });
    const state = data.get('stores/3/sefaz_state/main');
    expect(state).toMatchObject({ ultNSU: '000000000000003', maxNSU: '000000000000003', lastStatus: '138', cnpj: COMPANY.cnpj });
    expect(new Date(state.nextAllowedAt).getTime() - NOW.getTime()).toBe(61 * 60 * 1000);
  });

  it('não chama a SEFAZ antes da hora e continua do último NSU depois', async () => {
    const { db, data } = fakeDb();
    data.set('stores/3/sefaz_state/main', { ultNSU: '000000000000050', maxNSU: '000000000000050', nextAllowedAt: '2026-11-12T15:30:00.000Z' });
    const early = fakeClient([]);
    expect(await runSefazSync(db, COMPANY, early, { ...quiet, now: NOW })).toMatchObject({ skipped: true, calls: 0 });
    expect(early.asked).toEqual([]);

    const later = fakeClient([soap('137', 50, 50)]);
    const res = await runSefazSync(db, COMPANY, later, { ...quiet, now: new Date('2026-11-12T15:31:00Z') });
    expect(later.asked).toEqual(['000000000000050']);
    expect(res.status).toBe('137');
    expect(data.get('stores/3/sefaz_state/main')).toMatchObject({ ultNSU: '000000000000050', nextAllowedAt: '2026-11-12T16:32:00.000Z' });
  });

  it('busca várias levas seguidas enquanto houver documentos', async () => {
    const { db, data } = fakeDb();
    const client = fakeClient([soap('138', 50, 120, [[50, 'resNFe_v1.01.xsd', summary('2'.repeat(44))]]), soap('138', 120, 120, [[120, 'procNFe_v4.00.xsd', NFE]])]);
    const res = await runSefazSync(db, COMPANY, client, { ...quiet, now: NOW });
    expect(client.asked).toEqual(['000000000000000', '000000000000050']);
    expect(res).toMatchObject({ calls: 2, invoices: 1, summaries: 1 });
    expect(data.get('stores/3/sefaz_state/main').ultNSU).toBe('000000000000120');
  });

  it('nota antiga vai para o Histórico e nota já importada não é sobrescrita', async () => {
    const { db, data } = fakeDb();
    data.set('stores/3/pricing_invoices/other', {});
    await runSefazSync(db, COMPANY, fakeClient([soap('138', 1, 1, [[1, 'procNFe_v4.00.xsd', NFE]])]), { ...quiet, now: new Date('2026-12-30T12:00:00Z') });
    expect(data.get(`stores/3/pricing_invoices/${KEY}`)).toMatchObject({ status: 'dismissed', archived: true });

    data.set(`stores/3/pricing_invoices/${KEY}`, { status: 'applied', appliedBy: 'Rennan' });
    data.set('stores/3/sefaz_state/main', {});
    await runSefazSync(db, COMPANY, fakeClient([soap('138', 2, 2, [[2, 'procNFe_v4.00.xsd', NFE]])]), { ...quiet, now: NOW });
    expect(data.get(`stores/3/pricing_invoices/${KEY}`)).toEqual({ status: 'applied', appliedBy: 'Rennan' });
  });

  it('ignora a nota emitida para outro CNPJ e marca a cancelada', async () => {
    const { db, data } = fakeDb();
    const other: SefazCompany = { ...COMPANY, cnpj: '11111111000111' };
    await runSefazSync(db, other, fakeClient([soap('138', 1, 1, [[1, 'procNFe_v4.00.xsd', NFE]])]), { ...quiet, now: NOW });
    expect(data.get(`stores/3/pricing_invoices/${KEY}`)).toBeUndefined();

    data.set('stores/3/sefaz_state/main', {});
    await runSefazSync(db, COMPANY, fakeClient([soap('138', 2, 2, [[2, 'procNFe_v4.00.xsd', NFE]])]), { ...quiet, now: NOW });
    data.set('stores/3/sefaz_state/main', {});
    await runSefazSync(db, COMPANY, fakeClient([soap('138', 3, 3, [[3, 'resEvento_v1.01.xsd', cancelEvent(KEY)]])]), { ...quiet, now: NOW });
    expect(data.get(`stores/3/pricing_invoices/${KEY}`).cancelled).toBe(true);
    expect(data.get(`stores/3/sefaz_documents/${KEY}`).cancelled).toBe(true);
  });

  it('pausa de 1 hora no consumo indevido e nova tentativa em 15 minutos se a conexão falhar', async () => {
    const { db, data } = fakeDb();
    await runSefazSync(db, COMPANY, fakeClient([soap('656', 0, 0)]), { ...quiet, now: NOW });
    expect(data.get('stores/3/sefaz_state/main')).toMatchObject({ lastStatus: '656', nextAllowedAt: '2026-11-12T16:01:00.000Z' });

    data.set('stores/3/sefaz_state/main', { ultNSU: '000000000000007' });
    const res = await runSefazSync(db, COMPANY, fakeClient([new Error('socket hang up')]), { ...quiet, now: NOW });
    expect(res.status).toBe('error');
    expect(data.get('stores/3/sefaz_state/main')).toMatchObject({
      ultNSU: '000000000000007',
      lastStatus: 'error',
      lastMessage: 'socket hang up',
      nextAllowedAt: '2026-11-12T15:15:00.000Z',
    });
  });
});
