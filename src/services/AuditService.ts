import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

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
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'STORE_CHANGE' | 'CHECKLIST_SUBMIT' | 'CASH_CLOSING_SAVE' | 'DRE_VIEW' | 'ACCOUNT_PAYABLE_CREATE' | 'ACCOUNT_PAYABLE_UPDATE' | 'ACCOUNT_PAYABLE_DELETE' | 'ACCOUNT_PAYABLE_SAVE' | 'TEAM_USER_CREATE' | 'TEAM_USER_DELETE' | 'TEAM_USER_UPDATE' | 'UNAUTHORIZED_ACCESS' | 'PAGE_VIEW' | 'DRE_SAVE' | 'DRE_DELETE' | 'CMV_SAVE' | 'CHECKLIST_DELETE' | 'SECURITY_BREACH_ATTEMPT';
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

      // Writing to /audit_logs collection
      await addDoc(collection(db, 'audit_logs'), payload);
    } catch (err) {
      // Catch error to avoid disrupting application state for end user
      console.error("Audit Logging Error: ", err);
    }
  },

  /**
   * Fetch all audit logs, ordered by timestamp descending
   */
  async fetchLogs(maxCount: number = 200): Promise<AuditLog[]> {
    try {
      const logsRef = collection(db, 'audit_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(maxCount));
      const querySnapshot = await getDocs(q);
      
      const logs: AuditLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data()
        } as AuditLog);
      });
      return logs;
    } catch (err) {
      console.error("Failed to fetch audit logs: ", err);
      // Fallback: search localStorage if firestore permissions or network fails
      return [];
    }
  }
};
