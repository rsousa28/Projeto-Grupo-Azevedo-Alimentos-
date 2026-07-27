import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { IndexedDBService, PendingSubmission } from './IndexedDBService';
import { AuditService } from './AuditService';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';

type SyncListener = (pendingCount: number, syncing: boolean) => void;

export class OfflineSyncManager {
  private static isSyncing = false;
  private static listeners: Set<SyncListener> = new Set();

  /**
   * Register a listener for offline sync state changes
   */
  static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Initial emission
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static async notifyListeners() {
    try {
      const items = await IndexedDBService.getPendingSubmissions();
      const count = items.length;
      this.listeners.forEach((fn) => fn(count, this.isSyncing));
    } catch (e) {
      console.warn('Error reading pending submissions for sync listeners:', e);
    }
  }

  /**
   * Check whether device is currently online
   */
  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Sync all pending IndexedDB submissions to Firestore
   */
  static async syncAllPending(user?: any): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.isOnline()) {
      console.log('Dispositivo offline. Sincronização adiada.');
      return { syncedCount: 0, failedCount: 0 };
    }

    if (this.isSyncing) {
      console.log('Sincronização já em andamento...');
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingItems = await IndexedDBService.getPendingSubmissions();

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.notifyListeners();
        return { syncedCount: 0, failedCount: 0 };
      }

      console.log(`Iniciando sincronização de ${pendingItems.length} checklist(s) pendente(s)...`);

      for (const item of pendingItems) {
        try {
          await IndexedDBService.updatePendingStatus(item.id, 'syncing');

          // 1. Upload Submission Document to Firestore
          const subDocRef = doc(db, 'stores', item.storeId, 'checklist_submissions', item.id);
          const sanitizedSubmission = {
            ...item.submission,
            isOfflineSaved: false,
            syncStatus: 'synced',
            syncedAt: new Date().toISOString(),
          };

          await setDoc(subDocRef, sanitizeForFirestore(sanitizedSubmission), { merge: true });

          // 2. Upload Action Plans if present
          if (item.actionPlans && item.actionPlans.length > 0) {
            for (const plan of item.actionPlans) {
              const planRef = doc(db, 'stores', item.storeId, 'action_plans', plan.id);
              await setDoc(planRef, sanitizeForFirestore(plan), { merge: true });
            }
          }

          // 3. Remove from IndexedDB Queue
          await IndexedDBService.removePendingSubmission(item.id);

          // 4. Log Audit Event
          if (user) {
            await AuditService.logAction({
              userId: user.id || 'offline_user',
              userName: user.name || 'Operador (Sincronizado)',
              userRole: user.role || 'OPERATOR',
              action: 'CHECKLIST_SUBMIT',
              description: `[Sincronização Local-First] Checklist '${item.submission.templateTitle}' sincronizado da fila offline para a nuvem.`,
              storeCode: item.submission.storeId,
              storeName: item.submission.storeName,
            }).catch((e) => console.warn('Audit error on sync:', e));
          }

          syncedCount++;
        } catch (err: any) {
          console.error(`Falha ao sincronizar checklist ${item.id}:`, err);
          await IndexedDBService.updatePendingStatus(item.id, 'failed', err.message || 'Erro de rede ao enviar para Firestore');
          failedCount++;
        }
      }
    } catch (err) {
      console.error('Erro na fila de sincronização IndexedDB:', err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { syncedCount, failedCount };
  }

  /**
   * Initializes automatic background listeners for online restoration
   */
  static initAutoSync(userSupplier: () => any) {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('Conexão com a internet restaurada! Disparando sincronização automática IndexedDB...');
      setTimeout(() => {
        this.syncAllPending(userSupplier());
      }, 1500);
    };

    window.addEventListener('online', handleOnline);

    // Initial check on boot
    if (this.isOnline()) {
      setTimeout(() => {
        this.syncAllPending(userSupplier());
      }, 2000);
    }
  }
}
