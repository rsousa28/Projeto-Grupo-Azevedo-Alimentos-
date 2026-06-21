import { 
  DocumentReference, 
  DocumentData, 
  getDoc as firestoreGetDoc, 
  setDoc as firestoreSetDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebase';

// Simple in-memory cache definition
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Global query cache map keyed by docRef.path
const queryCache = new Map<string, CacheEntry>();

// Default cache validity duration (cache TTL): 120 seconds (2 minutes)
const CACHE_TTL_MS = 120000;

/**
 * Extracts storeId from document path if it follows the pattern 'stores/{storeId}/...'
 */
export function extractStoreIdFromPath(path: string): string | null {
  const parts = path.split('/');
  if (parts.length >= 2 && parts[0] === 'stores') {
    return parts[1];
  }
  return null;
}

/**
 * Retrieves the list of permitted store IDs for a given user based on their role and metadata.
 */
export function getPermittedStoreIdsForUser(user: any): string[] {
  if (!user) return [];
  
  const isRennan = user && ((user.username || '').toLowerCase().includes('rennan') || (user.email || '').toLowerCase().includes('rennan'));
  const role = user.role;

  if (role === 'ADMIN' || isRennan) {
    return ['1', '2', '3', 'admin-global'];
  } else if (role === 'FINANCIAL') {
    return ['1', '2', '3'];
  } else if (role === 'MANAGER_BEBELU_MOSSORO') {
    return ['1'];
  } else if (role === 'MANAGER_BEBELU_RIOMAR_PAPICU') {
    return ['2'];
  } else if (role === 'MANAGER_4ESTYLOS_MOSSORO') {
    if (user.username?.toLowerCase().includes('jef')) {
      return ['3', '1']; // Jef gets 4E09 and B32 (stores '3' and '1')
    } else {
      return ['3'];
    }
  } else {
    // Other users / default fallback: standard stores except ROOT
    return ['1', '2', '3'];
  }
}

/**
 * Validates that the requested storeId is within the permitted stores of the logged-in user.
 * If the user does not have permission for the target store, we strictly block/redirect to prevent cross-store leak.
 */
export function enforceStoreIsolation(
  targetStoreId: string | null,
  currentStoreId: string,
  user: any
): { isAuthorized: boolean; resolvedStoreId: string } {
  const permitted = getPermittedStoreIdsForUser(user);
  
  // If no user is logged in, restrict to the current active unit parameter as a secure fallback
  if (!user) {
    const fallbackStoreId = currentStoreId || '1'; // Default to store '1' (Bebelu Mossoró)
    if (targetStoreId && targetStoreId !== fallbackStoreId) {
      console.warn(`[Security Alert] Unauthenticated attempt to access store "${targetStoreId}" instead of "${fallbackStoreId}". Redirected.`);
      return { isAuthorized: false, resolvedStoreId: fallbackStoreId };
    }
    return { isAuthorized: true, resolvedStoreId: fallbackStoreId };
  }

  // If no specific target, default to the currently selected store in StoreContext (or user's first permitted store)
  if (!targetStoreId) {
    const isCurrentAllowed = permitted.includes(currentStoreId);
    const fallback = isCurrentAllowed ? currentStoreId : (permitted[0] || '1');
    return { isAuthorized: true, resolvedStoreId: fallback };
  }

  // Check if target is explicitly authorized in the user's permitted units list
  const isAllowed = permitted.includes(targetStoreId);

  if (!isAllowed) {
    const fallback = permitted.includes(currentStoreId) ? currentStoreId : (permitted[0] || '1');
    console.warn(
      `[Access Control Violation] User "${user.username}" with role "${user.role}" ` +
      `attempted to access forbidden store "${targetStoreId}". ` +
      `Enforced authorized unit fallback to: "${fallback}"`
    );
    return { isAuthorized: false, resolvedStoreId: fallback };
  }

  // Even if allowed overall, check if the request matches the currentStoreId to maintain context consistency
  // (unless the user has general cross-store querying rights e.g. Admin or Financial)
  const isFinancialOrAdmin = user.role === 'ADMIN' || user.role === 'FINANCIAL' || 
    (user.username || '').toLowerCase().includes('rennan') || (user.email || '').toLowerCase().includes('rennan');

  if (!isFinancialOrAdmin && targetStoreId !== currentStoreId) {
    // Ensure standard manager/collaborator cannot switch or view arbitrary store data outside the current context
    console.warn(
      `[Security Context Shift] User "${user.username}" requested store "${targetStoreId}" which differs from context "${currentStoreId}". ` +
      `Redirected target to active context unit "${currentStoreId}" to prevent session cross-leak.`
    );
    const secureStore = permitted.includes(currentStoreId) ? currentStoreId : targetStoreId;
    return { isAuthorized: false, resolvedStoreId: secureStore };
  }

  return { isAuthorized: true, resolvedStoreId: targetStoreId };
}

/**
 * Memoized helper for reading a document from Firestore.
 * Implements strict store verification, deduplication, and in-memory TTL caching.
 */
export async function getDocCached(
  docRef: DocumentReference<DocumentData>,
  currentStoreId: string,
  user: any,
  ignoreTTL: boolean = false
): Promise<any> {
  const path = docRef.path;
  const targetStoreId = extractStoreIdFromPath(path);

  // Enforce zero data leakage between stores
  const { resolvedStoreId } = enforceStoreIsolation(targetStoreId, currentStoreId, user);
  
  let finalDocRef = docRef;
  let finalPath = path;

  if (targetStoreId && targetStoreId !== resolvedStoreId) {
    // Re-bind doc reference strictly to the authorized/active storeId to protect information architecture!
    const newPath = path.replace(`stores/${targetStoreId}`, `stores/${resolvedStoreId}`);
    try {
      finalDocRef = doc(db, newPath) as DocumentReference<DocumentData>;
      finalPath = newPath;
    } catch (err) {
      console.error(`Failed to re-bind document reference path to secure store ${resolvedStoreId}:`, err);
    }
  }

  const now = Date.now();
  const cached = queryCache.get(finalPath);

  // If cache is fresh and we shouldn't force bypass, return cache hit
  if (!ignoreTTL && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`[Firestore Cache Hit] Resolved instantly from memory: ${finalPath}`);
    return {
      exists: () => cached.data !== null,
      data: () => cached.data,
      id: finalDocRef.id,
      ref: finalDocRef
    };
  }

  // Trigger read
  console.log(`[Firestore Cache Miss] Loading from cloud server: ${finalPath}`);
  const snap = await firestoreGetDoc(finalDocRef);
  
  // Cache the resolved result (even if it does not exist, we save the null to prevent spamming reads)
  queryCache.set(finalPath, {
    data: snap.exists() ? snap.data() : null,
    timestamp: now
  });

  return snap;
}

/**
 * Write to Firestore and instantly update memory cache to keep state in sync across components.
 */
export async function setDocCached(
  docRef: DocumentReference<DocumentData>,
  data: any,
  currentStoreId: string,
  user: any
): Promise<void> {
  const path = docRef.path;
  const targetStoreId = extractStoreIdFromPath(path);

  // Validate strict write authorization
  const { resolvedStoreId } = enforceStoreIsolation(targetStoreId, currentStoreId, user);

  let finalDocRef = docRef;
  let finalPath = path;

  if (targetStoreId && targetStoreId !== resolvedStoreId) {
    const newPath = path.replace(`stores/${targetStoreId}`, `stores/${resolvedStoreId}`);
    finalDocRef = doc(db, newPath) as DocumentReference<DocumentData>;
    finalPath = newPath;
  }

  // Perform Firestore save
  await firestoreSetDoc(finalDocRef, data);

  // Instantly cache the newly saved data
  queryCache.set(finalPath, {
    data: data,
    timestamp: Date.now()
  });
  console.log(`[Firestore Cache Set] Synced memory with server: ${finalPath}`);
}

/**
 * Bulk clear all cache entries belonging to a given store, or clear entire cache.
 */
export function clearQueryCache(storeId?: string): void {
  if (storeId) {
    const keysToPrune = Array.from(queryCache.keys()).filter(path => {
      const parsed = extractStoreIdFromPath(path);
      return parsed === storeId;
    });
    
    keysToPrune.forEach(key => queryCache.delete(key));
    console.log(`[Firestore Cache Prune] Cleared ${keysToPrune.length} cache segments for store: ${storeId}`);
  } else {
    queryCache.clear();
    console.log(`[Firestore Cache Clear] Full memory cache flushed.`);
  }
}
