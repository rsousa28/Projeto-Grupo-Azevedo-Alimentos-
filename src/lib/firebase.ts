import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';
import { 
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  Firestore,
  connectFirestoreEmulator
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal connection warnings from Firestore SDK
try {
  setLogLevel('silent');
} catch (_) {}

export const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
console.log('Initializing Firestore with databaseId:', databaseId);

let messagingInstance: Messaging | null = null;
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isMessagingSupported();
    if (supported && typeof window !== 'undefined') {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn("FCM messaging initialization skipped or not supported:", err);
  }
  return null;
}

// Proactively clean stale cache keys if localStorage is near quota
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) totalBytes += (localStorage.getItem(k) || '').length;
    }
    // If localStorage usage exceeds 2MB, prune temporary doc caches and draft keys
    if (totalBytes > 2000000) {
      console.warn('[Storage Safeguard] Storage usage > 2MB. Cleaning stale doc_cache_ items...');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('doc_cache_') || k.startsWith('firestore_') || k.includes('_draft_') || k.includes('_backup_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (_) {}
}

export const db: Firestore = getFirestore(app, databaseId);

export const auth = getAuth(app);

// Local development against the Firebase emulators (npm run emulators + VITE_USE_FIREBASE_EMULATORS=true)
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.warn('[Firebase] Using local emulators (Auth :9099, Firestore :8080).');
}

// Accounts live in Firebase Authentication as email/password users. People log in with a
// username, which maps to a placeholder email on this domain (it never receives mail).
export const AUTH_EMAIL_DOMAIN = 'grupoazevedo.app';

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

// Resolves once Firebase has restored (or ruled out) a persisted login session
export const authReadyPromise = new Promise<void>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, () => {
    unsubscribe();
    resolve();
  });
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isOffline = errorMessage.includes('offline') || errorMessage.includes('connection');
  const isQuota = errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota limit exceeded') || errorMessage.includes('Quota exceeded');
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  if (isOffline || isQuota) {
    console.warn('Firestore notice (offline/quota): Path:', path, 'Details:', errorMessage);
    // don't throw for offline/quota errors to ensure smooth app fallback via local cache
    return;
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    // Try to reach Firestore
    await getDoc(doc(db, 'test', 'connection'));
    console.log("Firebase initialized.");
  } catch (error) {
    console.log("Connect attempt finished (might be permissions or offline, but SDK is initialized).");
  }
}

// Periodically check auth state or handle login redirect if needed
// Removed auth state listener and test connection to avoid restricted operation errors in preview
// as the user requested a simple hardcoded login gate.

// Calls our own /api/* routes with the logged-in person's Firebase ID token
// (the routes verify it with firebase-admin, see server/api.ts).
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  await authReadyPromise;
  const headers = new Headers(init.headers);
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
