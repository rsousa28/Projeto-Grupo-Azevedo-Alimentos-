// Holding no Firestore (holding/{loans|liabilities|...}). As telas continuam lendo do navegador
// na hora (HoldingStorage é síncrono); este módulo grava cada alteração no banco e traz para o
// navegador o que mudou em outro aparelho. O banco é a fonte oficial.
//
// Migração: no primeiro acesso de um admin/financeiro, se o banco ainda não tem a holding,
// os dados deste navegador sobem. Se o banco já tem e este navegador nunca sincronizou,
// guardamos uma cópia local antes de trocar (holding_backup_<chave>_<data>).
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { isFinanceUser } from '../lib/permissions';

/** Chave do navegador → documento em holding/. */
export const HOLDING_DOCS: Record<string, string> = {
  holding_bank_loans_v3: 'loans',
  holding_liabilities_v3: 'liabilities',
  holding_closed_stores_v1: 'closedStores',
  holding_investments_v3: 'investments',
  holding_benchmarks_v3: 'benchmarks',
  holding_cash_balances_v2: 'cashBalances',
};

/** Disparado quando dados vindos do banco substituem os do navegador (as telas recarregam). */
export const HOLDING_CHANGED_EVENT = 'holding_data_changed';

const syncedFlag = (key: string) => `holding_cloud_synced_${key}`;

let active = false;
const pending = new Map<string, number>();
const inFlight = new Set<string>();

async function pushNow(localKey: string): Promise<void> {
  pending.delete(localKey);
  const raw = localStorage.getItem(localKey);
  if (raw === null) return;
  inFlight.add(localKey);
  try {
    await setDoc(doc(db, 'holding', HOLDING_DOCS[localKey]), {
      data: raw, // JSON exatamente como o navegador guarda: comparação simples e sem perda de campos
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.uid || null,
    });
    localStorage.setItem(syncedFlag(localKey), '1');
  } catch (err) {
    console.warn(`[Holding] Não foi possível salvar ${HOLDING_DOCS[localKey]} no servidor:`, err);
  } finally {
    inFlight.delete(localKey);
  }
}

/** Chamado por HoldingStorage depois de cada gravação no navegador. */
export function scheduleHoldingPush(localKey: string): void {
  if (!active || !HOLDING_DOCS[localKey]) return;
  window.clearTimeout(pending.get(localKey));
  pending.set(localKey, window.setTimeout(() => void pushNow(localKey), 400));
}

/** Liga a sincronização para admin/financeiro (as regras do banco negam os demais). */
export function startHoldingSync(user?: { role?: string } | null): () => void {
  if (!isFinanceUser(user) || typeof window === 'undefined') return () => {};
  active = true;
  let notifyTimer = 0;
  const notify = () => {
    window.clearTimeout(notifyTimer);
    notifyTimer = window.setTimeout(() => window.dispatchEvent(new CustomEvent(HOLDING_CHANGED_EVENT)), 100);
  };

  const unsubs: Unsubscribe[] = Object.entries(HOLDING_DOCS).map(([localKey, docId]) =>
    onSnapshot(
      doc(db, 'holding', docId),
      (snap) => {
        // Uma alteração local prestes a subir tem prioridade sobre o que veio do banco
        if (pending.has(localKey) || inFlight.has(localKey)) return;
        const local = localStorage.getItem(localKey);
        if (!snap.exists()) {
          if (local !== null) void pushNow(localKey); // migração: o banco ainda não tem este dado
          return;
        }
        const remote = String(snap.get('data') ?? '');
        if (remote === local) {
          localStorage.setItem(syncedFlag(localKey), '1');
          return;
        }
        if (local !== null && !localStorage.getItem(syncedFlag(localKey))) {
          localStorage.setItem(`holding_backup_${localKey}_${new Date().toISOString().slice(0, 10)}`, local);
        }
        localStorage.setItem(localKey, remote);
        localStorage.setItem(syncedFlag(localKey), '1');
        notify();
      },
      (err) => console.warn(`[Holding] Erro ao sincronizar ${docId}:`, err),
    ),
  );

  return () => {
    active = false;
    unsubs.forEach((u) => u());
  };
}
