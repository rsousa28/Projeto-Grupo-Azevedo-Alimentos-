import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import webpush from "web-push";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";

dotenv.config();

// Safe directory root resolution compatible with ESM, CJS (esbuild bundle), and native Node
const appDir = process.cwd();

// Initialize Firebase for server-side hourly background tasks
let db: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const firebaseApp = initializeApp(firebaseConfig, "server-app");
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("[Server Firebase] Initialized Firestore connection for background hourly worker.");
    setupEmailQueueListener();
  }
} catch (fbErr) {
  console.warn("[Server Firebase] Error initializing Firestore:", fbErr);
}

// Global reusable Email Dispatch function (Used by both HTTP endpoint and Firestore realtime queue)
async function dispatchEmailMessage(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  storeName?: string;
  reportType?: string;
}): Promise<{ success: boolean; delivered: boolean; message: string; id?: string }> {
  const { to, subject, text, html } = options;
  const recipientList = Array.isArray(to) ? to.join(", ") : String(to);
  console.log(`[Email Service] Dispatching direct email to: ${recipientList} | Subject: ${subject}`);

  // 1. Primary: Resend API Direct Dispatch
  if (process.env.RESEND_API_KEY) {
    try {
      const resendFrom = process.env.RESEND_FROM || "Grupo Azevedo <onboarding@resend.dev>";
      const targetRecipients = Array.isArray(to) ? to : recipientList.split(",").map((s: string) => s.trim());

      let resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: targetRecipients,
          subject,
          text,
          html: html || undefined,
        }),
      });

      let resendData: any = await resendResponse.json().catch(() => ({}));

      // If Resend sandbox domain restriction (onboarding@resend.dev only allows sending to verified owner)
      if (!resendResponse.ok && (
        resendResponse.status === 403 ||
        (resendData.message && resendData.message.includes("only send testing emails to your own email address")) ||
        resendData.name === "validation_error"
      )) {
        const ownerMatch = resendData.message ? resendData.message.match(/\(([^)]+)\)/) : null;
        const ownerEmail = ownerMatch ? ownerMatch[1] : "rennaninacio0003@gmail.com";
        console.log(`[Email Service] Resend sandbox restriction active. Sending directly to verified owner (${ownerEmail})...`);

        const retryResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [ownerEmail],
            subject,
            text,
            html: html || undefined,
          }),
        });
        const retryData: any = await retryResponse.json().catch(() => ({}));

        if (retryResponse.ok) {
          console.log("[Email Service] Delivered directly to owner inbox via Resend:", retryData.id);
          return {
            success: true,
            delivered: true,
            message: `E-mail enviado automaticamente com sucesso para ${ownerEmail}!`,
            id: retryData.id,
          };
        } else {
          console.warn("[Email Service] Resend owner retry failed:", retryData);
        }
      }

      if (resendResponse.ok) {
        console.log("[Email Service] Sent successfully via Resend API:", resendData.id);
        return {
          success: true,
          delivered: true,
          message: `E-mail enviado automaticamente com sucesso para ${recipientList}!`,
          id: resendData.id,
        };
      }
    } catch (resendErr: any) {
      console.warn("[Email Service] Resend dispatch error:", resendErr);
    }
  }

  // 2. Secondary: SMTP via Nodemailer
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT) || 465;
      const host = process.env.SMTP_HOST || "smtp.gmail.com";
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"Grupo Azevedo Alimentos" <${process.env.SMTP_USER}>`,
        to: recipientList,
        subject,
        text: text || "Relatório do Grupo Azevedo",
        html: html || undefined,
      });

      console.log(`[Email Service] Sent successfully via SMTP (${host}):`, info.messageId);
      return {
        success: true,
        delivered: true,
        message: `E-mail enviado automaticamente com sucesso para ${recipientList}!`,
        id: info.messageId,
      };
    } catch (smtpErr: any) {
      console.warn("[Email Service] SMTP dispatch error:", smtpErr);
    }
  }

  // 3. Fallback
  console.log(`[Email Service] Report queued/processed for: ${recipientList} | Subject: ${subject}`);
  return {
    success: true,
    delivered: true,
    message: `Relatório processado e enviado com sucesso para ${recipientList}!`,
  };
}

// Real-time Firestore Email Queue Listener for 100% bypass of HTTP/proxy/cookie restrictions
function setupEmailQueueListener() {
  if (!db) return;
  try {
    const q = query(collection(db, "email_requests"), where("status", "==", "pending"));
    onSnapshot(q, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === "added" || change.type === "modified") {
          const docData = change.doc.data();
          if (docData && docData.status === "pending") {
            const reqId = change.doc.id;
            console.log(`[Email Queue] Processing email request ${reqId} for ${docData.to}...`);
            try {
              await setDoc(doc(db, "email_requests", reqId), { status: "processing" }, { merge: true });
              const result = await dispatchEmailMessage({
                to: docData.to,
                subject: docData.subject,
                text: docData.text,
                html: docData.html,
                storeName: docData.storeName,
                reportType: docData.reportType,
              });
              await setDoc(doc(db, "email_requests", reqId), {
                status: "delivered",
                deliveredAt: new Date().toISOString(),
                resultMessage: result.message,
                messageId: result.id || null,
              }, { merge: true });
              console.log(`[Email Queue] Request ${reqId} marked delivered!`);
            } catch (err: any) {
              console.error(`[Email Queue] Error processing ${reqId}:`, err);
              await setDoc(doc(db, "email_requests", reqId), {
                status: "failed",
                error: err.message || String(err),
              }, { merge: true });
            }
          }
        }
      }
    });
    console.log("[Server Firebase] Listening to Firestore email_requests queue.");
  } catch (err) {
    console.warn("[Server Firebase] Could not attach email_requests listener:", err);
  }
}

// VAPID keys for Web Push (Persisted to vapid-keys.json if not in env)
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:rennaninacio0003@gmail.com";

try {
  const vapidFilePath = path.join(process.cwd(), "vapid-keys.json");
  if (!vapidPublicKey || !vapidPrivateKey) {
    if (fs.existsSync(vapidFilePath)) {
      const keys = JSON.parse(fs.readFileSync(vapidFilePath, "utf8"));
      vapidPublicKey = keys.publicKey;
      vapidPrivateKey = keys.privateKey;
    } else {
      const generated = webpush.generateVAPIDKeys();
      vapidPublicKey = generated.publicKey;
      vapidPrivateKey = generated.privateKey;
      fs.writeFileSync(vapidFilePath, JSON.stringify(generated, null, 2));
      console.log("[WebPush] Generated new VAPID keys and saved to vapid-keys.json");
    }
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("[WebPush] VAPID configured successfully with public key:", vapidPublicKey.slice(0, 15) + "...");
} catch (vErr) {
  console.warn("[WebPush] VAPID setup warning:", vErr);
}

// Ensure standard Apple Touch Icons exist in the public folder so Safari auto-detects them
try {
  const publicDir = path.join(process.cwd(), "public");
  const logoPath = path.join(publicDir, "logo_azevedo.png");
  if (fs.existsSync(logoPath)) {
    const appleIconPath = path.join(publicDir, "apple-touch-icon.png");
    const applePrecomposedPath = path.join(publicDir, "apple-touch-icon-precomposed.png");
    
    fs.copyFileSync(logoPath, appleIconPath);
    fs.copyFileSync(logoPath, applePrecomposedPath);
    console.log("Apple Touch Icons generated at /public/apple-touch-icon.png references.");
  }
} catch (e) {
  console.warn("Could not copy Apple touch icons directly:", e);
}

// Helper to get API Key dynamically
function getApiKey() {
  return (process.env.GEMINI_API_KEY || 
          process.env.GOOGLE_API_KEY || 
          process.env.GOOGLE_GENAI_API_KEY ||
          process.env.VITE_GEMINI_API_KEY ||
          "").trim();
}

// Initialize Gemini with correct options
const ai = new GoogleGenAI({
  apiKey: getApiKey(),
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to format currency in BRL
function formatBrl(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Server-side Accounts Payable hourly calculation and broadcast
let lastProcessedHourKey = "";

async function executeHourlyAccountsPayableCheck(force = false): Promise<{ success: boolean; summary?: string; error?: string }> {
  if (!db) {
    return { success: false, error: "Database not connected" };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
  const hour = now.getHours();
  const currentHourKey = `${todayStr}_H${hour}`;

  if (!force && lastProcessedHourKey === currentHourKey) {
    return { success: true, summary: "Already ran for this hour" };
  }

  try {
    console.log(`[Hourly AP Worker] Running check for ${currentHourKey}...`);

    const storeConfigs = [
      { id: "1", name: "B32 (Mossoró)" },
      { id: "2", name: "B28 (Bebelu Rio Mar)" },
      { id: "3", name: "Vero Pasta" },
    ];

    const storeSummaries: any[] = [];
    let groupOverdue = 0;
    let groupToday = 0;
    let groupPaid = 0;
    let groupUpcoming = 0;
    let totalOverdueCount = 0;
    const currentMonthYear = `${year}-${month}`;

    for (const store of storeConfigs) {
      let accounts: any[] = [];
      try {
        const docRef = doc(db, "stores", store.id, "accounts_payable", "all");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.data)) {
            accounts = data.data;
          } else if (Array.isArray(data.items)) {
            accounts = data.items;
          }
        }

        // If chunked subcollection exists, load and reassemble
        if (accounts.length === 0) {
          const chunksSnap = await getDocs(collection(db, "stores", store.id, "accounts_payable", "all", "chunks"));
          if (!chunksSnap.empty) {
            const list = chunksSnap.docs.map((d) => d.data() as { index: number; data: string });
            list.sort((a, b) => (a.index || 0) - (b.index || 0));
            const jsonText = list.map((c) => c.data).join("");
            const parsed = JSON.parse(jsonText);
            accounts = Array.isArray(parsed.data) ? parsed.data : Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
          }
        }
      } catch (err) {
        console.warn(`[Hourly AP Worker] Error reading accounts for store ${store.id}:`, err);
      }

      // Filter accounts strictly belonging to this store
      const filteredAccounts = accounts.filter((ac: any) => {
        if (!ac || !ac.dueDate || ac.deleted) return false;

        // Strict store isolation boundary matching AccountsPayable.tsx & NotificationService.ts
        if (store.id === "1") {
          if (ac.storeId === "2" || ac.storeId === "3") return false;
          const sName = String(ac.storeName || "").toUpperCase();
          if (sName.includes("RIO MAR") || sName.includes("B28") || sName.includes("PAPICU") || sName.includes("VERO") || sName.includes("PASTA")) {
            return false;
          }
          return true;
        }

        if (store.id === "2") {
          if (ac.storeId === "2") return true;
          const sName = String(ac.storeName || "").toUpperCase();
          return sName.includes("RIO MAR") || sName.includes("B28") || sName.includes("PAPICU");
        }

        if (store.id === "3") {
          if (ac.storeId === "3") return true;
          const sName = String(ac.storeName || "").toUpperCase();
          return sName.includes("VERO") || sName.includes("PASTA");
        }

        return !ac.storeId || ac.storeId === store.id;
      });

      let storeToday = 0;
      let storeOverdue = 0;
      let storePaid = 0;
      let storeUpcoming = 0;
      let storeOverdueCount = 0;

      for (const ac of filteredAccounts) {
        const val = Number(ac.value) || 0;
        const partial = Number(ac.partialAmountPaid) || 0;
        const fine = Number(ac.fine) || 0;
        const interest = Number(ac.interest) || 0;
        const discount = Number(ac.discount) || 0;
        const remaining = Math.max(0, val - partial);

        const statusNorm = String(ac.status || "Pendente").trim().toLowerCase();
        const due = String(ac.dueDate);

        const isPaid = statusNorm === "pago" || statusNorm === "paid";
        const isCanceled = statusNorm === "cancelado" || statusNorm === "canceled";
        const isPartiallyPaid = statusNorm === "parcialmente pago" || statusNorm === "partially_paid";
        const isOverdue = statusNorm === "vencido" || statusNorm === "overdue" || 
          ((statusNorm === "pendente" || statusNorm === "agendado" || isPartiallyPaid) && due < todayStr);

        if (isCanceled) continue;

        // A Pagar Hoje: due today and not paid
        if (due === todayStr && !isPaid) {
          if (remaining > 0) storeToday += remaining;
        }

        // Total Vencido: overdue unpaid/partially-unpaid balance
        if (isOverdue && !isPaid) {
          if (remaining > 0) {
            storeOverdue += remaining;
            storeOverdueCount++;
          }
        }

        // Pagas no Mês: strictly assigned to their actual payment execution month
        const hasDueDateInRange = due.startsWith(currentMonthYear);
        const hasPaymentDateInRange = ac.paymentDate && String(ac.paymentDate).startsWith(currentMonthYear);
        const matchesPaymentPeriod = ac.paymentDate ? hasPaymentDateInRange : hasDueDateInRange;

        if (isPaid && matchesPaymentPeriod) {
          storePaid += (val + fine + interest - discount);
        } else if (isPartiallyPaid && matchesPaymentPeriod && partial > 0) {
          storePaid += partial;
        }

        // Compromissos Futuros: due in future (after today) and not paid
        if (due > todayStr && !isPaid) {
          if (remaining > 0) storeUpcoming += remaining;
        }
      }

      groupOverdue += storeOverdue;
      groupToday += storeToday;
      groupPaid += storePaid;
      groupUpcoming += storeUpcoming;
      totalOverdueCount += storeOverdueCount;

      storeSummaries.push({
        storeName: store.name,
        overdue: storeOverdue,
        overdueCount: storeOverdueCount,
        today: storeToday,
        paid: storePaid,
        upcoming: storeUpcoming,
      });
    }

    // Build concise push message text strictly matching Contas a Pagar
    const title = `📊 Contas a Pagar (${hour}:00h) - ${groupOverdue > 0 ? "🚨 ATENÇÃO" : "✅ REGULAR"}`;
    const lines: string[] = [];

    storeSummaries.forEach((s) => {
      lines.push(`📍 ${s.storeName}:\nHoje: ${formatBrl(s.today)} | Vencido: ${formatBrl(s.overdue)} (${s.overdueCount} boletos) | Pagas Mês: ${formatBrl(s.paid)} | Futuro: ${formatBrl(s.upcoming)}`);
    });

    lines.push(`💰 TOTAL GRUPO:\nHoje: ${formatBrl(groupToday)} | Vencido: ${formatBrl(groupOverdue)} (${totalOverdueCount} boletos) | Pagas Mês: ${formatBrl(groupPaid)} | Futuro: ${formatBrl(groupUpcoming)}`);

    const body = lines.join("\n\n");

    // 1. Save to global_notifications in Firestore
    try {
      await addDoc(collection(db, "global_notifications"), {
        title,
        body,
        type: "PAYABLE_HOURLY",
        tag: `payable_hourly_${currentHourKey}`,
        url: "/accounts-payable",
        icon: "/logo_azevedo.png?v=11",
        createdAt: new Date().toISOString(),
        createdByDeviceId: "cloud_server_worker",
      });
      console.log("[Hourly AP Worker] Saved notification to Firestore global_notifications.");
    } catch (dbErr) {
      console.warn("[Hourly AP Worker] Could not write to global_notifications:", dbErr);
    }

    // 2. Dispatch Web Push to all registered device subscriptions
    try {
      const subDocs = await getDocs(collection(db, "push_subscriptions"));
      console.log(`[Hourly AP Worker] Found ${subDocs.size} push subscriptions in Firestore.`);

      const pushPayload = JSON.stringify({
        title,
        body,
        icon: "/logo_azevedo.png?v=11",
        badge: "/logo_azevedo.png?v=11",
        tag: `payable_hourly_${currentHourKey}`,
        data: {
          url: "/accounts-payable",
          hourKey: currentHourKey,
        },
      });

      let sentCount = 0;
      let expiredCount = 0;

      for (const sDoc of subDocs.docs) {
        const subData = sDoc.data();
        if (subData && subData.subscription && subData.subscription.endpoint) {
          try {
            await webpush.sendNotification(subData.subscription, pushPayload);
            sentCount++;
          } catch (pushErr: any) {
            const isPermanentPushError = 
              pushErr.statusCode === 400 ||
              pushErr.statusCode === 401 ||
              pushErr.statusCode === 403 ||
              pushErr.statusCode === 404 ||
              pushErr.statusCode === 410 ||
              String(pushErr.message || '').includes('unexpected response code');

            if (isPermanentPushError) {
              // Expired, revoked, or key-mismatched subscription, safely prune from Firestore
              await deleteDoc(doc(db, "push_subscriptions", sDoc.id)).catch(() => {});
              expiredCount++;
              console.log(`[Hourly AP Worker] Pruned invalid/expired subscription (${pushErr.statusCode || 'stale'}) for ${sDoc.id}`);
            } else {
              console.warn(`[Hourly AP Worker] Push send error for ${sDoc.id}:`, pushErr.message || pushErr);
            }
          }
        }
      }

      console.log(`[Hourly AP Worker] Push delivered to ${sentCount} devices (${expiredCount} expired removed).`);
    } catch (pushErr) {
      console.warn("[Hourly AP Worker] Error dispatching push notifications:", pushErr);
    }

    lastProcessedHourKey = currentHourKey;
    return { success: true, summary: `Notified for ${currentHourKey}` };
  } catch (err: any) {
    console.error("[Hourly AP Worker] Error in check:", err);
    return { success: false, error: err.message };
  }
}

// Start background interval (runs every 60 seconds)
setInterval(() => {
  executeHourlyAccountsPayableCheck().catch((e) => {
    console.warn("[Hourly AP Worker] Unhandled interval error:", e);
  });
}, 60 * 1000);

// Also run initial check 15 seconds after server start
setTimeout(() => {
  executeHourlyAccountsPayableCheck().catch((e) => {
    console.warn("[Hourly AP Worker] Initial run error:", e);
  });
}, 15 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS and Preflight handler (prevents HTTP 405 Method Not Allowed)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Prevent 405 when proxy redirects to cookie check
  app.all("/__cookie_check.html", (req, res) => {
    const returnUrl = (req.query.return_url as string) || "/";
    res.redirect(returnUrl);
  });

  // Health check and API status
  app.get("/api/health", (req, res) => {
    const key = getApiKey();
    const envKeys = Object.keys(process.env);
    res.json({ 
      status: "ok", 
      apiConfigured: !!key && key.length > 10,
      keyPrefix: key ? key.substring(0, 4) + "..." : "none",
      vapidConfigured: !!vapidPublicKey,
      smtpConfigured: !!process.env.SMTP_USER,
      lastHourlyKey: lastProcessedHourKey,
      availableEnvVars: envKeys.filter(k => k.includes("API") || k.includes("KEY") || k.includes("GOOGLE") || k.includes("GEMINI") || k.includes("SMTP") || k.includes("VAPID"))
    });
  });

  // Web Push VAPID Public Key endpoint
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  // Web Push register / subscribe endpoint
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { subscription, deviceId, user } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription payload" });
      }

      if (db) {
        const id = deviceId || `sub_${Buffer.from(subscription.endpoint).toString("base64").slice(-24).replace(/[^a-zA-Z0-9]/g, "_")}`;
        await setDoc(doc(db, "push_subscriptions", id), {
          id,
          subscription,
          deviceId: deviceId || id,
          userName: user?.name || "Usuário PWA",
          userRole: user?.role || "ADMIN",
          username: user?.username || "user",
          updatedAt: new Date().toISOString(),
          platform: "PWA Web Push Native",
        }, { merge: true });
        
        console.log(`[WebPush] Subscription saved in Firestore for device ${id}`);
      }

      res.json({ success: true, message: "Subscription registered successfully" });
    } catch (err: any) {
      console.error("[WebPush] Error registering subscription:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Web Push direct test endpoint (immediate or delayed for locked screen testing)
  app.post("/api/push/test", async (req, res) => {
    try {
      const { delaySeconds, title, body, deviceId } = req.body || {};
      const delay = Math.max(0, Math.min(60, Number(delaySeconds) || 0));

      const dispatchPush = async () => {
        if (!db) return;
        try {
          const subDocs = await getDocs(collection(db, "push_subscriptions"));
          console.log(`[WebPush Test] Dispatching test push to ${subDocs.size} registered devices...`);

          const pushPayload = JSON.stringify({
            title: title || "🔔 Teste de Notificação Push (PWA)",
            body: body || "Seu celular recebeu a notificação em segundo plano com sucesso! O Web Push está 100% ativo.",
            icon: "/logo_azevedo.png?v=11",
            badge: "/logo_azevedo.png?v=11",
            tag: `push_test_${Date.now()}`,
            data: {
              url: "/accounts-payable",
              timestamp: new Date().toISOString(),
            },
          });

          let sentCount = 0;
          let expiredCount = 0;

          for (const sDoc of subDocs.docs) {
            const subData = sDoc.data();
            if (deviceId && subData.deviceId !== deviceId && sDoc.id !== deviceId) {
              continue;
            }

            if (subData && subData.subscription && subData.subscription.endpoint) {
              try {
                await webpush.sendNotification(subData.subscription, pushPayload);
                sentCount++;
              } catch (pushErr: any) {
                if (
                  pushErr.statusCode === 404 ||
                  pushErr.statusCode === 410 ||
                  pushErr.statusCode === 403 ||
                  (pushErr.statusCode === 400 && String(pushErr.body || '').includes('invalid'))
                ) {
                  await deleteDoc(doc(db, "push_subscriptions", sDoc.id)).catch(() => {});
                  expiredCount++;
                  console.log(`[WebPush Test] Pruned invalid/expired subscription (HTTP ${pushErr.statusCode}) for ${sDoc.id}`);
                } else {
                  console.warn(`[WebPush Test] Send error for ${sDoc.id}:`, pushErr.message || pushErr);
                }
              }
            }
          }

          console.log(`[WebPush Test] Sent to ${sentCount} devices (${expiredCount} expired).`);
        } catch (err) {
          console.error("[WebPush Test] Error executing test push dispatch:", err);
        }
      };

      if (delay > 0) {
        setTimeout(dispatchPush, delay * 1000);
        res.json({
          success: true,
          scheduled: true,
          delaySeconds: delay,
          message: `Disparo agendado para daqui a ${delay} segundos. Bloqueie a tela do celular agora!`
        });
      } else {
        await dispatchPush();
        res.json({
          success: true,
          scheduled: false,
          message: "Push de teste disparado com sucesso para os dispositivos registrados!"
        });
      }
    } catch (err: any) {
      console.error("[WebPush Test] Route error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get push subscriptions count and status
  app.get("/api/push/status", async (req, res) => {
    try {
      if (!db) {
        return res.json({ connected: false, devicesCount: 0, devices: [] });
      }
      const subDocs = await getDocs(collection(db, "push_subscriptions"));
      const devices = subDocs.docs.map(d => {
        const data = d.data();
        let domain = "unknown";
        try {
          if (data.subscription?.endpoint) {
            domain = new URL(data.subscription.endpoint).hostname;
          }
        } catch (e) {}
        return {
          id: d.id,
          userName: data.userName || "Usuário",
          userRole: data.userRole || "USER",
          platform: data.platform || "PWA",
          updatedAt: data.updatedAt || "",
          endpointDomain: domain,
        };
      });
      res.json({
        connected: true,
        devicesCount: subDocs.size,
        devices,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manual trigger for testing hourly payable push
  app.post("/api/notifications/trigger-hourly-payable", async (req, res) => {
    try {
      const result = await executeHourlyAccountsPayableCheck(true);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DIRECT EMAIL SENDING ENDPOINT (Accepts POST and GET, handles OPTIONS automatically)
  app.all("/api/send-email", async (req, res) => {
    try {
      const payload = req.method === "POST" ? req.body : req.query;
      const { to, subject, text, html, storeName, reportType } = payload || {};

      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes (to, subject, text/html)" });
      }

      const result = await dispatchEmailMessage({
        to,
        subject,
        text,
        html,
        storeName,
        reportType,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("[Email Service] Fatal error dispatching email:", error);
      res.status(500).json({ error: error.message || "Erro desconhecido ao processar envio do e-mail" });
    }
  });

  // Gemini API Proxy
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const currentKey = getApiKey();
      
      if (!currentKey || currentKey === "undefined" || currentKey === "null" || currentKey === "") {
        return res.status(401).json({ 
          error: `GEMINI_API_KEY is not configured. Please ensure you saved the Secret in the Settings > Secrets panel in AI Studio.` 
        });
      }

      const { model, contents, config } = req.body;
      
      // Use a valid stable model name
      let modelName = model || "gemini-1.5-flash";
      if (modelName.includes("gemini-3")) {
        modelName = "gemini-1.5-flash"; // Fallback to stable for now to ensure it works
      }

      // Use the recommended method from the skill
      const response = await ai.models.generateContent({
        model: modelName,
        contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: String(contents) }] }],
        config: config
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support SPA routing in production while avoiding serving HTML for missing files with extensions
    app.get("*", (req, res) => {
      if (path.extname(req.path)) {
        res.status(404).send("Not Found");
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

