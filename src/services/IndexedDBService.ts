import { ChecklistSubmission, ActionPlan, ChecklistTemplate } from '../types/checklist';

const DB_NAME = 'GrupoAzevedoOfflineDB';
const DB_VERSION = 1;

export interface PendingSubmission {
  id: string; // submission.id
  storeId: string;
  submission: ChecklistSubmission;
  actionPlans: ActionPlan[];
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
  retryCount: number;
}

export class IndexedDBService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Opens or initializes IndexedDB connection with stores
   */
  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não é suportado neste navegador.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Store 1: Pending Offline Submissions
        if (!db.objectStoreNames.contains('pending_submissions')) {
          const store = db.createObjectStore('pending_submissions', { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('storeId', 'storeId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store 2: Cached Templates (for offline creation)
        if (!db.objectStoreNames.contains('cached_templates')) {
          db.createObjectStore('cached_templates', { keyPath: 'id' });
        }

        // Store 3: Offline Drafts
        if (!db.objectStoreNames.contains('offline_drafts')) {
          db.createObjectStore('offline_drafts', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // ==========================================
  // PENDING SUBMISSIONS (LOCAL-FIRST QUEUE)
  // ==========================================

  /**
   * Save a checklist submission to IndexedDB offline store
   */
  static async savePendingSubmission(
    storeId: string,
    submission: ChecklistSubmission,
    actionPlans: ActionPlan[]
  ): Promise<PendingSubmission> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending_submissions', 'readwrite');
      const store = transaction.objectStore('pending_submissions');

      const pendingItem: PendingSubmission = {
        id: submission.id,
        storeId,
        submission: {
          ...submission,
          isOfflineSaved: true,
          syncStatus: 'pending',
        },
        actionPlans,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
        retryCount: 0,
      };

      const request = store.put(pendingItem);
      request.onsuccess = () => resolve(pendingItem);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending submissions waiting to be synced
   */
  static async getPendingSubmissions(): Promise<PendingSubmission[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending_submissions', 'readonly');
      const store = transaction.objectStore('pending_submissions');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update status of a pending item (e.g. syncing, failed)
   */
  static async updatePendingStatus(
    id: string,
    syncStatus: 'pending' | 'syncing' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending_submissions', 'readwrite');
      const store = transaction.objectStore('pending_submissions');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item: PendingSubmission = getReq.result;
        if (!item) {
          resolve();
          return;
        }
        item.syncStatus = syncStatus;
        if (errorMessage) item.errorMessage = errorMessage;
        if (syncStatus === 'failed') item.retryCount = (item.retryCount || 0) + 1;

        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Remove a submission from IndexedDB once successfully synced to Firestore
   */
  static async removePendingSubmission(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pending_submissions', 'readwrite');
      const store = transaction.objectStore('pending_submissions');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==========================================
  // CACHED TEMPLATES (OFFLINE EXECUTION)
  // ==========================================

  /**
   * Cache templates locally so checklists can be executed completely offline
   */
  static async cacheTemplates(templates: ChecklistTemplate[]): Promise<void> {
    if (!templates || templates.length === 0) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cached_templates', 'readwrite');
      const store = transaction.objectStore('cached_templates');

      templates.forEach((temp) => store.put(temp));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Retrieve cached templates when offline
   */
  static async getCachedTemplates(): Promise<ChecklistTemplate[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cached_templates', 'readonly');
      const store = transaction.objectStore('cached_templates');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}
