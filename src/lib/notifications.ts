// Padrão único das notificações do sistema.
// Cada evento vira um AppNotification estruturado: o app desenha o card a partir dele
// (NotificationCard) e o celular recebe o texto gerado por pushText(), sempre no mesmo formato.
import type { PayableReport } from '../../server/payableSummary';

export type NotifKind =
  | 'payable_report'
  | 'payable_change'
  | 'cash_closing'
  | 'cash_reminder'
  | 'checklist'
  | 'sync'
  | 'test'
  | 'system';

export type NotifTone = 'critical' | 'warning' | 'success' | 'info';

export interface NotifField {
  label: string;
  value: string;
  tone?: NotifTone;
}

export interface AppNotification {
  version: 1;
  kind: NotifKind;
  tone: NotifTone;
  category: string;  // "Caixa", "Checklist", "Contas a Pagar"
  title: string;     // manchete curta: "Caixa fechado com falta"
  subtitle?: string; // contexto: "Vero Pasta · João · 11/11"
  metric?: { label: string; value: string; tone?: NotifTone };
  fields?: NotifField[];
  url?: string;
  actionLabel?: string;
  createdAt: string;
}

export const TONE_DOT: Record<NotifTone, string> = {
  critical: '🔴',
  warning: '🟡',
  success: '🟢',
  info: '🔵',
};

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (iso: string) => (iso.includes('-') ? iso.slice(0, 10).split('-').reverse().join('/') : iso);

/** Texto do push no celular: "🔴 Caixa · Caixa fechado com falta" + contexto + números em uma linha. */
export function pushText(n: AppNotification): { title: string; body: string } {
  const title = `${TONE_DOT[n.tone]} ${n.category} · ${n.title}`;
  const lines: string[] = [];
  if (n.subtitle) lines.push(n.subtitle);
  const facts = [
    ...(n.metric ? [`${n.metric.label} ${n.metric.value}`] : []),
    ...(n.fields || []).map((f) => `${f.label} ${f.value}`),
  ];
  if (facts.length) lines.push(facts.join(' · '));
  return { title, body: lines.join('\n') };
}

const base = (n: Omit<AppNotification, 'version' | 'createdAt'>): AppNotification => ({
  version: 1,
  createdAt: new Date().toISOString(),
  ...n,
});

// ---------------------------------------------------------------
// Construtores de cada evento
// ---------------------------------------------------------------

export function cashClosingNotification(d: {
  storeName: string;
  userName: string;
  date: string;
  totalGeral: number;
  totalSistema: number;
  diff: number;
}): AppNotification {
  const diffAbs = Math.abs(d.diff);
  const balanced = diffAbs < 0.005;
  const tone: NotifTone = balanced ? 'success' : d.diff > 0 ? 'warning' : 'critical';
  return base({
    kind: 'cash_closing',
    tone,
    category: 'Caixa',
    title: balanced ? 'Caixa fechado e conferido' : d.diff > 0 ? 'Caixa fechado com sobra' : 'Caixa fechado com falta',
    subtitle: `${d.storeName} · ${d.userName} · ${dateBR(d.date)}`,
    metric: { label: 'Receita do dia', value: brl(d.totalGeral) },
    fields: [
      { label: 'Sistema', value: brl(d.totalSistema) },
      {
        label: 'Diferença',
        value: balanced ? 'R$ 0,00' : `${d.diff > 0 ? '+' : '−'}${brl(diffAbs)}`,
        tone: balanced ? 'success' : d.diff > 0 ? 'warning' : 'critical',
      },
    ],
    url: '/cash-closing',
    actionLabel: 'Ver fechamento',
  });
}

export function cashReminderNotification(storeName: string): AppNotification {
  return base({
    kind: 'cash_reminder',
    tone: 'warning',
    category: 'Caixa',
    title: 'Fechamento de caixa pendente',
    subtitle: `${storeName} · lance o fechamento do turno`,
    url: '/cash-closing',
    actionLabel: 'Fechar caixa',
  });
}

export function checklistNotification(d: {
  storeName: string;
  templateTitle: string;
  userName: string;
  conformityIndex: number;
  plansCount: number;
}): AppNotification {
  const c = Math.round(d.conformityIndex);
  const tone: NotifTone = c >= 80 ? 'success' : c >= 60 ? 'warning' : 'critical';
  const fields: NotifField[] = [{ label: 'Responsável', value: d.userName }];
  if (d.plansCount > 0) {
    fields.push({ label: 'Planos de ação', value: String(d.plansCount), tone: 'warning' });
  }
  return base({
    kind: 'checklist',
    tone,
    category: 'Checklist',
    title: d.templateTitle,
    subtitle: `${d.storeName} · vistoria concluída`,
    metric: { label: 'Conformidade', value: `${c}%`, tone },
    fields,
    url: '/checklist',
    actionLabel: 'Ver checklist',
  });
}

const PAYABLE_ACTION = {
  CREATED: { title: 'Nova conta cadastrada', tone: 'info' as NotifTone },
  UPDATED: { title: 'Conta atualizada', tone: 'info' as NotifTone },
  PAID: { title: 'Pagamento confirmado', tone: 'success' as NotifTone },
  DELETED: { title: 'Conta removida', tone: 'warning' as NotifTone },
};

export function payableChangeNotification(d: {
  action: keyof typeof PAYABLE_ACTION;
  supplier: string;
  value: number;
  storeName: string;
  userName?: string;
}): AppNotification {
  const a = PAYABLE_ACTION[d.action] || PAYABLE_ACTION.UPDATED;
  return base({
    kind: 'payable_change',
    tone: a.tone,
    category: 'Contas a Pagar',
    title: a.title,
    subtitle: `${d.storeName} · ${d.userName || 'Usuário'}`,
    metric: { label: d.supplier, value: brl(d.value) },
    url: '/accounts-payable',
    actionLabel: 'Abrir Contas a Pagar',
  });
}

export function syncNotification(count: number): AppNotification {
  return base({
    kind: 'sync',
    tone: 'success',
    category: 'Sincronização',
    title: 'Dados enviados para a nuvem',
    subtitle: `${count} ${count === 1 ? 'registro salvo offline foi enviado' : 'registros salvos offline foram enviados'}`,
    url: '/checklist',
  });
}

export function testNotification(): AppNotification {
  return base({
    kind: 'test',
    tone: 'info',
    category: 'Sistema',
    title: 'Notificações funcionando',
    subtitle: 'Este aparelho está recebendo os alertas do Grupo Azevedo.',
  });
}

export function systemNotification(title: string, subtitle?: string, tone: NotifTone = 'info', url?: string): AppNotification {
  return base({ kind: 'system', tone, category: 'Sistema', title, subtitle, url });
}

/** Valida o que chega de outros aparelhos (Firestore) antes de desenhar. */
export function parseCard(value: unknown): AppNotification | undefined {
  const v = value as AppNotification | undefined;
  return v && v.version === 1 && typeof v.title === 'string' && typeof v.category === 'string' ? v : undefined;
}

export function parseReport(value: unknown): PayableReport | undefined {
  const v = value as PayableReport | undefined;
  return v && v.version === 1 && Array.isArray(v.stores) ? v : undefined;
}
