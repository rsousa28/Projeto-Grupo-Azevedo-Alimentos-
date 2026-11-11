// Sino de notificações: histórico no padrão visual único e preferências essenciais.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, CheckCheck, Loader2, Receipt, Send, Smartphone, X } from 'lucide-react';
import { NotificationService, NotificationLogItem, NotificationPreferences } from '../services/NotificationService';
import { getPushDiagnosticStatus, subscribeUserToPush, triggerServerPushTest } from '../utils/pushConfig';
import { pushText, testNotification, type NotifKind, type NotifTone } from '../lib/notifications';
import { kindIcon, timeLabel } from './notifications/NotificationCard';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';

// Tons para fundo claro e escuro (o painel segue o tema do app)
const LIST_TONE: Record<NotifTone, { tile: string; dot: string }> = {
  critical: { tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300', dot: 'bg-rose-500' },
  warning: { tile: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300', dot: 'bg-amber-500' },
  success: { tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-500' },
  info: { tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300', dot: 'bg-sky-500' },
};

const TYPE_KIND: Record<NotificationLogItem['type'], NotifKind> = {
  PAYABLE_HOURLY: 'payable_report',
  FINANCIAL_ALERT: 'payable_change',
  CASH_CLOSING: 'cash_closing',
  CHECKLIST: 'checklist',
  TEST: 'test',
  SYSTEM: 'system',
};

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const stripEmoji = (t: string) => t.replace(/[\p{Extended_Pictographic}️]/gu, '').replace(/\s+/g, ' ').trim();

interface Row {
  id: string;
  kind: NotifKind;
  tone: NotifTone;
  category: string;
  title: string;
  subtitle?: string;
  url?: string;
  timestamp: string;
  read: boolean;
}

/** Converte o histórico (inclusive itens antigos, só com texto) para a mesma linha visual. */
function toRow(item: NotificationLogItem): Row {
  if (item.card) {
    return {
      id: item.id,
      kind: item.card.kind,
      tone: item.card.tone,
      category: item.card.category,
      title: item.card.title,
      subtitle: item.card.subtitle,
      url: item.card.url,
      timestamp: item.timestamp,
      read: item.read,
    };
  }
  if (item.report) {
    const r = item.report;
    return {
      id: item.id,
      kind: 'payable_report',
      tone: r.status === 'critical' ? 'critical' : r.status === 'attention' ? 'warning' : 'success',
      category: 'Contas a Pagar',
      title: `Relatório das ${String(r.hour).padStart(2, '0')}:00`,
      subtitle: r.status === 'ok' ? 'Nenhuma conta vencida' : `Vencido ${brl(r.total.overdue)} · hoje ${brl(r.total.today)}`,
      url: '/accounts-payable',
      timestamp: item.timestamp,
      read: item.read,
    };
  }
  const kind = TYPE_KIND[item.type] || 'system';
  return {
    id: item.id,
    kind,
    tone: item.type === 'PAYABLE_HOURLY' && item.title.includes('ATENÇÃO') ? 'critical' : 'info',
    category: kind.startsWith('payable') ? 'Contas a Pagar' : kind === 'cash_closing' ? 'Caixa' : kind === 'checklist' ? 'Checklist' : 'Sistema',
    title: stripEmoji(item.title),
    subtitle: stripEmoji(item.body.split('\n')[0] || ''),
    timestamp: item.timestamp,
    read: item.read,
  };
}

function dayGroup(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Ontem';
  return 'Anteriores';
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'recent' | 'prefs'>('recent');
  const [permission, setPermission] = useState<NotificationPermission>(NotificationService.getPermission());
  const [preferences, setPreferences] = useState<NotificationPreferences>(NotificationService.getPreferences());
  const [logs, setLogs] = useState<NotificationLogItem[]>(() => NotificationService.getLogs());
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [devicesCount, setDevicesCount] = useState(0);
  const [busy, setBusy] = useState<'device' | 'test' | 'report' | null>(null);

  const { user } = useAuth();
  const { currentStore } = useStore();
  const { success, warning, error: toastError } = useToast();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = NotificationService.isCurrentUserAdmin();

  // Histórico atualizado em tempo real quando chega uma notificação
  useEffect(() => {
    const refresh = () => setLogs(NotificationService.getLogs());
    window.addEventListener('app_push_notification', refresh);
    return () => window.removeEventListener('app_push_notification', refresh);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLogs(NotificationService.getLogs());
    setPermission(NotificationService.getPermission());
    getPushDiagnosticStatus()
      .then((d) => {
        setDeviceSubscribed(d.isSubscribed);
        setDevicesCount(d.serverDevicesCount || 0);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setIsOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const rows = useMemo(() => logs.map(toRow), [logs]);
  const unread = rows.filter((r) => !r.read).length;
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: Row[] }> = [];
    for (const r of rows) {
      const label = dayGroup(r.timestamp);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [rows]);

  const markAllRead = () => {
    NotificationService.markAllAsRead();
    setLogs(NotificationService.getLogs());
  };

  const openRow = (r: Row) => {
    markAllRead();
    if (r.url) {
      setIsOpen(false);
      navigate(r.url);
    }
  };

  const enableDevice = async () => {
    setBusy('device');
    try {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js');
      const perm = await NotificationService.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        warning('Libere as notificações nas configurações do navegador ou do celular.', 'Permissão negada');
        return;
      }
      const sub = await subscribeUserToPush(user, true);
      if (!sub) throw new Error('Não foi possível registrar este aparelho.');
      setDeviceSubscribed(true);
      const d = await getPushDiagnosticStatus();
      setDevicesCount(d.serverDevicesCount || 1);
      success('Este aparelho vai receber os alertas, inclusive com o app fechado.', 'Notificações ativadas');
    } catch (err: any) {
      toastError(err?.message || 'Não foi possível ativar as notificações.');
    } finally {
      setBusy(null);
    }
  };

  const togglePref = (key: keyof NotificationPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] } as NotificationPreferences;
    setPreferences(next);
    NotificationService.savePreferences(next);
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      await subscribeUserToPush(user);
      const { title, body } = pushText(testNotification());
      await triggerServerPushTest(0, title, body).catch(() => null); // push no celular (servidor)
      await NotificationService.sendTestNotification(); // aviso neste aparelho
      setLogs(NotificationService.getLogs());
    } catch (err: any) {
      toastError(err?.message || 'Não foi possível enviar o teste.');
    } finally {
      setBusy(null);
    }
  };

  const sendReport = async () => {
    setBusy('report');
    try {
      await NotificationService.triggerAccountsPayableReport();
      setLogs(NotificationService.getLogs());
    } catch (err: any) {
      toastError(err?.message || 'Não foi possível gerar o relatório.');
    } finally {
      setBusy(null);
    }
  };

  const prefsList: Array<{ key: keyof NotificationPreferences; title: string; text: string; show: boolean }> = [
    {
      key: 'accountsPayableHourlyReminder',
      title: 'Relatório de Contas a Pagar',
      text: 'De hora em hora: vencidos, vencendo hoje e a vencer por unidade.',
      show: isAdmin,
    },
    { key: 'cashClosingReminder', title: 'Fechamento de caixa', text: 'Quando um caixa for fechado e lembrete de turno pendente.', show: true },
    { key: 'checklistReminder', title: 'Checklists', text: 'Quando um checklist for concluído, com a conformidade.', show: true },
  ];

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={unread ? `Notificações: ${unread} não lidas` : 'Notificações'}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:border-[#2A2A2A] dark:bg-[#1E1E1E] dark:text-slate-300 dark:hover:bg-[#252525] dark:hover:text-white"
      >
        {permission === 'denied' ? <BellOff className="h-4 w-4 text-rose-400" /> : <Bell className="h-4 w-4" />}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#0F0F0F]">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : permission !== 'granted' ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#0F0F0F]" title="Notificações desativadas neste aparelho" />
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-2.5 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[calc(100dvh-6.5rem)] sm:w-[400px] dark:border-white/10 dark:bg-[#161616] dark:text-slate-100"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/5">
              <div>
                <p className="text-sm font-semibold">Notificações</p>
                <p className="text-[11px] text-slate-500">{currentStore.name}</p>
              </div>
              <div className="flex items-center gap-1">
                {tab === 'recent' && unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Marcar como lidas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-slate-100 px-3 pt-1 dark:border-white/5">
              {([
                ['recent', `Recentes${unread ? ` · ${unread}` : ''}`],
                ['prefs', 'Preferências'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 px-2.5 py-2 text-xs font-semibold transition ${
                    tab === id ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {tab === 'recent' ? (
                rows.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-12 text-center">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold">Tudo em dia</p>
                    <p className="mt-0.5 text-xs text-slate-500">Os alertas de caixa, checklists e contas aparecem aqui.</p>
                  </div>
                ) : (
                  groups.map((g) => (
                    <div key={g.label}>
                      <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</p>
                      <ul>
                        {g.items.map((r) => {
                          const Icon = kindIcon(r.kind);
                          const t = LIST_TONE[r.tone];
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                onClick={() => openRow(r)}
                                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                              >
                                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.tile}`}>
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[11px] font-medium text-slate-500">{r.category}</span>
                                    <span className="shrink-0 text-[10.5px] text-slate-400">{timeLabel(r.timestamp)}</span>
                                  </span>
                                  <span className={`mt-0.5 block truncate text-[13px] ${r.read ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'}`}>
                                    {r.title}
                                  </span>
                                  {r.subtitle && <span className="mt-0.5 block truncate text-xs text-slate-500">{r.subtitle}</span>}
                                </span>
                                {!r.read && <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${t.dot}`} aria-label="Não lida" />}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )
              ) : (
                <div className="space-y-4 p-4">
                  {/* Este aparelho */}
                  <section className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          permission === 'granted' && deviceSubscribed ? LIST_TONE.success.tile : permission === 'denied' ? LIST_TONE.critical.tile : LIST_TONE.warning.tile
                        }`}
                      >
                        <Smartphone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">
                          {permission === 'granted' && deviceSubscribed
                            ? 'Este aparelho recebe notificações'
                            : permission === 'denied'
                              ? 'Notificações bloqueadas'
                              : 'Notificações desativadas neste aparelho'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {permission === 'granted' && deviceSubscribed
                            ? `Inclusive com o app fechado${isAdmin && devicesCount ? ` · ${devicesCount} aparelhos conectados` : ''}.`
                            : permission === 'denied'
                              ? 'Libere nas configurações do navegador (cadeado ao lado do endereço) ou do celular.'
                              : 'No iPhone, adicione o sistema à Tela de Início antes de ativar.'}
                        </p>
                      </div>
                    </div>
                    {permission !== 'denied' && !(permission === 'granted' && deviceSubscribed) && (
                      <button
                        type="button"
                        onClick={enableDevice}
                        disabled={busy === 'device'}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        {busy === 'device' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                        Ativar notificações neste aparelho
                      </button>
                    )}
                  </section>

                  {/* O que receber */}
                  <section>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">O que receber</p>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
                      {prefsList
                        .filter((p) => p.show)
                        .map((p) => {
                          const on = preferences[p.key] !== false;
                          return (
                            <label key={p.key} className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-medium">{p.title}</span>
                                <span className="block text-xs text-slate-500">{p.text}</span>
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                onClick={() => togglePref(p.key)}
                                className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/15'}`}
                              >
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                              </button>
                            </label>
                          );
                        })}
                    </div>
                  </section>

                  {/* Ferramentas do administrador */}
                  {isAdmin && (
                    <section>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Administração</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={sendTest}
                          disabled={!!busy}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          {busy === 'test' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Enviar teste
                        </button>
                        <button
                          type="button"
                          onClick={sendReport}
                          disabled={!!busy}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          {busy === 'report' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                          Relatório agora
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
