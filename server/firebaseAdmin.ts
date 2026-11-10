// firebase-admin setup shared by the API handlers (api/ on Vercel, server.ts locally).
//
// Production: FIREBASE_SERVICE_ACCOUNT holds the service account JSON.
// Local emulators: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST instead.
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Keep in sync with firebase-applet-config.json
const PROJECT_ID = "gen-lang-client-0790951913";
const DATABASE_ID = "ai-studio-7060b66b-6db6-4a04-a679-19b7ec364245";

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: PROJECT_ID });
  }
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  }
  return initializeApp({ credential: cert(JSON.parse(raw)), projectId: PROJECT_ID });
}

export function adminDb(): Firestore {
  return getFirestore(adminApp(), DATABASE_ID);
}

export function adminAuth() {
  return getAuth(adminApp());
}
