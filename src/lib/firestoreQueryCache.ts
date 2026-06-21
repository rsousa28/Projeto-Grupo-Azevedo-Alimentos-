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
 * Validates that the requested storeId matches the currently active store from StoreContext.
 * If there is an invalid cross-origin attempt, it enforces matching and logs a potential policy violation.
 */
export function enforceStoreIsolation(
  targetStoreId: string | null,
  currentStoreId: string,
  user: any
): { isAuthorized: boolean; resolvedStoreId: string } {
  if (!targetStoreId) {
    return { isAuthorized: true, resolvedStoreId: currentStoreId };
  }

  // Admin/Rennan users are authorized to query or consolidate multiple stores (like Consolidado 'ROOT')
  const isRennan = user && ((user.username || '').toLowerCase().includes('rennan') || (user.email || '').toLowerCase().includes('rennan'));
  const isAuthorizedToCrossQuery = user && (user.role === 'ADMIN' || isRennan);

  if (isAuthorizedToCrossQuery) {
    return { isAuthorized: true, resolvedStoreId: targetStoreId };
  }

  // If there's an active selected store in currentStoreId and it mismatches the target,
  // we strictly prevent data leakage and enforce the active unit from StoreContext.
  if (currentStoreId && currentStoreId !== 'admin-global' && targetStoreId !== currentStoreId) {
    console.warn(
      `[Security Policy Alert] Unauthorized attempt to access store "${targetStoreId}" by user "${user?.username}". ` +
      `System redirected target to active unit "${currentStoreId}" to prevent cross-store leak.`
    );
    return { isAuthorized: false, resolvedStoreId: currentStoreId };
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
