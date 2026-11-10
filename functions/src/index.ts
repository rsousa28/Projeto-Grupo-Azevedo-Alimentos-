// Firebase Cloud Functions for Azevedo ERP.
// Deploy: npx firebase deploy --only functions (see GUIA_NOTIFICACAO_AGENDADA.md)
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { STORE_TIME_ZONE } from "../../server/payableSummary";
import { runHourlyPayable } from "../../server/hourlyPayableJob";

initializeApp();
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

// Contas a Pagar summary pushed to every registered device at the top of each hour (store time).
// VAPID keys come from functions/.env, which is not committed.
export const hourlyPayableNotification = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: STORE_TIME_ZONE,
    retryCount: 2,
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
    const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
    if (!publicKey || !privateKey) {
      throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing from functions/.env");
    }
    await runHourlyPayable(db, {
      vapid: {
        publicKey,
        privateKey,
        subject: process.env.VAPID_SUBJECT || "mailto:rennaninacio0003@gmail.com",
      },
      log: (message) => logger.info(message),
    });
  }
);
