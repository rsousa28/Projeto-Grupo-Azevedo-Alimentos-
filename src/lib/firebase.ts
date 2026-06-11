import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache,
  doc,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
console.log('Initializing Firestore with databaseId:', databaseId);

let localCacheConfig;
try {
  localCacheConfig = persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  });
} catch (error) {
  console.warn('Persistent cache initialization failed, falling back to memoryLocalCache:', error);
  localCacheConfig = memoryLocalCache();
}

export const db = initializeFirestore(app, {
  localCache: localCacheConfig
}, databaseId);

export const auth = getAuth(app);

// Authenticate the client instance anonymously to establish secure session credentials in Firestore rules
signInAnonymously(auth)
  .then(() => {
    console.log("Firebase secure anonymous session established.");
  })
  .catch((error) => {
    console.warn("Silent authentication session fell back to unauthenticated:", error.message || error);
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
  
  if (isOffline) {
    console.warn('Firestore is offline. Path:', path, 'Details:', errorMessage);
    // don't throw for offline errors to avoid crashing the UI in preview mode
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
