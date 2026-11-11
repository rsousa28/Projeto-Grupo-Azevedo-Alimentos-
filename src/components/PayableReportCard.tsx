// Card do relatório horário de Contas a Pagar (aparece no app quando o relatório chega).
import React from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Receipt, TrendingUp, X } from 'lucide-react';
import type { PayableReport, PayableStatus } from '../../server/payableSummary';

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS: Record<PayableStatus, { label: string; pill: string; dot: string; accent: string }> = {
  critical: {
    label: 'Atenção',
    pill: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
    dot: 'bg-rose-400',
    accent: 'from-rose-500/25',
  },
  attention: {
    label: 'Vence hoje',
    pill: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
    dot: 'bg-amber-400',
    accent: 'from-amber-500/20',
  },
  ok: {
    label: 'Em dia',
    pill: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    dot: 'bg-emerald-400',
    accent: 'from-emerald-500/20',
  },
};

// "B32 (MOSSORÓ)" -> "B32 Mossoró"
function storeLabel(name: string) {
  const clean = name.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean
    .split(' ')
    .map((w) => (/^[A-Z]\d+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function reportDateLabel(report: PayableReport) {
  const [y, m, d] = report.date.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
  return `${String(report.hour).padStart(2, '0')}:00 · ${day.replace(/\./g, '')}`;
}

export default function PayableReportCard({
  report,
  onOpen,
  onDismiss,
}: {
  report: PayableReport;
  onOpen?: () => void;
  onDismiss?: () => void;
}) {
  const s = STATUS[report.status];
  const { total } = report;
  const maxOverdue = Math.max(...report.stores.map((x) => x.overdue), 0);
  const rank: Record<PayableStatus, number> = { critical: 0, attention: 1, ok: 2 };
  const stores = [...report.stores].sort((a, b) => rank[a.status] - rank[b.status] || b.overdue - a.overdue);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]/95 text-slate-100 shadow-2xl shadow-black/50 ring-1 ring-black/5 backdrop-blur-xl">
      {/* Cabeçalho */}
      <div className={`bg-gradient-to-br ${s.accent} to-transparent px-4 pb-3 pt-3.5`}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
            <Receipt className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold tracking-tight text-white">Contas a Pagar</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.pill}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Clock3 className="h-3 w-3" /> Relatório das {reportDateLabel(report)}
            </p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="-mr-1 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar relatório"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Número principal */}
        <div className="mt-3">
          {report.status === 'ok' ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <p className="text-lg font-semibold text-white">Nenhuma conta vencida no grupo</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {report.status === 'critical' ? 'Vencido no grupo' : 'Vence hoje no grupo'}
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <p className="text-[26px] font-bold leading-none tracking-tight text-white tabular-nums">
                  {brl(report.status === 'critical' ? total.overdue : total.today)}
                </p>
                {report.status === 'critical' && (
                  <p className="text-xs text-rose-300">
                    {total.overdueCount} {total.overdueCount === 1 ? 'boleto em atraso' : 'boletos em atraso'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Indicadores do grupo */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <Kpi icon={<CalendarClock className="h-3 w-3" />} label="Vence hoje" value={brl(total.today)} />
          <Kpi icon={<CheckCircle2 className="h-3 w-3" />} label="Pago no mês" value={brl(total.paid)} />
          <Kpi icon={<TrendingUp className="h-3 w-3" />} label="A vencer" value={brl(total.upcoming)} />
        </div>
      </div>

      {/* Por unidade */}
      <div className="border-t border-white/5 px-4 py-2.5">
        <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Unidade</span>
          <span className="w-[86px] text-right">Vencido</span>
          <span className="w-[72px] text-right">Hoje</span>
        </div>
        <ul className="divide-y divide-white/5">
          {stores.map((st) => {
            const ss = STATUS[st.status];
            return (
              <li key={st.storeId} className="py-1.5">
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${ss.dot}`} aria-hidden />
                    <span className="truncate font-medium text-slate-200">{storeLabel(st.storeName)}</span>
                  </span>
                  <span className={`w-[86px] text-right tabular-nums ${st.overdue > 0 ? 'font-semibold text-rose-300' : 'text-slate-500'}`}>
                    {st.overdue > 0 ? brl(st.overdue) : '—'}
                  </span>
                  <span className={`w-[72px] text-right tabular-nums ${st.today > 0 ? 'font-medium text-amber-200' : 'text-slate-500'}`}>
                    {st.today > 0 ? brl(st.today) : '—'}
                  </span>
                </div>
                {st.overdue > 0 && (
                  <div className="mt-1 flex items-center gap-2 pl-4">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-rose-400/70" style={{ width: `${maxOverdue ? (st.overdue / maxOverdue) * 100 : 0}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {st.overdueCount} {st.overdueCount === 1 ? 'boleto' : 'boletos'}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-white/[0.02] px-4 py-2.5 pb-3">
        <span className="text-[10.5px] text-slate-500">Envio automático a cada hora</span>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            Abrir Contas a Pagar <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-1.5 ring-1 ring-inset ring-white/5">
      <p className="flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
