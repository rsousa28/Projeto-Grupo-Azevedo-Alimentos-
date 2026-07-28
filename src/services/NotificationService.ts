import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { STORES } from '../contexts/StoreContext';

export interface NotificationPreferences {
  enabled: boolean;
  cashClosingReminder: boolean;
  checklistReminder: boolean;
  accountsPayableHourlyReminder: boolean;
  cashClosingTimes: string[]; // e.g. ['14:00', '21:00']
  lastNotifiedChecklistDate?: string;
  lastNotifiedCashClosingSlot?: string;
  lastNotifiedAccountsPayableHour?: string;
}

export interface NotificationLogItem {
  id: string;
  title: string;
  body: string;
  type: 'CHECKLIST' | 'CASH_CLOSING' | 'SYSTEM' | 'TEST' | 'PAYABLE_HOURLY';
  timestamp: string;
  read: boolean;
}

const PREFS_KEY = 'grupo_azevedo_notification_prefs';
const LOGS_KEY = 'grupo_azevedo_notification_logs';

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  cashClosingReminder: true,
  checklistReminder: true,
  accountsPayableHourlyReminder: true,
  cashClosingTimes: ['14:30', '21:30'],
};

export class NotificationService {
  /**
   * Check if Web Notifications API is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current browser notification permission
   */
  static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request push notification permission from the browser
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notificações de navegador não são suportadas neste dispositivo.');
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Save enabled state
      const prefs = this.getPreferences();
      prefs.enabled = true;
      this.savePreferences(prefs);
    }
    return permission;
  }

  /**
   * Get notification preferences
   */
  static getPreferences(): NotificationPreferences {
    try {
      const data = localStorage.getItem(PREFS_KEY);
      return data ? { ...DEFAULT_PREFS, ...JSON.parse(data) } : DEFAULT_PREFS;
    } catch (e) {
      console.error('Error loading notification preferences:', e);
      return DEFAULT_PREFS;
    }
  }

  /**
   * Save notification preferences
   */
  static savePreferences(prefs: NotificationPreferences): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Error saving notification preferences:', e);
    }
  }

  /**
   * Send a local push browser notification
   */
  static sendPushNotification(
    title: string,
    options: {
      body: string;
      type?: 'CHECKLIST' | 'CASH_CLOSING' | 'SYSTEM' | 'TEST' | 'PAYABLE_HOURLY';
      icon?: string;
      tag?: string;
      url?: string;
    }
  ): boolean {
    const type = options.type || 'SYSTEM';
    
    // Save to history log
    this.addLogItem({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      body: options.body,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    });

    // 1. Dispatch custom window event for in-app floating banner & toast
    try {
      window.dispatchEvent(
        new CustomEvent('app_push_notification', {
          detail: {
            title,
            body: options.body,
            type,
            url: options.url || '/accounts-payable',
          },
        })
      );
    } catch (e) {
      console.warn('Error dispatching app_push_notification event:', e);
    }

    // 2. Try ServiceWorker push notification (most reliable on mobile & PWA)
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title,
              body: options.body,
              icon: options.icon || '/logo_azevedo.svg',
              tag: options.tag || 'grupo_azevedo_alert',
              url: options.url || '/accounts-payable',
            },
          });
        } catch (swErr) {
          console.warn('SW controller postMessage failed:', swErr);
        }
      }

      navigator.serviceWorker.ready.then((reg) => {
        try {
          reg.showNotification(title, {
            body: options.body,
            icon: options.icon || '/logo_azevedo.svg',
            badge: '/logo_azevedo.svg',
            tag: options.tag || 'grupo_azevedo_alert',
            vibrate: [200, 100, 200, 100, 200],
            data: { url: options.url || '/accounts-payable' }
          } as any);
        } catch (e) {
          console.warn('reg.showNotification failed:', e);
        }
      }).catch(() => {});
    }

    // 3. Fallback to standard window Notification constructor
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options.body,
          icon: options.icon || '/logo_azevedo.svg',
          tag: options.tag || 'grupo_azevedo_alert',
          badge: '/logo_azevedo.svg',
          requireInteraction: type !== 'TEST',
        });

        if (options.url) {
          notif.onclick = () => {
            window.focus();
            window.location.href = options.url!;
            notif.close();
          };
        }

        return true;
      } catch (err) {
        console.warn('Native notification instantiation failed:', err);
      }
    }

    return true;
  }

  /**
   * Dispatch push notification when any user completes/submits a checklist
   */
  static notifyChecklistCompleted(data: {
    storeName: string;
    templateTitle: string;
    userName: string;
    conformityIndex: number;
    plansCount: number;
  }): boolean {
    const prefs = this.getPreferences();
    if (!prefs.enabled || prefs.checklistReminder === false) return false;

    const statusEmoji = data.conformityIndex >= 80 ? '🟢' : data.conformityIndex >= 60 ? '🟡' : '🔴';
    const plansStr = data.plansCount > 0 ? ` | ⚠️ ${data.plansCount} Plano(s) de Ação` : '';

    const title = `📋 Checklist Realizado: ${data.storeName}`;
    const body = `Vistoria: ${data.templateTitle}\n• Responsável: ${data.userName}\n• Conformidade: ${statusEmoji} ${data.conformityIndex.toFixed(0)}%${plansStr}`;

    return this.sendPushNotification(title, {
      body,
      type: 'CHECKLIST',
      tag: `checklist_completed_${data.storeName}_${Date.now()}`,
      url: '/checklist',
    });
  }

  /**
   * Dispatch push notification when any user completes a cash closing
   */
  static notifyCashClosingCompleted(data: {
    storeName: string;
    userName: string;
    date: string;
    totalGeral: number;
    totalSistema: number;
    diff: number;
  }): boolean {
    const prefs = this.getPreferences();
    if (!prefs.enabled || prefs.cashClosingReminder === false) return false;

    const dateFormatted = data.date.split('-').reverse().join('/');
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const diffStr = data.diff === 0 
      ? '✅ Caixa Bateu' 
      : data.diff > 0 
        ? `🟢 Sobra: +${fmt(data.diff)}` 
        : `🔴 Falta: ${fmt(data.diff)}`;

    const title = `💰 Caixa Fechado: ${data.storeName}`;
    const body = `Operador: ${data.userName} | Data: ${dateFormatted}\n• Receita: ${fmt(data.totalGeral)}\n• Sistema: ${fmt(data.totalSistema)}\n• Balanço: ${diffStr}`;

    return this.sendPushNotification(title, {
      body,
      type: 'CASH_CLOSING',
      tag: `cash_closed_${data.storeName}_${data.date}_${Date.now()}`,
      url: '/cash-closing',
    });
  }

  /**
   * Check and trigger hourly Accounts Payable report for all store units
   */
  static async checkAccountsPayableHourlyReminder(): Promise<void> {
    const prefs = this.getPreferences();
    if (!prefs.enabled || prefs.accountsPayableHourlyReminder === false) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHourKey = `${todayStr}_H${now.getHours()}`;

    if (prefs.lastNotifiedAccountsPayableHour === currentHourKey) {
      return; // Already notified for this hour
    }

    try {
      await this.triggerAccountsPayableReport(currentHourKey);
    } catch (err) {
      console.error('Error triggering hourly accounts payable notification:', err);
    }
  }

  /**
   * Helper to fetch AP data from Firestore for all stores, calculate metrics, and dispatch notification
   */
  static async triggerAccountsPayableReport(hourKey?: string): Promise<boolean> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear().toString();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    // Get non-ROOT functional stores
    const functionalStores = STORES.filter(s => s.code !== 'ROOT');

    const storeSummaries: Array<{
      storeName: string;
      today: number;
      overdue: number;
      paid: number;
      upcoming: number;
    }> = [];

    let totalGroupToday = 0;
    let totalGroupOverdue = 0;
    let totalGroupPaid = 0;
    let totalGroupUpcoming = 0;

    for (const store of functionalStores) {
      let storeToday = 0;
      let storeOverdue = 0;
      let storePaid = 0;
      let storeUpcoming = 0;

      try {
        const docRef = doc(db, 'stores', store.id, 'accounts_payable', 'all');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const accounts = docSnap.data().data || [];
          accounts.forEach((ac: any) => {
            if (!ac) return;
            const isAcOverdue = ac.status === 'Vencido' || ((ac.status === 'Pendente' || ac.status === 'Agendado' || ac.status === 'Parcialmente Pago') && ac.dueDate < todayStr);

            // A Pagar Hoje
            if (ac.dueDate === todayStr && ac.status !== 'Pago' && ac.status !== 'Cancelado') {
              const remainingVal = ac.value - (ac.partialAmountPaid || 0);
              if (remainingVal > 0) storeToday += remainingVal;
            }

            // Total Vencido
            if (isAcOverdue && ac.status !== 'Pago' && ac.status !== 'Cancelado') {
              const remainingVal = ac.value - (ac.partialAmountPaid || 0);
              if (remainingVal > 0) storeOverdue += remainingVal;
            }

            // Pagas no Mês
            const hasDueDateInRange = ac.dueDate?.startsWith(`${currentYear}-${currentMonth}`);
            const hasPaymentDateInRange = ac.paymentDate && ac.paymentDate.includes(`${currentYear}-${currentMonth}`);
            const matchesPeriod = ac.paymentDate ? hasPaymentDateInRange : hasDueDateInRange;

            if (ac.status === 'Pago' && matchesPeriod) {
              storePaid += ac.value + (ac.fine || 0) + (ac.interest || 0) - (ac.discount || 0);
            } else if (ac.status === 'Parcialmente Pago' && matchesPeriod && ac.partialAmountPaid) {
              storePaid += ac.partialAmountPaid;
            }

            // Compromissos Futuros
            if (ac.dueDate > todayStr && ac.status !== 'Pago' && ac.status !== 'Cancelado') {
              const remainingVal = ac.value - (ac.partialAmountPaid || 0);
              if (remainingVal > 0) storeUpcoming += remainingVal;
            }
          });
        }
      } catch (e) {
        console.warn(`Error reading accounts payable for store ${store.name}:`, e);
      }

      storeSummaries.push({
        storeName: store.name,
        today: storeToday,
        overdue: storeOverdue,
        paid: storePaid,
        upcoming: storeUpcoming,
      });

      totalGroupToday += storeToday;
      totalGroupOverdue += storeOverdue;
      totalGroupPaid += storePaid;
      totalGroupUpcoming += storeUpcoming;
    }

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Build concise notification text
    const lines: string[] = [];
    storeSummaries.forEach(s => {
      lines.push(`📍 ${s.storeName}:\nHoje: ${fmt(s.today)} | Vencido: ${fmt(s.overdue)} | Pagas Mês: ${fmt(s.paid)} | Futuro: ${fmt(s.upcoming)}`);
    });

    lines.push(`💰 TOTAL GRUPO:\nHoje: ${fmt(totalGroupToday)} | Vencido: ${fmt(totalGroupOverdue)} | Pagas Mês: ${fmt(totalGroupPaid)} | Futuro: ${fmt(totalGroupUpcoming)}`);

    const title = `📊 Contas a Pagar - Relatório Horário (${now.getHours()}:00h)`;
    const body = lines.join('\n\n');

    const sent = this.sendPushNotification(title, {
      body,
      type: 'PAYABLE_HOURLY',
      tag: `payable_hourly_${hourKey || Date.now()}`,
      url: '/accounts-payable',
    });

    if (hourKey) {
      const prefs = this.getPreferences();
      prefs.lastNotifiedAccountsPayableHour = hourKey;
      this.savePreferences(prefs);
    }

    return sent;
  }

  /**
   * Send a test push notification
   */
  static async sendTestNotification(): Promise<boolean> {
    const perm = this.getPermission();
    if (perm !== 'granted') {
      const newPerm = await this.requestPermission();
      if (newPerm !== 'granted') {
        throw new Error('Permissão de notificações não concedida pelo usuário.');
      }
    }

    return this.sendPushNotification('🔔 Teste de Notificação Push', {
      body: 'As notificações locais para o Grupo Azevedo Alimentos estão ativas e funcionando perfeitamente!',
      type: 'TEST',
      tag: 'test_notification',
    });
  }

  /**
   * Get notification history log items
   */
  static getLogs(): NotificationLogItem[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading notification logs:', e);
      return [];
    }
  }

  /**
   * Add a log item to history
   */
  static addLogItem(item: NotificationLogItem): void {
    try {
      const logs = this.getLogs();
      logs.unshift(item);
      // Keep maximum 30 items
      const trimmed = logs.slice(0, 30);
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error adding notification log:', e);
    }
  }

  /**
   * Mark all logs as read
   */
  static markAllAsRead(): void {
    try {
      const logs = this.getLogs().map((l) => ({ ...l, read: true }));
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error marking notifications as read:', e);
    }
  }

  /**
   * Check and trigger daily routine reminders for pending checklist and cash closing
   */
  static checkRoutineReminders(params: {
    storeCode: string;
    storeName: string;
    isChecklistCompleteToday?: boolean;
    isCashClosedToday?: boolean;
  }): void {
    const prefs = this.getPreferences();
    if (!prefs.enabled) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // 1. Checklist completion notifications are handled in real-time when submitted via notifyChecklistCompleted()


    // 2. Cash Closing Reminder
    if (
      prefs.cashClosingReminder &&
      params.isCashClosedToday === false
    ) {
      const slot = currentHour >= 18 ? 'evening' : currentHour >= 13 ? 'afternoon' : null;
      const slotKey = `${todayStr}_${params.storeCode}_${slot}`;

      if (slot && prefs.lastNotifiedCashClosingSlot !== slotKey) {
        this.sendPushNotification(`💰 Lembrete de Fechamento de Caixa: ${params.storeName}`, {
          body: `Lembre-se de realizar o lançamento do Fechamento de Caixa do turno atual da loja ${params.storeName}.`,
          type: 'CASH_CLOSING',
          tag: `cash_closing_${slotKey}`,
          url: '/cash-closing',
        });

        prefs.lastNotifiedCashClosingSlot = slotKey;
        this.savePreferences(prefs);
      }
    }
  }
}
