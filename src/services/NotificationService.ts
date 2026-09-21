import { db, getFirebaseMessaging } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { STORES } from '../contexts/StoreContext';
import { getDocCached } from '../lib/firestoreQueryCache';

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
  type: 'CHECKLIST' | 'CASH_CLOSING' | 'SYSTEM' | 'TEST' | 'PAYABLE_HOURLY' | 'FINANCIAL_ALERT';
  tag?: string;
  timestamp: string;
  read: boolean;
}

const PREFS_KEY = 'grupo_azevedo_notification_prefs';
const LOGS_KEY = 'grupo_azevedo_notification_logs';
const PROCESSED_NOTIFS_KEY = 'grupo_azevedo_processed_notif_ids';

let currentDeviceId: string | null = null;

function getDeviceId(): string {
  if (currentDeviceId) return currentDeviceId;
  let stored = sessionStorage.getItem('g_azevedo_device_id');
  if (!stored) {
    stored = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem('g_azevedo_device_id', stored);
  }
  currentDeviceId = stored;
  return currentDeviceId;
}

function isNotifProcessedLocally(notifId: string): boolean {
  try {
    const raw = localStorage.getItem(PROCESSED_NOTIFS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(notifId);
  } catch {
    return false;
  }
}

function markNotifProcessedLocally(notifId: string): void {
  try {
    const raw = localStorage.getItem(PROCESSED_NOTIFS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    list.unshift(notifId);
    const trimmed = list.slice(0, 50);
    localStorage.setItem(PROCESSED_NOTIFS_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  cashClosingReminder: true,
  checklistReminder: true,
  accountsPayableHourlyReminder: true,
  cashClosingTimes: ['14:30', '21:30'],
};

export class NotificationService {
  private static unsubscribeRealtime: (() => void) | null = null;

  /**
   * Helper to verify if current logged in user is Admin / Financial Director
   */
  static isCurrentUserAdmin(): boolean {
    try {
      const raw = localStorage.getItem('auth_user');
      if (!raw) return false;
      const user = JSON.parse(raw);
      if (!user) return false;
      const role = (user.role || '').toUpperCase();
      const username = (user.username || '').toLowerCase();
      return role === 'ADMIN' || role === 'FINANCIAL' || username === 'rennan' || username.includes('admin') || username === 'victordiretor';
    } catch {
      return false;
    }
  }

  /**
   * Initialize real-time Firestore listener for notifications across all devices
   */
  static initRealtimeListener(): () => void {
    if (this.unsubscribeRealtime) return this.unsubscribeRealtime;

    try {
      const q = query(
        collection(db, 'global_notifications'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      let isInitialLoad = true;

      const unsub = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
          isInitialLoad = false;
          snapshot.docs.forEach(docSnap => markNotifProcessedLocally(docSnap.id));
          return;
        }

        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const notifId = change.doc.id;

            if (data && data.createdByDeviceId !== getDeviceId() && !isNotifProcessedLocally(notifId)) {
              markNotifProcessedLocally(notifId);

              // Restrict Accounts Payable notifications strictly to Admin logins
              const isPayableNotif = data.type === 'PAYABLE_HOURLY' || 
                                     (data.title && data.title.includes('Contas a Pagar')) || 
                                     (data.tag && data.tag.includes('payable'));

              if (isPayableNotif && !this.isCurrentUserAdmin()) {
                return; // Skip notification delivery for non-admin users
              }
              
              // Trigger local push notification & in-app floating banner for remote update
              this.sendPushNotification(data.title || '🔔 Notificação Grupo Azevedo', {
                body: data.body || '',
                type: data.type || 'SYSTEM',
                tag: data.tag || 'remote_notif',
                url: data.url || '/accounts-payable',
                icon: data.icon || '/logo_azevedo.png?v=10',
                skipFirestoreSync: true, // Prevent infinite loop back to Firestore
              });
            }
          }
        });
      }, (err) => {
        console.warn("Erro ao escutar notificações em tempo real:", err);
      });

      this.unsubscribeRealtime = unsub;
      
      // Also initialize Firebase Cloud Messaging (FCM) push token & foreground listener
      this.initFCMToken().catch(err => console.warn('FCM registration error:', err));

      return unsub;
    } catch (err) {
      console.warn("Falha ao inicializar listener de notificações em tempo real:", err);
      return () => {};
    }
  }

  private static fcmInitialized = false;

  /**
   * Register Firebase Cloud Messaging (FCM) Service Worker and obtain device registration token,
   * associating current authenticated user details in Firestore.
   */
  static async initFCMToken(currentUser?: { id?: string; name?: string; username?: string; role?: string } | null): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    if (Notification.permission !== 'granted') return null;

    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.log('Firebase Messaging is not supported or disabled in this browser.');
        return null;
      }

      // Register Service Worker for FCM PWA Background Push Notifications
      let registration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
        } catch (swErr) {
          console.warn('Could not register /sw.js, falling back to active service worker:', swErr);
          registration = await navigator.serviceWorker.ready;
        }
      }

      // VAPID key if provided in env
      const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || undefined;

      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey,
      }).catch(err => {
        console.warn('FCM getToken request did not complete (VAPID key required or permission pending):', err.message || err);
        return null;
      });

      if (token) {
        console.log('FCM Token successfully acquired:', token);
        localStorage.setItem('g_azevedo_fcm_token', token);

        // Retrieve user info from param or fallback to localStorage
        let userToLink = currentUser;
        if (!userToLink) {
          try {
            const rawUser = localStorage.getItem('auth_user');
            if (rawUser) userToLink = JSON.parse(rawUser);
          } catch (e) {}
        }

        // Store / update token document in Firestore fcm_tokens collection
        try {
          await setDoc(doc(db, 'fcm_tokens', getDeviceId()), {
            token,
            updatedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            deviceId: getDeviceId(),
            userId: userToLink?.id || 'anonymous',
            userName: userToLink?.name || 'Usuário PWA',
            username: userToLink?.username || 'user',
            userRole: userToLink?.role || (this.isCurrentUserAdmin() ? 'ADMIN' : 'USER'),
            platform: 'PWA Web Push FCM',
            notificationsEnabled: true,
            userAgent: navigator.userAgent
          }, { merge: true });
        } catch (dbErr) {
          console.warn('Could not store FCM token in Firestore:', dbErr);
        }
      }

      // Attach foreground FCM listener once
      if (!this.fcmInitialized && messaging) {
        this.fcmInitialized = true;
        onMessage(messaging, (payload) => {
          console.log('[Foreground FCM Notification]', payload);
          const title = payload.notification?.title || payload.data?.title || '🔔 Grupo Azevedo';
          const body = payload.notification?.body || payload.data?.body || '';
          
          this.sendPushNotification(title, {
            body,
            type: (payload.data?.type as any) || 'FINANCIAL_ALERT',
            tag: payload.data?.tag || 'fcm_fg',
            url: payload.data?.url || '/accounts-payable',
            skipFirestoreSync: true
          });
        });
      }

      return token;
    } catch (err: any) {
      console.warn('FCM Initialization error:', err);
      return null;
    }
  }

  /**
   * Mark FCM user session as logged out / guest in Firestore fcm_tokens
   */
  static async unregisterFCMUser(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      await setDoc(doc(db, 'fcm_tokens', getDeviceId()), {
        userId: 'guest',
        userName: 'Desconectado',
        userRole: 'NONE',
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Error unregistering FCM user:', e);
    }
  }

  /**
   * Get cached FCM token
   */
  static getFCMToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('g_azevedo_fcm_token');
  }

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
   * Helper to convert Base64 URL safe string to Uint8Array for VAPID key
   */
  static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Register Native Web Push Subscription with server for reliable background mobile dispatch
   */
  static async registerWebPushSubscription(user?: any): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
      }

      if (Notification.permission !== 'granted') {
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        // Fetch VAPID public key from backend
        const res = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.publicKey) return false;

        const applicationServerKey = this.urlBase64ToUint8Array(data.publicKey);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      if (subscription) {
        const deviceId = getDeviceId();
        const storedUser = user || {
          name: localStorage.getItem('g_azevedo_auth_user_name') || 'Administrador',
          role: localStorage.getItem('g_azevedo_auth_role') || 'ADMIN',
          username: localStorage.getItem('g_azevedo_auth_username') || 'admin',
        };

        await fetch('/api/push/subscribe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            deviceId,
            user: storedUser,
          }),
        });

        console.log('[NotificationService] Web Push subscription successfully registered with server!');
        return true;
      }
    } catch (err) {
      console.warn('[NotificationService] Web Push subscription registration error:', err);
    }
    return false;
  }

  /**
   * Request push notification permission from the browser
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notificações de navegador não são suportadas neste dispositivo.');
    }

    // Register service worker for mobile PWA push notifications
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (swErr) {
        console.warn('Error registering service worker during permission request:', swErr);
      }
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Save enabled state
      const prefs = this.getPreferences();
      prefs.enabled = true;
      this.savePreferences(prefs);

      // Register FCM Token
      this.initFCMToken().catch(err => console.warn('Error obtaining FCM token after permission granted:', err));

      // Register Web Push subscription for background delivery
      this.registerWebPushSubscription().catch(err => console.warn('Error obtaining Web Push subscription:', err));
    }
    return permission;
  }

  /**
   * Synthesize audio chime for mobile and browser notifications
   */
  static playNotificationSound(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Ignore autoplay audio restriction error if user hasn't interacted yet
    }
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
   * Dispatch push notification for Financial Alerts (overdue bills, high value payments, due today)
   */
  static notifyFinancialAlert(data: {
    title: string;
    body: string;
    type?: 'FINANCIAL_ALERT' | 'PAYABLE_HOURLY';
    tag?: string;
    url?: string;
  }): boolean {
    const prefs = this.getPreferences();
    if (!prefs.enabled) return false;

    return this.sendPushNotification(data.title, {
      body: data.body,
      type: data.type || 'FINANCIAL_ALERT',
      tag: data.tag || `financial_alert_${Date.now()}`,
      url: data.url || '/accounts-payable',
    });
  }

  /**
   * Send a local push browser notification & broadcast to Firestore for cross-device delivery
   */
  static sendPushNotification(
    title: string,
    options: {
      body: string;
      type?: 'CHECKLIST' | 'CASH_CLOSING' | 'SYSTEM' | 'TEST' | 'PAYABLE_HOURLY' | 'FINANCIAL_ALERT';
      icon?: string;
      tag?: string;
      url?: string;
      skipFirestoreSync?: boolean;
    }
  ): boolean {
    const type = options.type || 'SYSTEM';

    // Restrict Accounts Payable notifications strictly to Admin logins
    const isPayableNotif = type === 'PAYABLE_HOURLY' || 
                           title.includes('Contas a Pagar') || 
                           (options.tag && options.tag.includes('payable'));

    if (isPayableNotif && !this.isCurrentUserAdmin()) {
      return false;
    }

    // 1. Broadcast to Firestore for real-time delivery to mobile phones and other devices
    if (!options.skipFirestoreSync) {
      try {
        const notifDocRef = doc(collection(db, 'global_notifications'));
        setDoc(notifDocRef, {
          id: notifDocRef.id,
          title,
          body: options.body,
          type,
          tag: options.tag || 'grupo_azevedo_alert',
          url: options.url || '/accounts-payable',
          icon: options.icon || '/logo_azevedo.png?v=10',
          createdAt: new Date().toISOString(),
          createdByDeviceId: getDeviceId(),
        }).catch(err => console.warn('Error broadcasting notification to Firestore:', err));

        markNotifProcessedLocally(notifDocRef.id);
      } catch (e) {
        console.warn("Firestore notification broadcast failed:", e);
      }
    }
    
    // 2. Save to local history log
    this.addLogItem({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      body: options.body,
      type,
      tag: options.tag || 'grupo_azevedo_alert',
      timestamp: new Date().toISOString(),
      read: false,
    });

    // 3. Play audio chime and vibrate mobile device
    this.playNotificationSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {}
    }

    // 4. Dispatch custom window event for in-app floating banner & toast
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

    // 5. Try ServiceWorker push notification (most reliable on mobile & PWA)
    const hasPermission = typeof Notification !== 'undefined' && Notification.permission === 'granted';

    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller && hasPermission) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title,
              body: options.body,
              icon: options.icon || '/logo_azevedo.png?v=10',
              tag: options.tag || 'grupo_azevedo_alert',
              url: options.url || '/accounts-payable',
            },
          });
        } catch (swErr) {
          console.warn('SW controller postMessage failed:', swErr);
        }
      }

      navigator.serviceWorker.ready.then((reg) => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          reg.showNotification(title, {
            body: options.body,
            icon: options.icon || '/logo_azevedo.png?v=10',
            badge: '/logo_azevedo.png?v=10',
            tag: options.tag || 'grupo_azevedo_alert',
            vibrate: [200, 100, 200, 100, 200],
            data: { url: options.url || '/accounts-payable' }
          } as any).catch((e) => {
            console.warn('reg.showNotification promise rejected:', e);
          });
        }
      }).catch(() => {});
    }

    // 6. Fallback to standard window Notification constructor if supported (non-iOS)
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options.body,
          icon: options.icon || '/logo_azevedo.png?v=10',
          tag: options.tag || 'grupo_azevedo_alert',
          badge: '/logo_azevedo.png?v=10',
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
        // Ignored on iOS where new Notification() is disallowed in window scope
        console.log('Window Notification constructor not supported or restricted on this device.');
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

    const dateFormatted = data.date.includes('-') 
      ? data.date.split('-').reverse().join('/') 
      : data.date;
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
   * Dispatch real-time push notification when any user creates, updates, pays, or deletes an Account Payable
   */
  static notifyAccountsPayableChanged(data: {
    action: 'CREATED' | 'UPDATED' | 'PAID' | 'DELETED';
    supplier: string;
    value: number;
    storeName: string;
    userName?: string;
  }): boolean {
    const prefs = this.getPreferences();
    if (!prefs.enabled) return false;

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const actionMap = {
      CREATED: '📝 Nova Conta Cadastrada',
      UPDATED: '✏️ Conta Atualizada',
      PAID: '✅ Pagamento Confirmado',
      DELETED: '🗑️ Conta Removida'
    };

    const actionText = actionMap[data.action] || 'Alteração em Contas a Pagar';
    const title = `💳 ${actionText}: ${data.storeName}`;
    const body = `Fornecedor: ${data.supplier}\n• Valor: ${fmt(data.value)}\n• Responsável: ${data.userName || 'Usuário'}\n• Loja: ${data.storeName}`;

    const sent = this.sendPushNotification(title, {
      body,
      type: 'PAYABLE_HOURLY',
      tag: `payable_change_${Date.now()}`,
      url: '/accounts-payable',
    });

    return sent;
  }

  /**
   * Check and trigger hourly Accounts Payable report for all store units
   */
  static async checkAccountsPayableHourlyReminder(): Promise<void> {
    if (!this.isCurrentUserAdmin()) return;
    const prefs = this.getPreferences();
    if (!prefs.enabled || prefs.accountsPayableHourlyReminder === false) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
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
   * Helper to fetch AP data from Firestore and cache for each store with strict store isolation,
   * calculate exact metrics matching AccountsPayable.tsx, and dispatch notification
   */
  static async triggerAccountsPayableReport(hourKey?: string): Promise<boolean> {
    if (!this.isCurrentUserAdmin()) return false;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const currentYear = String(year);
    const currentMonth = month;

    // Prepare admin user context for cache authorization
    let adminUser: any = { role: 'ADMIN', username: 'admin' };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawUser = localStorage.getItem('auth_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed) adminUser = parsed;
        }
      } catch (e) {}
    }

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

    // Process each functional store in complete isolation (Store 1, Store 2, Store 3)
    for (const store of functionalStores) {
      let storeItems: any[] = [];
      const storeId = store.id;

      // 1. Try reading from Firestore for this specific store (authoritative source)
      try {
        const docRef = doc(db, 'stores', storeId, 'accounts_payable', 'all');

        // A. Try cached read
        try {
          const docSnap = await getDocCached(docRef, storeId, adminUser);
          if (docSnap && docSnap.exists()) {
            const d = docSnap.data();
            if (Array.isArray(d?.data)) {
              storeItems = d.data;
            } else if (Array.isArray(d)) {
              storeItems = d;
            }
          }
        } catch (cachedErr) {
          console.warn(`[NotificationService] getDocCached failed for store ${storeId}:`, cachedErr);
        }

        // B. If still empty, read directly from Firestore with explicit chunk reassembly
        if (storeItems.length === 0) {
          const directSnap = await getDoc(docRef);
          if (directSnap.exists()) {
            let rawData = directSnap.data();
            if (rawData?._isChunked) {
              try {
                const chunksSnap = await getDocs(collection(db, `${docRef.path}/chunks`));
                const chunksList = chunksSnap.docs.map(d => d.data() as { index: number; data: string });
                chunksList.sort((a, b) => a.index - b.index);
                const reassembled = chunksList.map(c => c.data).join('');
                rawData = JSON.parse(reassembled);
              } catch (chunkErr) {
                console.warn(`[NotificationService] Error reassembling chunks for ${docRef.path}:`, chunkErr);
              }
            }
            if (Array.isArray(rawData?.data)) {
              storeItems = rawData.data;
            } else if (Array.isArray(rawData)) {
              storeItems = rawData;
            }
          }
        }
      } catch (storeErr) {
        console.warn(`[NotificationService] Error reading cloud accounts for store ${storeId}:`, storeErr);
      }

      // 2. Fallback to localStorage for this specific store if Firestore failed or was offline
      if (storeItems.length === 0 && typeof window !== 'undefined' && window.localStorage) {
        try {
          const localRaw = localStorage.getItem(`g_azevedo_ap_items_clean_${storeId}`);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              storeItems = parsed;
            }
          }
        } catch (e) {}

        if (storeItems.length === 0) {
          try {
            const queryCacheRaw = localStorage.getItem(`doc_cache_stores/${storeId}/accounts_payable/all`);
            if (queryCacheRaw) {
              const parsed = JSON.parse(queryCacheRaw);
              const list = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : [];
              if (list.length > 0) storeItems = list;
            }
          } catch (e) {}
        }
      }

      // 3. Strict Store Boundary Validation
      // Ensure only accounts legitimately belonging to this store are evaluated
      const cleanStoreAccounts = storeItems.filter((ac: any) => {
        if (!ac || !ac.id) return false;
        
        // Strict boundary check
        if (storeId === '1') {
          // Store 1 (Mossoró) must NEVER include accounts tagged for Store 2 or Store 3
          if (ac.storeId === '2' || ac.storeId === '3') return false;
          const sName = (ac.storeName || '').toUpperCase();
          if (sName.includes('RIO MAR') || sName.includes('B28') || sName.includes('PAPICU') || sName.includes('VERO') || sName.includes('PASTA')) {
            return false;
          }
          return true;
        }

        if (storeId === '2') {
          // Store 2 (Bebelu Rio Mar)
          if (ac.storeId === '2') return true;
          const sName = (ac.storeName || '').toUpperCase();
          return sName.includes('RIO MAR') || sName.includes('B28') || sName.includes('PAPICU');
        }

        if (storeId === '3') {
          // Store 3 (Vero Pasta)
          if (ac.storeId === '3') return true;
          const sName = (ac.storeName || '').toUpperCase();
          return sName.includes('VERO') || sName.includes('PASTA');
        }

        return ac.storeId === storeId;
      });

      // Update localStorage with clean sanitized list for this store
      if (typeof window !== 'undefined' && window.localStorage && cleanStoreAccounts.length > 0) {
        try {
          localStorage.setItem(`g_azevedo_ap_items_clean_${storeId}`, JSON.stringify(cleanStoreAccounts));
        } catch (e) {}
      }

      // 4. Calculate exact metrics matching AccountsPayable.tsx lines 2138-2188
      let storeToday = 0;
      let storeOverdue = 0;
      let storePaid = 0;
      let storeUpcoming = 0;

      cleanStoreAccounts.forEach((ac: any) => {
        const isAcOverdue = ac.status === 'Vencido' || ((ac.status === 'Pendente' || ac.status === 'Agendado' || ac.status === 'Parcialmente Pago') && ac.dueDate < todayStr);

        // A Pagar Hoje: due today and not paid/canceled
        if (ac.dueDate === todayStr && ac.status !== 'Pago' && ac.status !== 'Cancelado') {
          const remainingVal = Number(ac.value || 0) - Number(ac.partialAmountPaid || 0);
          if (remainingVal > 0) storeToday += remainingVal;
        }

        // Total Vencido: overdue unpaid/partially-unpaid balance as of today
        if (isAcOverdue && ac.status !== 'Pago' && ac.status !== 'Cancelado') {
          const remainingVal = Number(ac.value || 0) - Number(ac.partialAmountPaid || 0);
          if (remainingVal > 0) storeOverdue += remainingVal;
        }

        // Pagas no Mês: strictly assigned to their actual payment execution month (with fallback to due date if no paymentDate exists)
        const hasDueDateInRange = ac.dueDate?.startsWith(`${currentYear}-${currentMonth}`);
        const hasPaymentDateInRange = ac.paymentDate && (
          ac.paymentDate.startsWith(`${currentYear}-${currentMonth}`) ||
          ac.paymentDate.includes(`${currentYear}-${currentMonth}`)
        );
        const matchesPaymentPeriod = ac.paymentDate ? hasPaymentDateInRange : hasDueDateInRange;

        if (ac.status === 'Pago' && matchesPaymentPeriod) {
          storePaid += Number(ac.value || 0) + Number(ac.fine || 0) + Number(ac.interest || 0) - Number(ac.discount || 0);
        } else if (ac.status === 'Parcialmente Pago' && matchesPaymentPeriod && ac.partialAmountPaid) {
          storePaid += Number(ac.partialAmountPaid || 0);
        }

        // Compromissos Futuros: due in the future (after today) and not paid/canceled
        if (ac.dueDate > todayStr && ac.status !== 'Pago' && ac.status !== 'Cancelado') {
          const remainingVal = Number(ac.value || 0) - Number(ac.partialAmountPaid || 0);
          if (remainingVal > 0) storeUpcoming += remainingVal;
        }
      });

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

    // Also ping server background worker to broadcast real Web Push to subscribed devices
    try {
      fetch('/api/notifications/trigger-hourly-payable', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch (e) {}

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
      const list: NotificationLogItem[] = data ? JSON.parse(data) : [];
      if (!this.isCurrentUserAdmin()) {
        return list.filter(item => 
          item.type !== 'PAYABLE_HOURLY' && 
          !item.title.includes('Contas a Pagar') &&
          !(item.tag && item.tag.includes('payable'))
        );
      }
      return list;
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
