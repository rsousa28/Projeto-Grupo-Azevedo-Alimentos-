// Hourly Accounts Payable push notification, run on a schedule by .github/workflows/hourly-payable.yml.
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
import webpush from "web-push";
import {
  PAYABLE_STORES,
  getPayableTimeParts,
  parseAccountsDoc,
  parseAccountsChunks,
  summarizeStorePayables,
  buildPayableNotification,
  isPermanentPushError,
} from "../server/payableSummary";

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

  const time = getPayableTimeParts();
  console.log(`[Hourly AP] Running check for ${time.hourKey}${dryRun ? " (dry run)" : ""}...`);

  // Claim this hour atomically so delayed, retried or overlapping runs never notify twice
  if (!dryRun) {
    const stateRef = db.collection("system_state").doc("payable_hourly");
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      if (!force && snap.exists && snap.data()?.lastHourKey === time.hourKey) {
        return false;
      }
      tx.set(stateRef, { lastHourKey: time.hourKey, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    });
    if (!claimed) {
      console.log(`[Hourly AP] Already notified for ${time.hourKey}, skipping.`);
      return;
    }
  }

  const summaries = [];
  for (const store of PAYABLE_STORES) {
    const allRef = db.collection("stores").doc(store.id).collection("accounts_payable").doc("all");
    let accounts = parseAccountsDoc((await allRef.get()).data());
    if (accounts.length === 0) {
      const chunksSnap = await allRef.collection("chunks").get();
      accounts = parseAccountsChunks(chunksSnap.docs.map((d) => d.data() as { index: number; data: string }));
    }
    summaries.push(summarizeStorePayables(store, accounts, time));
  }

  const notification = buildPayableNotification(summaries, time);
  console.log(`${notification.title}\n\n${notification.body}`);

  if (dryRun) {
    console.log("[Hourly AP] Dry run: nothing written or sent.");
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:rennaninacio0003@gmail.com",
    requireEnv("VAPID_PUBLIC_KEY"),
    requireEnv("VAPID_PRIVATE_KEY")
  );

  await db.collection("global_notifications").add(notification.notificationDoc);
  console.log("[Hourly AP] Saved notification to global_notifications.");

  const subDocs = await db.collection("push_subscriptions").get();
  let sentCount = 0;
  let expiredCount = 0;
  let failedCount = 0;

  for (const sDoc of subDocs.docs) {
    const subscription = sDoc.data()?.subscription;
    if (!subscription?.endpoint) continue;
    try {
      await webpush.sendNotification(subscription, notification.pushPayload);
      sentCount++;
    } catch (pushErr: any) {
      if (isPermanentPushError(pushErr)) {
        await sDoc.ref.delete().catch(() => {});
        expiredCount++;
        console.log(`[Hourly AP] Pruned invalid/expired subscription (${pushErr.statusCode || "stale"}) for ${sDoc.id}`);
      } else {
        failedCount++;
        console.warn(`[Hourly AP] Push send error for ${sDoc.id}:`, pushErr.message || pushErr);
      }
    }
  }

  console.log(`[Hourly AP] Push delivered to ${sentCount} of ${subDocs.size} devices (${expiredCount} expired removed, ${failedCount} failed).`);
}

main().catch((err) => {
  console.error("[Hourly AP] Failed:", err);
  process.exit(1);
});
