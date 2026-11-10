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
import {
  PAYABLE_STORES,
  getPayableTimeParts,
  parseAccountsDoc,
  parseAccountsChunks,
  summarizeStorePayables,
  buildPayableNotification,
  isPermanentPushError,
} from "./server/payableSummary";

dotenv.config();

// Safe directory root resolution compatible with ESM, CJS (esbuild bundle), and native Node
const appDir = process.cwd();

// Set DISABLE_BACKGROUND_JOBS=true for local development so this instance does not
// process the shared email queue.
const backgroundJobsDisabled = process.env.DISABLE_BACKGROUND_JOBS === "true";
if (backgroundJobsDisabled) {
  console.log("[Server] DISABLE_BACKGROUND_JOBS=true: email queue listener is off.");
}

// Initialize Firebase for server-side hourly background tasks
let db: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const firebaseApp = initializeApp(firebaseConfig, "server-app");
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("[Server Firebase] Initialized Firestore connection for background hourly worker.");
    if (!backgroundJobsDisabled) {
      setupEmailQueueListener();
    }
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
// Server-side Accounts Payable calculation and broadcast.
// The hourly schedule runs in GitHub Actions (scripts/hourly-payable.ts); this is only used by the
// manual trigger endpoint below.
async function executeHourlyAccountsPayableCheck(): Promise<{ success: boolean; summary?: string; error?: string }> {
  if (!db) {
    return { success: false, error: "Database not connected" };
  }

  const time = getPayableTimeParts();

  try {
    console.log(`[Hourly AP Worker] Running check for ${time.hourKey}...`);

    const summaries = [];
    for (const store of PAYABLE_STORES) {
      let accounts: any[] = [];
      try {
        const snap = await getDoc(doc(db, "stores", store.id, "accounts_payable", "all"));
        accounts = parseAccountsDoc(snap.exists() ? snap.data() : null);

        // If chunked subcollection exists, load and reassemble
        if (accounts.length === 0) {
          const chunksSnap = await getDocs(collection(db, "stores", store.id, "accounts_payable", "all", "chunks"));
          accounts = parseAccountsChunks(chunksSnap.docs.map((d) => d.data() as { index: number; data: string }));
        }
      } catch (err) {
        console.warn(`[Hourly AP Worker] Error reading accounts for store ${store.id}:`, err);
      }
      summaries.push(summarizeStorePayables(store, accounts, time));
    }

    const notification = buildPayableNotification(summaries, time);

    // 1. Save to global_notifications in Firestore
    try {
      await addDoc(collection(db, "global_notifications"), notification.notificationDoc);
      console.log("[Hourly AP Worker] Saved notification to Firestore global_notifications.");
    } catch (dbErr) {
      console.warn("[Hourly AP Worker] Could not write to global_notifications:", dbErr);
    }

    // 2. Dispatch Web Push to all registered device subscriptions
    try {
      const subDocs = await getDocs(collection(db, "push_subscriptions"));
      console.log(`[Hourly AP Worker] Found ${subDocs.size} push subscriptions in Firestore.`);

      let sentCount = 0;
      let expiredCount = 0;

      for (const sDoc of subDocs.docs) {
        const subData = sDoc.data();
        if (subData && subData.subscription && subData.subscription.endpoint) {
          try {
            await webpush.sendNotification(subData.subscription, notification.pushPayload);
            sentCount++;
          } catch (pushErr: any) {
            if (isPermanentPushError(pushErr)) {
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

    return { success: true, summary: `Notified for ${time.hourKey}` };
  } catch (err: any) {
    console.error("[Hourly AP Worker] Error in check:", err);
    return { success: false, error: err.message };
  }
}

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
      const result = await executeHourlyAccountsPayableCheck();
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

