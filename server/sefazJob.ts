// SEFAZ sync job: pulls new documents for a company and turns each full NF-e XML into an invoice
// waiting for review in Fichas Técnicas > Notas fiscais (stores/{id}/pricing_invoices). Prices only
// change when someone authorizes the invoice there. Run by the Firebase scheduled function
// (functions/src/index.ts).
import type { Firestore } from "firebase-admin/firestore";
import { parseNFeXml, prepareInvoiceItems } from "../src/lib/pricing/nfe";
import type { Ingredient, Invoice, Packaging, SupplierItemMap } from "../src/lib/pricing/types";
import { type DfeClient, type DistDoc, padNSU, parseEvent, parseSummary } from "./sefazDfe";

export interface SefazCompany {
  cnpj: string;
  uf: number; // IBGE state code of the company (23 = CE)
  storeId: string;
}

// Companies whose certificate is installed (SEFAZ_CERTIFICATE secret)
export const SEFAZ_COMPANIES: SefazCompany[] = [
  { cnpj: "67705326000195", uf: 23, storeId: "3" }, // ACR Massas & Conveniências (Vero Pasta)
];

const WAIT_MS = 61 * 60 * 1000; // SEFAZ rule: once there is nothing new, wait an hour before asking again
const RETRY_MS = 15 * 60 * 1000; // network failure: try again on a later run
const MAX_CALLS = 20; // up to 50 documents per call
export const REVIEW_WINDOW_DAYS = 15; // older invoices go to "Histórico" instead of "Para conferir"

export interface SefazSyncOptions {
  log?: (message: string) => void;
  now?: Date;
  certificate?: { name: string; validTo: Date };
}

export interface SefazSyncResult {
  skipped: boolean;
  calls: number;
  invoices: number;
  summaries: number;
  cancellations: number;
  status: string;
}

const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value));

interface PricingSnapshot {
  data: { ingredients: Ingredient[]; packaging: Packaging[] };
  maps: SupplierItemMap[];
}

async function loadPricing(db: Firestore, storeId: string): Promise<PricingSnapshot> {
  const read = async (col: string) =>
    (await db.collection(`stores/${storeId}/${col}`).get()).docs.map((d) => ({ ...d.data(), id: d.id }));
  const [ingredients, packaging, maps] = await Promise.all([
    read("pricing_ingredients"),
    read("pricing_packaging"),
    read("pricing_item_maps"),
  ]);
  return { data: { ingredients: ingredients as Ingredient[], packaging: packaging as Packaging[] }, maps: maps as SupplierItemMap[] };
}

async function markCancelled(db: Firestore, storeId: string, key: string, now: string) {
  await db.doc(`stores/${storeId}/sefaz_documents/${key}`).set({ key, cancelled: true, updatedAt: now }, { merge: true });
  const invoice = db.doc(`stores/${storeId}/pricing_invoices/${key}`);
  if ((await invoice.get()).exists) await invoice.update({ cancelled: true, updatedAt: now });
}

async function saveDocs(
  db: Firestore,
  company: SefazCompany,
  docs: DistDoc[],
  getPricing: () => Promise<PricingSnapshot>,
  now: Date,
  log: (m: string) => void,
) {
  const counts = { invoices: 0, summaries: 0, cancellations: 0 };
  const at = now.toISOString();
  const archiveBefore = now.getTime() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const docsCol = db.collection(`stores/${company.storeId}/sefaz_documents`);

  for (const d of docs) {
    try {
      if (d.schema.startsWith("procNFe")) {
        const parsed = parseNFeXml(d.xml);
        if (parsed.recipientCnpj !== company.cnpj) continue; // carrier or third party copy, not a purchase
        const ref = docsCol.doc(parsed.id);
        const previous = (await ref.get()).data();
        await ref.set(
          clean({
            key: parsed.id,
            kind: "full",
            nsu: d.nsu,
            supplierCnpj: parsed.supplierCnpj,
            supplierName: parsed.supplierName,
            issuedAt: parsed.issuedAt,
            total: parsed.total,
            number: parsed.number,
            xml: d.xml,
            receivedAt: previous?.receivedAt || at,
            updatedAt: at,
          }),
          { merge: true },
        );
        const { data, maps } = await getPricing();
        const archived = new Date(parsed.issuedAt).getTime() < archiveBefore;
        const invoice: Invoice = {
          ...parsed,
          items: prepareInvoiceItems(parsed, data, maps),
          status: archived ? "dismissed" : "pending",
          source: "sefaz",
          sefazNsu: d.nsu,
          createdAt: at,
          updatedAt: at,
          ...(archived ? { archived: true } : {}),
          ...(previous?.cancelled ? { cancelled: true } : {}),
        };
        try {
          await db.doc(`stores/${company.storeId}/pricing_invoices/${parsed.id}`).create(clean(invoice));
          counts.invoices++;
        } catch (err: any) {
          if (err?.code !== 6) throw err; // 6 = already exists (imported by hand or in an earlier run)
        }
      } else if (d.schema.startsWith("resNFe")) {
        const s = parseSummary(d.xml);
        if (!s.key) continue;
        const ref = docsCol.doc(s.key);
        const previous = (await ref.get()).data();
        await ref.set(
          clean({
            key: s.key,
            ...(previous?.kind === "full" ? {} : { kind: "summary", nsu: d.nsu }),
            supplierCnpj: previous?.supplierCnpj || s.supplierCnpj,
            supplierName: previous?.supplierName || s.supplierName,
            issuedAt: previous?.issuedAt || s.issuedAt,
            total: previous?.total ?? s.total,
            receivedAt: previous?.receivedAt || at,
            updatedAt: at,
          }),
          { merge: true },
        );
        counts.summaries++;
        if (s.situation === "cancelled") {
          await markCancelled(db, company.storeId, s.key, at);
          counts.cancellations++;
        }
      } else if (d.schema.startsWith("resEvento") || d.schema.startsWith("procEventoNFe")) {
        const e = parseEvent(d.xml);
        if (e.cancelled && e.key) {
          await markCancelled(db, company.storeId, e.key, at);
          counts.cancellations++;
        }
      }
    } catch (err: any) {
      log(`[SEFAZ] Skipped NSU ${d.nsu} (${d.schema}): ${err?.message || err}`);
    }
  }
  return counts;
}

export async function runSefazSync(
  db: Firestore,
  company: SefazCompany,
  client: DfeClient,
  options: SefazSyncOptions = {},
): Promise<SefazSyncResult> {
  const { log = console.log, now = new Date() } = options;
  const stateRef = db.doc(`stores/${company.storeId}/sefaz_state/main`);
  const state = (await stateRef.get()).data() || {};
  const result: SefazSyncResult = { skipped: false, calls: 0, invoices: 0, summaries: 0, cancellations: 0, status: "" };

  if (state.nextAllowedAt && new Date(state.nextAllowedAt) > now) {
    log(`[SEFAZ] ${company.cnpj}: waiting until ${state.nextAllowedAt}`);
    return { ...result, skipped: true, status: String(state.lastStatus || "") };
  }

  let ultNSU = padNSU(state.ultNSU || 0);
  let maxNSU = padNSU(state.maxNSU || 0);
  let message = "";
  let nextAllowedAt: string | null = null;
  let pricing: Promise<PricingSnapshot> | null = null;
  const getPricing = () => (pricing ??= loadPricing(db, company.storeId));

  try {
    for (; result.calls < MAX_CALLS; ) {
      const res = await client.distribution(ultNSU);
      result.calls++;
      result.status = res.cStat;
      message = res.xMotivo;
      if (res.cStat !== "138") {
        // 137 nothing new, 656 asked too often, anything else is a rejection: wait an hour in every case
        if (res.cStat === "137" && res.maxNSU > maxNSU) maxNSU = res.maxNSU;
        nextAllowedAt = new Date(now.getTime() + WAIT_MS).toISOString();
        break;
      }
      const counts = await saveDocs(db, company, res.docs, getPricing, now, log);
      result.invoices += counts.invoices;
      result.summaries += counts.summaries;
      result.cancellations += counts.cancellations;
      ultNSU = res.ultNSU;
      maxNSU = res.maxNSU;
      await stateRef.set({ ultNSU, maxNSU, updatedAt: new Date().toISOString() }, { merge: true }); // keep progress if a later call fails
      if (ultNSU >= maxNSU) {
        nextAllowedAt = new Date(now.getTime() + WAIT_MS).toISOString();
        break;
      }
    }
  } catch (err: any) {
    result.status = "error";
    message = err?.message || String(err);
    nextAllowedAt = new Date(now.getTime() + RETRY_MS).toISOString();
    log(`[SEFAZ] ${company.cnpj}: ${message}`);
  }

  await stateRef.set(
    clean({
      cnpj: company.cnpj,
      companyName: options.certificate?.name,
      certificateValidTo: options.certificate?.validTo?.toISOString(),
      ultNSU,
      maxNSU,
      lastRunAt: now.toISOString(),
      lastStatus: result.status,
      lastMessage: message,
      lastImported: { invoices: result.invoices, summaries: result.summaries, cancellations: result.cancellations },
      nextAllowedAt,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  );
  log(
    `[SEFAZ] ${company.cnpj}: ${result.calls} call(s), status ${result.status} (${message}), ` +
      `${result.invoices} invoice(s), ${result.summaries} summary(ies), ${result.cancellations} cancellation(s), NSU ${ultNSU}/${maxNSU}`,
  );
  return result;
}
