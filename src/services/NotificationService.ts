export interface NotificationPreferences {
  enabled: boolean;
  cashClosingReminder: boolean;
  checklistReminder: boolean;
  cashClosingTimes: string[]; // e.g. ['14:00', '21:00']
  lastNotifiedChecklistDate?: string;
  lastNotifiedCashClosingSlot?: string;
}

export interface NotificationLogItem {
  id: string;
  title: string;
  body: string;
  type: 'CHECKLIST' | 'CASH_CLOSING' | 'SYSTEM' | 'TEST';
  timestamp: string;
  read: boolean;
}

const PREFS_KEY = 'grupo_azevedo_notification_prefs';
const LOGS_KEY = 'grupo_azevedo_notification_logs';

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  cashClosingReminder: true,
  checklistReminder: true,
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
      type?: 'CHECKLIST' | 'CASH_CLOSING' | 'SYSTEM' | 'TEST';
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

    return false;
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

    // 1. Checklist Pending Reminder
    if (
      prefs.checklistReminder &&
      params.isChecklistCompleteToday === false &&
      prefs.lastNotifiedChecklistDate !== `${todayStr}_${params.storeCode}`
    ) {
      // Trigger reminder if current time is after 11:00 AM or 18:00 PM
      if (currentHour >= 11) {
        this.sendPushNotification(`📋 Pendência de Checklist: ${params.storeName}`, {
          body: `Atenção Gerente: O checklist diário de hoje da unidade ${params.storeName} ainda não foi finalizado.`,
          type: 'CHECKLIST',
          tag: `checklist_pending_${todayStr}_${params.storeCode}`,
          url: '/checklist',
        });

        // Save preference state so we don't spam
        prefs.lastNotifiedChecklistDate = `${todayStr}_${params.storeCode}`;
        this.savePreferences(prefs);
      }
    }

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
