// Hourly Accounts Payable push job: claim the hour, summarize every store, save the notification
// and push it to every registered device. Shared by the Firebase scheduled function
// (functions/src/index.ts) and the manual script (scripts/hourly-payable.ts).
import type { Firestore } from "firebase-admin/firestore";
import webpush from "web-push";
import {
  PAYABLE_STORES,
  getPayableTimeParts,
  summarizeStorePayables,
  buildPayableNotification,
  isPermanentPushError,
} from "./payableSummary";
import { financeSubscriptions } from "./pushRecipients";
import { loadStorePayables } from "./payablesStore";

export interface HourlyPayableOptions {
  dryRun?: boolean; // read and build the message only, write and send nothing
  force?: boolean;  // send even if this hour was already notified
  vapid?: { publicKey: string; privateKey: string; subject: string };
  log?: (message: string) => void;
}

export async function runHourlyPayable(db: Firestore, options: HourlyPayableOptions = {}) {
  const { dryRun = false, force = false, log = console.log } = options;
  const time = getPayableTimeParts();
  log(`[Hourly AP] Running check for ${time.hourKey}${dryRun ? " (dry run)" : ""}...`);

  if (!dryRun && !options.vapid) {
    throw new Error("VAPID keys are required to send push notifications");
  }

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
      log(`[Hourly AP] Already notified for ${time.hourKey}, skipping.`);
      return { status: "skipped" as const, hourKey: time.hourKey };
    }
  }

  const summaries = [];
  for (const store of PAYABLE_STORES) {
    const accounts = await loadStorePayables(db, store.id);
    summaries.push(summarizeStorePayables(store, accounts, time));
  }

  const notification = buildPayableNotification(summaries, time);
  log(`${notification.title}\n\n${notification.body}`);

  if (dryRun) {
    log("[Hourly AP] Dry run: nothing written or sent.");
    return { status: "dry-run" as const, hourKey: time.hourKey, title: notification.title };
  }

  const { publicKey, privateKey, subject } = options.vapid!;
  webpush.setVapidDetails(subject, publicKey, privateKey);

  await db.collection("global_notifications").add(notification.notificationDoc);
  log("[Hourly AP] Saved notification to global_notifications.");

  // Only admin/finance devices: the report has the payables of every store
  const subDocs = await financeSubscriptions(db);
  let sent = 0;
  let expired = 0;
  let failed = 0;

  for (const sDoc of subDocs) {
    const subscription = sDoc.data()?.subscription;
    if (!subscription?.endpoint) continue;
    try {
      await webpush.sendNotification(subscription, notification.pushPayload);
      sent++;
    } catch (pushErr: any) {
      if (isPermanentPushError(pushErr)) {
        await sDoc.ref.delete().catch(() => {});
        expired++;
        log(`[Hourly AP] Pruned invalid/expired subscription (${pushErr.statusCode || "stale"}) for ${sDoc.id}`);
      } else {
        failed++;
        log(`[Hourly AP] Push send error for ${sDoc.id}: ${pushErr.message || pushErr}`);
      }
    }
  }

  log(`[Hourly AP] Push delivered to ${sent} of ${subDocs.length} devices (${expired} expired removed, ${failed} failed).`);
  return { status: "sent" as const, hourKey: time.hourKey, title: notification.title, sent, expired, failed };
}
