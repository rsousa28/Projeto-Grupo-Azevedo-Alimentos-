// Reads a store's accounts payable on the server (admin SDK). One document per account in
// stores/{id}/accounts_payable/{accountId}; before the migration everything lived in the "all"
// document (split into chunks above 1 MB), which is still read as a fallback.
import type { Firestore } from "firebase-admin/firestore";
import { parseAccountsChunks, parseAccountsDoc } from "./payableSummary.js";

export async function loadStorePayables(db: Firestore, storeId: string): Promise<any[]> {
  const col = db.collection("stores").doc(storeId).collection("accounts_payable");
  const snap = await col.get();
  const items = snap.docs.filter((d) => d.id !== "all").map((d) => ({ ...d.data(), id: d.id }));
  if (items.length > 0) return items;

  const legacy = await col.doc("all").get();
  if (!legacy.exists || legacy.get("migratedAt")) return [];
  let accounts = parseAccountsDoc(legacy.data());
  if (accounts.length === 0) {
    const chunks = await legacy.ref.collection("chunks").get();
    accounts = parseAccountsChunks(chunks.docs.map((d) => d.data() as { index: number; data: string }));
  }
  return accounts;
}
