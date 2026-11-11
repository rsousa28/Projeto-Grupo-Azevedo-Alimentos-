// Visual único das notificações e avisos do app: mesmo cartão escuro, mesma hierarquia
// (ícone por tipo, categoria e horário, manchete, contexto, números, ação).
import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  CloudUpload,
  Info,
  Receipt,
  X,
  XCircle,
} from 'lucide-react';
import type { AppNotification, NotifKind, NotifTone } from '../../lib/notifications';

export const TONE_STYLES: Record<
  NotifTone,
  { tile: string; text: string; dot: string; accent: string; label: string; pill: string }
> = {
  critical: {
    tile: 'bg-rose-500/15 text-rose-300 ring-rose-400/20',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    accent: 'from-rose-500/20',
    label: 'Atenção',
    pill: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
  },
  warning: {
    tile: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    accent: 'from-amber-500/15',
    label: 'Aviso',
    pill: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
  },
  success: {
    tile: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    accent: 'from-emerald-500/15',
    label: 'Concluído',
    pill: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  },
  info: {
    tile: 'bg-sky-500/15 text-sky-300 ring-sky-400/20',
    text: 'text-sky-300',
    dot: 'bg-sky-400',
    accent: 'from-sky-500/15',
    label: 'Info',
    pill: 'bg-sky-500/15 text-sky-300 ring-sky-400/30',
  },
};

const KIND_ICON: Record<NotifKind, React.ElementType> = {
  payable_report: Receipt,
  payable_change: Receipt,
  cash_closing: Banknote,
  cash_reminder: Banknote,
  checklist: ClipboardCheck,
  sync: CloudUpload,
  test: BellRing,
  system: Info,
};

export function kindIcon(kind: NotifKind | undefined): React.ElementType {
  return (kind && KIND_ICON[kind]) || Info;
}

/** "agora", "há 12 min", "às 07:00", "ontem 18:30", "10/11 09:15" */
export function timeLabel(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const diffMin = Math.round((now - t.getTime()) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const hm = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date(now);
  const sameDay = t.toDateString() === today.toDateString();
  if (sameDay) return `às ${hm}`;
  const yesterday = new Date(now - 86400000);
  if (t.toDateString() === yesterday.toDateString()) return `ontem ${hm}`;
  return `${t.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hm}`;
}

export const CARD_SURFACE =
  'overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]/95 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-xl';

/** Cabeçalho comum: ícone do tipo, categoria, horário, selo de status e fechar. */
export function NotifHeader({
  icon: Icon,
  tone,
  category,
  meta,
  pill,
  onDismiss,
}: {
  icon: React.ElementType;
  tone: NotifTone;
  category: string;
  meta?: string;
  pill?: string;
  onDismiss?: () => void;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${s.tile}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{category}</p>
          {pill && (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold ring-1 ring-inset ${s.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {pill}
            </span>
          )}
          {meta && <p className="text-[11px] text-slate-500">{meta}</p>}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="-mr-1 -mt-0.5 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function NotifAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 transition hover:bg-slate-200"
    >
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

/** Card completo de um evento (caixa, checklist, conta, sincronização, teste). */
export default function NotificationCard({
  notification: n,
  onOpen,
  onDismiss,
}: {
  notification: AppNotification;
  onOpen?: () => void;
  onDismiss?: () => void;
}) {
  const s = TONE_STYLES[n.tone];
  const metricTone = n.metric?.tone ? TONE_STYLES[n.metric.tone].text : 'text-white';
  return (
    <div className={CARD_SURFACE}>
      <div className={`bg-gradient-to-br ${s.accent} to-transparent px-4 pb-3.5 pt-3.5`}>
        <NotifHeader icon={kindIcon(n.kind)} tone={n.tone} category={n.category} meta={timeLabel(n.createdAt)} onDismiss={onDismiss} />
        <div className="mt-2.5 pl-12">
          <p className="text-[15px] font-semibold leading-snug tracking-tight text-white">{n.title}</p>
          {n.subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{n.subtitle}</p>}
          {n.metric && (
            <div className="mt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{n.metric.label}</p>
              <p className={`text-[22px] font-bold leading-tight tracking-tight tabular-nums ${metricTone}`}>{n.metric.value}</p>
            </div>
          )}
          {n.fields && n.fields.length > 0 && (
            <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
              {n.fields.map((f) => (
                <div key={f.label} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 ring-1 ring-inset ring-white/5">
                  <dt className="text-[9.5px] font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
                  <dd className={`truncate text-[12.5px] font-semibold tabular-nums ${f.tone ? TONE_STYLES[f.tone].text : 'text-slate-100'}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      {onOpen && (
        <div className="flex justify-end border-t border-white/5 bg-white/[0.02] px-4 py-2.5 pb-3">
          <NotifAction label={n.actionLabel || 'Abrir'} onClick={onOpen} />
        </div>
      )}
    </div>
  );
}

const TOAST_ICON: Record<NotifTone, React.ElementType> = {
  success: CheckCircle2,
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
};

/** Aviso curto das ações do usuário (salvo, erro, atenção), no mesmo visual dos cards. */
export function ToastCard({ tone, title, message, onDismiss }: { tone: NotifTone; title?: string; message: string; onDismiss: () => void }) {
  const s = TONE_STYLES[tone];
  const Icon = TOAST_ICON[tone];
  return (
    <div className={`${CARD_SURFACE} flex items-start gap-3 px-3.5 py-3`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${s.tile}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {title && <p className="text-[13px] font-semibold leading-tight text-white">{title}</p>}
        <p className={`text-xs leading-relaxed text-slate-300 whitespace-pre-line ${title ? 'mt-0.5' : ''}`}>{message}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="-mr-1 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
