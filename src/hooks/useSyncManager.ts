import { useState, useEffect, useCallback, useRef } from 'react';
import { IndexedDBService, PendingSubmission } from '../services/IndexedDBService';
import { OfflineSyncManager } from '../services/OfflineSyncManager';
import { NotificationService } from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';

export interface UseSyncManagerReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  pendingItems: PendingSubmission[];
  lastSyncedAt: string | null;
  lastSyncedCount: number;
  syncNow: () => Promise<{ syncedCount: number; failedCount: number }>;
  refreshPendingItems: () => Promise<void>;
}

/**
 * Custom hook that monitors IndexedDB pending submissions, network connectivity,
 * and automatically triggers sync and Service Worker notifications upon online restoration.
 */
export function useSyncManager(): UseSyncManagerReturn {
  const { user } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingItems, setPendingItems] = useState<PendingSubmission[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState<number>(0);

  const userRef = useRef(user);
  userRef.current = user;

  // Refresh pending items list from IndexedDB
  const refreshPendingItems = useCallback(async () => {
    try {
      const items = await IndexedDBService.getPendingSubmissions();
      setPendingItems(items);
      setPendingCount(items.length);
    } catch (err) {
      console.warn('Erro ao ler itens pendentes do IndexedDB:', err);
    }
  }, []);

  // Helper to trigger Service Worker notification & NotificationService
  const sendSyncNotification = useCallback((syncedCount: number) => {
    if (syncedCount <= 0) return;

    const title = '⚡ Dados Sincronizados!';
    const body = `${syncedCount} checklist(s) e plano(s) salvo(s) offline foram transmitidos com sucesso para a nuvem.`;

    // 1. Log in internal notification system and attempt native browser push
    NotificationService.sendPushNotification(title, {
      body,
      type: 'CHECKLIST',
      tag: 'sync_success_notification',
      url: '/checklist',
    });

    // 2. Direct Service Worker notification integration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration && registration.showNotification) {
          try {
            registration.showNotification(title, {
              body,
              icon: '/logo_azevedo.svg',
              badge: '/logo_azevedo.svg',
              tag: 'sw_sync_success',
              data: { url: '/checklist' },
            });
          } catch (e) {
            console.warn('SW showNotification error:', e);
          }
        }
      }).catch((err) => {
        console.warn('Service worker not ready for sync notification:', err);
      });
    }
  }, []);

  // Sync execution logic
  const performSync = useCallback(async () => {
    if (!OfflineSyncManager.isOnline()) {
      return { syncedCount: 0, failedCount: 0 };
    }

    const { syncedCount, failedCount } = await OfflineSyncManager.syncAllPending(userRef.current);
    
    if (syncedCount > 0) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setLastSyncedCount(syncedCount);
      sendSyncNotification(syncedCount);
    }

    await refreshPendingItems();
    return { syncedCount, failedCount };
  }, [refreshPendingItems, sendSyncNotification]);

  // Handle Online/Offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('🔗 Conexão restabelecida! Executando sincronização IndexedDB via useSyncManager...');
      
      // Delay slightly to ensure network stack is fully awake
      setTimeout(async () => {
        await performSync();
      }, 1200);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to OfflineSyncManager state changes
    const unsubscribe = OfflineSyncManager.subscribe((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
      refreshPendingItems();
    });

    // Initial load
    refreshPendingItems();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [performSync, refreshPendingItems]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    pendingItems,
    lastSyncedAt,
    lastSyncedCount,
    syncNow: performSync,
    refreshPendingItems,
  };
}
