// Busca automática de notas na SEFAZ (feita pelo servidor a cada hora com o certificado A1):
// situação da conexão e notas que por enquanto só têm o resumo, sem os itens.
import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { AlertTriangle, ChevronDown, CloudDownload, Clock3, ShieldCheck } from 'lucide-react';
import { db } from '../../lib/firebase';
import { formatCnpj } from '../../lib/pricing/nfe';
import { brl, cx } from './ui';

interface SefazState {
  cnpj: string;
  companyName?: string;
  certificateValidTo?: string;
  lastRunAt?: string;
  lastStatus?: string;
  lastMessage?: string;
  nextAllowedAt?: string | null;
  lastImported?: { invoices: number; summaries: number; cancellations: number };
}

interface SefazSummary {
  key: string;
  supplierName: string;
  issuedAt: string;
  total: number;
  cancelled?: boolean;
}

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

function statusText(s: SefazState): { tone: 'ok' | 'wait' | 'error'; text: string } {
  const imported = s.lastImported?.invoices || 0;
  if ((s.lastStatus === '137' || s.lastStatus === '138') && imported > 0) {
    return { tone: 'ok', text: imported === 1 ? '1 nota nova na última busca' : `${imported} notas novas na última busca` };
  }
  if (s.lastStatus === '138') return { tone: 'ok', text: 'Notas recebidas' };
  if (s.lastStatus === '137') return { tone: 'ok', text: 'Tudo em dia, nenhuma nota nova' };
  if (s.lastStatus === '656') return { tone: 'wait', text: 'A SEFAZ pediu uma pausa de 1 hora' };
  if (s.lastStatus === 'error') return { tone: 'error', text: `Sem conexão com a SEFAZ: ${s.lastMessage || 'erro desconhecido'}` };
  return { tone: 'error', text: s.lastMessage ? `SEFAZ: ${s.lastMessage}` : 'Aguardando a primeira busca' };
}

export default function SefazPanel({ storeId }: { storeId: string }) {
  const [state, setState] = useState<SefazState | null | undefined>(undefined);
  const [summaries, setSummaries] = useState<SefazSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        doc(db, 'stores', storeId, 'sefaz_state', 'main'),
        (snap) => setState(snap.exists() ? (snap.data() as SefazState) : null),
        () => setState(null),
      ),
      onSnapshot(
        query(collection(db, 'stores', storeId, 'sefaz_documents'), where('kind', '==', 'summary')),
        (snap) =>
          setSummaries(
            snap.docs
              .map((d) => d.data() as SefazSummary)
              .filter((s) => !s.cancelled)
              .sort((a, b) => String(b.issuedAt).localeCompare(String(a.issuedAt))),
          ),
        () => setSummaries([]),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [storeId]);

  if (state === undefined) return null;

  if (state === null) {
    return (
      <div className="flex items-center gap-2 border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-white/5">
        <CloudDownload className="h-4 w-4 shrink-0 text-stone-400" />
        A busca automática na SEFAZ não está ativa para esta loja. Ela precisa do certificado digital A1 do CNPJ.
      </div>
    );
  }

  const status = statusText(state);
  const certDays = state.certificateValidTo ? Math.floor((new Date(state.certificateValidTo).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="border-t border-stone-100 dark:border-white/5" data-testid="sefaz-panel">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
          <span
            className={cx(
              'h-2 w-2 rounded-full',
              status.tone === 'ok' ? 'bg-emerald-500' : status.tone === 'wait' ? 'bg-amber-500' : 'bg-rose-500',
            )}
          />
          SEFAZ · CNPJ {formatCnpj(state.cnpj)}
        </span>
        <span className={cx(status.tone === 'error' && 'text-rose-600 dark:text-rose-400')}>{status.text}</span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" /> Última busca {when(state.lastRunAt)}
          {state.nextAllowedAt ? ` · próxima depois de ${when(state.nextAllowedAt)}` : ''}
        </span>
        {certDays !== null && (
          <span className={cx('inline-flex items-center gap-1', certDays < 30 && 'font-semibold text-amber-700 dark:text-amber-400')}>
            {certDays < 30 ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {certDays < 0 ? 'Certificado vencido' : `Certificado válido até ${new Date(state.certificateValidTo!).toLocaleDateString('pt-BR')}`}
          </span>
        )}
      </div>

      {summaries.length > 0 && (
        <div className="border-t border-stone-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-xs font-semibold text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/[0.03]"
          >
            <span>
              {summaries.length} {summaries.length === 1 ? 'nota aguardando' : 'notas aguardando'} o XML completo na SEFAZ
            </span>
            <ChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="px-5 pb-3">
              <p className="mb-2 text-xs text-stone-500">
                Por enquanto a SEFAZ mostrou só o resumo destas notas, sem os itens. O XML completo costuma chegar sozinho em algumas horas, e aí a
                nota aparece na lista para conferir.
              </p>
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100 text-sm dark:divide-white/5 dark:border-white/5">
                {summaries.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-800 dark:text-stone-200">{s.supplierName}</span>
                      <span className="block text-xs text-stone-500">{new Date(s.issuedAt).toLocaleDateString('pt-BR')}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{brl(s.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
