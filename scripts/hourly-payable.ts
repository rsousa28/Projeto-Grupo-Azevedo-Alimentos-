// Hourly Accounts Payable push notification, run by hand (or from .github/workflows/hourly-payable.yml).
// The hourly schedule itself runs as a Firebase scheduled function (functions/src/index.ts).
//
// Required env:
//   FIREBASE_SERVICE_ACCOUNT  Service account JSON (Firebase console > Project settings > Service accounts)
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  Same keys the app uses for push subscriptions
// Optional env:
//   VAPID_SUBJECT  mailto: contact for push services
//
// Flags:
//   --dry-run  Read data and print the notification without writing to Firestore or sending push
//   --force    Send even if this hour was already notified
import fs from "fs";
import path from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { runHourlyPayable } from "../server/hourlyPayableJob";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function requireEnv(name: string): string {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function main() {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  const serviceAccount = JSON.parse(requireEnv("FIREBASE_SERVICE_ACCOUNT"));
  const app = initializeApp({ credential: cert(serviceAccount), projectId: firebaseConfig.projectId });
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  await runHourlyPayable(db, {
    dryRun,
    force,
    vapid: dryRun
      ? undefined
      : {
          publicKey: requireEnv("VAPID_PUBLIC_KEY"),
          privateKey: requireEnv("VAPID_PRIVATE_KEY"),
          subject: process.env.VAPID_SUBJECT || "mailto:rennaninacio0003@gmail.com",
        },
  });
}

main().catch((err) => {
  console.error("[Hourly AP] Failed:", err);
  process.exit(1);
});
