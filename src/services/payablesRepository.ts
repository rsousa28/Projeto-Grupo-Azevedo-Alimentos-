// Contas a pagar: um documento por conta em stores/{loja}/accounts_payable/{id}.
// Antes, a loja inteira ficava num documento único ("all", dividido em partes quando passava de 1 MB):
// cada salvamento regravava tudo e apagava o que outra pessoa tinha acabado de salvar.
// Agora só as contas alteradas são gravadas, e a tela recebe as mudanças em tempo real.
import { collection, doc, getDoc, getDocs, onSnapshot, updateDoc, writeBatch, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { AccountPayable } from '../types';

export const LEGACY_DOC_ID = 'all';
const OFFLINE_PLACEHOLDER = '[offline_hidden]';
const VALID_ID = /^[a-zA-Z0-9_-]{1,128}$/;

const payablesCol = (storeId: string) => collection(db, 'stores', storeId, 'accounts_payable');
const payableDoc = (storeId: string, id: string) => doc(db, 'stores', storeId, 'accounts_payable', id);

/** Remove campos undefined (o Firestore recusa) e a marca de anexo oculto do cache offline. */
export function cleanPayable(item: AccountPayable): AccountPayable {
  return JSON.parse(JSON.stringify(item));
}

/** Lê o documento único antigo (com as partes, se existirem). */
export async function readLegacyPayables(storeId: string): Promise<{ items: AccountPayable[]; migrated: boolean } | null> {
  const ref = payableDoc(storeId, LEGACY_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, any>;
  let items: AccountPayable[] = Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : [];
  if (data._isChunked) {
    const chunks = await getDocs(collection(ref, 'chunks'));
    const json = chunks.docs
      .map((d) => d.data() as { index: number; data: string })
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((c) => c.data)
      .join('');
    const parsed = json ? JSON.parse(json) : {};
    items = Array.isArray(parsed.data) ? parsed.data : Array.isArray(parsed) ? parsed : [];
  }
  return { items, migrated: !!data.migratedAt };
}

/**
 * Copia as contas do documento antigo para um documento por conta. Só insere contas que ainda não
 * existem, então pode rodar mais de uma vez (e em mais de um aparelho) sem duplicar nem sobrescrever.
 */
export async function migrateLegacyPayables(storeId: string, existingIds: Set<string>): Promise<number> {
  const legacy = await readLegacyPayables(storeId);
  if (!legacy || legacy.migrated) return 0;
  const toInsert = legacy.items.filter((a) => a && VALID_ID.test(String(a.id)) && !existingIds.has(a.id));
  for (let i = 0; i < toInsert.length; i += 400) {
    const batch = writeBatch(db);
    for (const a of toInsert.slice(i, i + 400)) {
      batch.set(payableDoc(storeId, a.id), cleanPayable({ ...a, storeId }));
    }
    await batch.commit();
  }
  await updateDoc(payableDoc(storeId, LEGACY_DOC_ID), {
    migratedAt: new Date().toISOString(),
    migratedBy: auth.currentUser?.uid || 'unknown',
  });
  return toInsert.length;
}

/** Escuta as contas de uma loja em tempo real (ignora o documento antigo). */
export function subscribeStorePayables(
  storeId: string,
  onData: (items: AccountPayable[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    payablesCol(storeId),
    (snap) => onData(snap.docs.filter((d) => d.id !== LEGACY_DOC_ID).map((d) => ({ ...(d.data() as AccountPayable), id: d.id }))),
    onError,
  );
}

export interface SyncedPayable {
  storeId: string;
  json: string;
  item: AccountPayable;
}

export class MassDeleteError extends Error {}

/**
 * Grava só as diferenças entre o que está no banco (synced) e a lista nova:
 * contas novas ou alteradas são gravadas, as que sumiram da lista são apagadas, e a conta que mudou
 * de loja sai do caminho antigo. Apagar muitas contas de uma vez exige allowMassDelete.
 */
export async function savePayablesDiff(
  synced: Map<string, SyncedPayable>,
  next: AccountPayable[],
  options: { allowMassDelete?: boolean } = {},
): Promise<{ written: number; deleted: number }> {
  const nextIds = new Set(next.map((a) => a.id));
  const ops: Array<{ kind: 'set'; storeId: string; item: AccountPayable } | { kind: 'delete'; storeId: string; id: string }> = [];

  for (const raw of next) {
    if (!raw?.id || !VALID_ID.test(String(raw.id))) continue;
    const prev = synced.get(raw.id);
    let item = raw;
    // Nunca gravar a marca do cache offline no lugar do anexo de verdade
    if (item.attachedFile === OFFLINE_PLACEHOLDER) {
      item = { ...item, attachedFile: prev?.item.attachedFile };
    }
    const clean = cleanPayable(item);
    const storeId = String(clean.storeId || prev?.storeId || '1');
    const json = JSON.stringify(clean);
    if (prev && prev.json === json && prev.storeId === storeId) continue;
    ops.push({ kind: 'set', storeId, item: { ...clean, storeId } });
    if (prev && prev.storeId !== storeId) ops.push({ kind: 'delete', storeId: prev.storeId, id: raw.id });
  }

  const removed = [...synced.entries()].filter(([id]) => !nextIds.has(id));
  if (!options.allowMassDelete && removed.length > 5 && removed.length > synced.size * 0.2) {
    throw new MassDeleteError(`Bloqueado: a operação apagaria ${removed.length} contas de uma vez.`);
  }
  for (const [id, prev] of removed) ops.push({ kind: 'delete', storeId: prev.storeId, id });

  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 400)) {
      if (op.kind === 'set') batch.set(payableDoc(op.storeId, op.item.id), op.item);
      else batch.delete(payableDoc(op.storeId, op.id));
    }
    await batch.commit();
  }
  return {
    written: ops.filter((o) => o.kind === 'set').length,
    deleted: ops.filter((o) => o.kind === 'delete').length,
  };
}

/** Lê todas as contas de uma loja uma vez (relatórios). Usa o documento antigo se ainda não migrou. */
export async function fetchStorePayables(storeId: string): Promise<AccountPayable[]> {
  const snap = await getDocs(payablesCol(storeId));
  const items = snap.docs.filter((d) => d.id !== LEGACY_DOC_ID).map((d) => ({ ...(d.data() as AccountPayable), id: d.id }));
  if (items.length > 0) return items;
  const legacy = await readLegacyPayables(storeId);
  return legacy && !legacy.migrated ? legacy.items : [];
}
