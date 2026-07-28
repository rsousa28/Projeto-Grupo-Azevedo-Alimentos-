import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  description: string;
  storeCode?: string;
  storeName?: string;
  timestamp: string; // ISO format string
  userAgent: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedAuditResult {
  logs: AuditLog[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

let cachedIp: string | null = null;

// Helper to fetch client public IP without blocking main thread
async function fetchIpAddress(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data && data.ip) {
      cachedIp = data.ip;
      return data.ip;
    }
  } catch (err) {
    // Silently fall back to standard local IP or offline state description
    console.log("Unable to resolve public IP address:", err);
  }
  return "offline-or-restricted";
}

export const AuditService = {
  /**
   * Log a security or operational action to Firebase Firestore
   */
  async logAction(params: {
    userId: string;
    userName: string;
    userRole: string;
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_TIMEOUT' | 'STORE_CHANGE' | 'CHECKLIST_SUBMIT' | 'CASH_CLOSING_SAVE' | 'DRE_VIEW' | 'ACCOUNT_PAYABLE_CREATE' | 'ACCOUNT_PAYABLE_UPDATE' | 'ACCOUNT_PAYABLE_DELETE' | 'ACCOUNT_PAYABLE_SAVE' | 'TEAM_USER_CREATE' | 'TEAM_USER_DELETE' | 'TEAM_USER_UPDATE' | 'UNAUTHORIZED_ACCESS' | 'PAGE_VIEW' | 'DRE_SAVE' | 'DRE_DELETE' | 'CMV_SAVE' | 'CHECKLIST_DELETE' | 'SECURITY_BREACH_ATTEMPT' | 'SYSTEM_AUTO_BACKUP' | 'SYSTEM_MANUAL_BACKUP' | 'SYSTEM_RESTORE' | 'BACKUP_DELETE';
    description: string;
    storeCode?: string;
    storeName?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const ipAddress = await fetchIpAddress();
      const payload: AuditLog = {
        userId: params.userId || 'anonymous',
        userName: params.userName || 'unknown',
        userRole: params.userRole || 'NONE',
        action: params.action,
        description: params.description,
        storeCode: params.storeCode || 'N/A',
        storeName: params.storeName || 'N/A',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent || 'unknown',
        ipAddress,
        metadata: params.metadata || {}
      };

      if (params.action === 'PAGE_VIEW') {
        // Guardar localmente no LocalStorage do cliente para poupar a cota de gravação do Firebase (plano gratuito)
        let localLogs: AuditLog[] = [];
        try {
          const localLogsStr = localStorage.getItem('g_azevedo_local_page_views') || '[]';
          localLogs = JSON.parse(localLogsStr);
        } catch (e) {
          localLogs = [];
        }
        
        // Atribuir uma identificação única local
        payload.id = `local-pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        localLogs.push(payload);
        
        // Manter no máximo 150 visualizações recentes para não sobrecarregar o LocalStorage
        if (localLogs.length > 150) {
          localLogs.shift();
        }
        
        localStorage.setItem('g_azevedo_local_page_views', JSON.stringify(localLogs));
        return;
      }

      // Escrita real no Firestore apenas para ações críticas de auditoria/segurança
      await addDoc(collection(db, 'audit_logs'), payload);
    } catch (err) {
      console.error("Audit Logging Error: ", err);
    }
  },

  /**
   * Paginated fetch for audit logs using Firestore query cursors (startAfter)
   */
  async fetchLogsPaginated(
    pageSize: number = 50,
    lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null
  ): Promise<PaginatedAuditResult> {
    try {
      const logsRef = collection(db, 'audit_logs');
      const q = lastVisibleDoc
        ? query(logsRef, orderBy('timestamp', 'desc'), startAfter(lastVisibleDoc), limit(pageSize))
        : query(logsRef, orderBy('timestamp', 'desc'), limit(pageSize));

      const querySnapshot = await getDocs(q);
      const firestoreLogs: AuditLog[] = [];
      let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      if (!querySnapshot.empty) {
        newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        querySnapshot.forEach((doc) => {
          firestoreLogs.push({
            id: doc.id,
            ...doc.data()
          } as AuditLog);
        });
      }

      // Merge local page view logs only on first page load
      let localLogs: AuditLog[] = [];
      if (!lastVisibleDoc) {
        try {
          const localLogsStr = localStorage.getItem('g_azevedo_local_page_views') || '[]';
          localLogs = JSON.parse(localLogsStr);
        } catch (e) {
          localLogs = [];
        }
      }

      const combined = [...firestoreLogs, ...localLogs];
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        logs: combined,
        lastDoc: newLastDoc,
        hasMore: querySnapshot.docs.length === pageSize
      };
    } catch (err) {
      console.error("Failed to fetch paginated audit logs: ", err);
      return { logs: [], lastDoc: null, hasMore: false };
    }
  },

  /**
   * Legacy fetch all audit logs (up to maxCount)
   */
  async fetchLogs(maxCount: number = 300): Promise<AuditLog[]> {
    const res = await this.fetchLogsPaginated(maxCount, null);
    return res.logs;
  }
};
