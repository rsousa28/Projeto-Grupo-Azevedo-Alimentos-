/**
 * Utilitário de Configuração e Gerenciamento de Web Push (VAPID)
 * Sistema de Gestão Operacional e Financeira — Grupo Azevedo
 * 
 * Responsável por:
 * 1. Conversão de chaves públicas VAPID Base64URL para Uint8Array
 * 2. Obtenção da chave VAPID pública gerada pelo backend (/api/push/vapid-public-key)
 * 3. Gerenciamento do ciclo de vida das permissões de Notificação do navegador
 * 4. Registro e ativação do Service Worker (sw.js) para processamento em segundo plano
 * 5. Inscrição nativa (PushManager.subscribe) e envio da PushSubscription para o servidor
 */

export interface PushDeviceInfo {
  deviceId: string;
  userAgent: string;
  platform: string;
  language: string;
  timestamp: string;
}

export interface PushDiagnosticStatus {
  supported: boolean;
  permission: NotificationPermission;
  hasServiceWorker: boolean;
  isSubscribed: boolean;
  vapidConfigured: boolean;
  publicKeyPreview?: string;
  endpoint?: string;
}

const DEVICE_ID_KEY = 'g_azevedo_push_device_id';

/**
 * Retorna ou gera um identificador estável para o dispositivo atual
 */
export function getPushDeviceIdentifier(): string {
  if (typeof window === 'undefined') return 'server_environment';
  
  let id = localStorage.getItem(DEVICE_ID_KEY) || sessionStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      sessionStorage.setItem(DEVICE_ID_KEY, id);
    }
  }
  return id;
}

/**
 * Converte chave pública VAPID codificada em Base64 URL-safe para Uint8Array
 * exigido pelo PushManager.subscribe({ applicationServerKey })
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se o ambiente do navegador possui suporte a Service Worker e PushManager
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Obtém a permissão atual de notificação do navegador
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Solicita permissão de notificação ao usuário no navegador
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[PushConfig] Notificações não são suportadas neste navegador.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PushConfig] Permissão de notificação atualizada:', permission);
    return permission;
  } catch (err) {
    console.error('[PushConfig] Erro ao solicitar permissão de notificação:', err);
    return 'denied';
  }
}

/**
 * Registra o Service Worker principal do projeto (/sw.js)
 */
export async function registerServiceWorker(swUrl: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[PushConfig] Service Worker não é suportado neste ambiente.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    console.log('[PushConfig] Service Worker registrado com sucesso com escopo:', registration.scope);
    
    // Aguarda o Service Worker estar pronto
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('[PushConfig] Falha ao registrar o Service Worker:', err);
    return null;
  }
}

/**
 * Obtém a chave pública VAPID do backend
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-public-key', {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Servidor retornou HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.publicKey) {
      return data.publicKey;
    }
    return null;
  } catch (err) {
    console.warn('[PushConfig] Não foi possível carregar a chave pública VAPID do servidor:', err);
    return null;
  }
}

/**
 * Recupera a inscrição Push nativa ativa do navegador, se existir
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('[PushConfig] Erro ao recuperar inscrição Push existente:', err);
    return null;
  }
}

/**
 * Envia os dados da inscrição Push (PushSubscription) para o backend salvar no Firestore
 */
export async function sendPushSubscriptionToServer(
  subscription: PushSubscription,
  user?: any
): Promise<boolean> {
  try {
    const deviceId = getPushDeviceIdentifier();
    const storedUser = user || {
      name: localStorage.getItem('g_azevedo_auth_user_name') || 'Usuário PWA',
      role: localStorage.getItem('g_azevedo_auth_role') || 'ADMIN',
      username: localStorage.getItem('g_azevedo_auth_username') || 'admin',
    };

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        deviceId,
        user: storedUser,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timestamp: new Date().toISOString(),
        } as PushDeviceInfo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao registrar inscrição no servidor (HTTP ${response.status})`);
    }

    const result = await response.json();
    console.log('[PushConfig] Inscrição Push registrada no servidor com sucesso:', result);
    return true;
  } catch (err) {
    console.error('[PushConfig] Erro ao sincronizar PushSubscription com o servidor:', err);
    return false;
  }
}

/**
 * Realiza todo o fluxo de inscrição:
 * 1. Confere se Push é suportado
 * 2. Garante permissão concedida
 * 3. Registra e aguarda o Service Worker
 * 4. Obtém ou cria a assinatura Push com a chave pública VAPID
 * 5. Registra o endpoint no servidor
 */
export async function subscribeUserToPush(user?: any): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[PushConfig] Web Push não suportado neste navegador.');
    return null;
  }

  // 1. Verificar ou pedir permissão
  let permission = getNotificationPermission();
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    console.warn('[PushConfig] Permissão de notificação não foi concedida:', permission);
    return null;
  }

  // 2. Garantir Service Worker ativo
  const registration = await registerServiceWorker('/sw.js');
  if (!registration) {
    console.warn('[PushConfig] Falha ao preparar Service Worker.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    // 3. Se não houver inscrição, obter chave VAPID e inscrever
    if (!subscription) {
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error('Chave pública VAPID indisponível no servidor.');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log('[PushConfig] Nova PushSubscription gerada com sucesso via VAPID!');
    }

    // 4. Salvar no backend / Firestore
    if (subscription) {
      await sendPushSubscriptionToServer(subscription, user);
    }

    return subscription;
  } catch (err) {
    console.error('[PushConfig] Erro durante processo de inscrição VAPID:', err);
    return null;
  }
}

/**
 * Cancela a inscrição de notificações Push do dispositivo no navegador
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  try {
    const subscription = await getExistingPushSubscription();
    if (!subscription) return true;

    const successful = await subscription.unsubscribe();
    console.log('[PushConfig] Inscrição Push cancelada no navegador:', successful);
    return successful;
  } catch (err) {
    console.error('[PushConfig] Erro ao cancelar inscrição Push:', err);
    return false;
  }
}

/**
 * Retorna um relatório de diagnóstico completo do Web Push no cliente
 */
export async function getPushDiagnosticStatus(): Promise<PushDiagnosticStatus> {
  const supported = isPushSupported();
  const permission = getNotificationPermission();
  let hasServiceWorker = false;
  let isSubscribed = false;
  let publicKeyPreview: string | undefined = undefined;
  let endpoint: string | undefined = undefined;
  let vapidConfigured = false;

  if (supported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      hasServiceWorker = !!reg;

      const sub = await getExistingPushSubscription();
      if (sub) {
        isSubscribed = true;
        endpoint = sub.endpoint;
      }
    } catch {
      // Falhas silenciosas de diagnóstico
    }
  }

  try {
    const pubKey = await getVapidPublicKey();
    if (pubKey) {
      vapidConfigured = true;
      publicKeyPreview = `${pubKey.slice(0, 10)}...${pubKey.slice(-6)}`;
    }
  } catch {
    // Falhas silenciosas
  }

  return {
    supported,
    permission,
    hasServiceWorker,
    isSubscribed,
    vapidConfigured,
    publicKeyPreview,
    endpoint,
  };
}
