// HTTP API handlers shared by the Vercel functions in api/ and the local Express server (server.ts).
// Handlers are framework-agnostic: they take a plain request and return a status and JSON body.
//
// Every route except /api/health needs "Authorization: Bearer <Firebase ID token>" from a
// person who has a profile at users/{uid}.
//
// Env: FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (optional),
// GEMINI_API_KEY, RESEND_API_KEY / RESEND_FROM or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
import webpush from "web-push";
import { GoogleGenAI } from "@google/genai";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { dispatchEmailMessage } from "./email.js";
import {
  PAYABLE_STORES,
  getPayableTimeParts,
  parseAccountsDoc,
  parseAccountsChunks,
  summarizeStorePayables,
  buildPayableNotification,
  isPermanentPushError,
} from "./payableSummary.js";
import { financeSubscriptions } from "./pushRecipients.js";

export interface ApiRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

export interface ApiResult {
  status: number;
  body: unknown;
  // Work that must finish after the response is sent (delayed push test)
  background?: Promise<unknown>;
}

export type ApiHandler = (req: ApiRequest) => Promise<ApiResult>;

interface Caller {
  uid: string;
  name: string;
  username: string;
  role: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Daily per-person limits for paid services (AI tokens, outgoing email). Counters live in
// api_usage, which clients can't read or write (catch-all deny in firestore.rules).
async function consumeDailyQuota(kind: "ai" | "email", caller: Caller, limit: number): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const ref = adminDb().collection("api_usage").doc(`${kind}_${caller.uid}_${day}`);
  const used = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.get("count")) || 0 : 0) + 1;
    if (next <= limit) {
      tx.set(ref, { kind, uid: caller.uid, day, count: next, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return next;
  });
  if (used > limit) {
    throw new HttpError(429, `Limite diário de ${limit} ${kind === "ai" ? "consultas à IA" : "e-mails"} atingido. Tente de novo amanhã.`);
  }
}

async function authenticate(req: ApiRequest): Promise<Caller> {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new HttpError(401, "Login necessário");
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(match[1]);
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada. Faça login novamente.");
  }
  // Same requirement as isSignedIn() in firestore.rules
  if (decoded.firebase?.sign_in_provider !== "password") {
    throw new HttpError(403, "Tipo de login não permitido");
  }

  const profile = await adminDb().collection("users").doc(decoded.uid).get();
  if (!profile.exists) {
    throw new HttpError(403, "Usuário sem perfil cadastrado");
  }
  const data = profile.data() || {};
  return {
    uid: decoded.uid,
    name: String(data.name || ""),
    username: String(data.username || ""),
    role: String(data.role || ""),
  };
}

// Wraps a handler with method check, authentication and error handling
function route(
  options: { methods: string[]; access: "public" | "profile" | "admin" },
  fn: (req: ApiRequest, caller: Caller | null) => Promise<ApiResult>
): ApiHandler {
  return async (req) => {
    if (!options.methods.includes(req.method)) {
      return { status: 405, body: { error: "Method Not Allowed" } };
    }
    try {
      let caller: Caller | null = null;
      if (options.access !== "public") {
        caller = await authenticate(req);
        if (options.access === "admin" && caller.role !== "ADMIN") {
          throw new HttpError(403, "Apenas administradores podem fazer isso");
        }
      }
      return await fn(req, caller);
    } catch (err: any) {
      if (err instanceof HttpError) {
        return { status: err.status, body: { error: err.message } };
      }
      console.error("[API] Unhandled error:", err);
      return { status: 500, body: { error: "Erro interno no servidor. Tente de novo em instantes." } };
    }
  };
}

// VAPID keys come from env only, and must match the keys used by scripts/hourly-payable.ts
function vapidPublicKey(): string {
  return (process.env.VAPID_PUBLIC_KEY || "").trim();
}

function configureWebPush() {
  const publicKey = vapidPublicKey();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!publicKey || !privateKey) {
    throw new HttpError(503, "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas no servidor");
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:rennaninacio0003@gmail.com", publicKey, privateKey);
}

function geminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "").trim();
}

// Sends one payload to each subscription doc, pruning subscriptions the push service rejected for good
async function sendPushToDocs(
  docs: QueryDocumentSnapshot[],
  payload: string,
  logPrefix: string
): Promise<{ sent: number; expired: number; failed: number }> {
  let sent = 0;
  let expired = 0;
  let failed = 0;
  for (const sDoc of docs) {
    const subscription = sDoc.data()?.subscription;
    if (!subscription?.endpoint) continue;
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (pushErr: any) {
      if (isPermanentPushError(pushErr)) {
        await sDoc.ref.delete().catch(() => {});
        expired++;
        console.log(`${logPrefix} Pruned invalid/expired subscription (${pushErr.statusCode || "stale"}) for ${sDoc.id}`);
      } else {
        failed++;
        console.warn(`${logPrefix} Push send error for ${sDoc.id}:`, pushErr.message || pushErr);
      }
    }
  }
  console.log(`${logPrefix} Push delivered to ${sent} of ${docs.length} devices (${expired} expired removed, ${failed} failed).`);
  return { sent, expired, failed };
}

export const health = route({ methods: ["GET"], access: "public" }, async () => ({
  status: 200,
  body: {
    status: "ok",
    apiConfigured: geminiApiKey().length > 10,
    vapidConfigured: !!vapidPublicKey() && !!process.env.VAPID_PRIVATE_KEY,
    smtpConfigured: !!process.env.SMTP_USER || !!process.env.RESEND_API_KEY,
    firebaseConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT || !!process.env.FIRESTORE_EMULATOR_HOST,
  },
}));

export const pushVapidPublicKey = route({ methods: ["GET"], access: "profile" }, async () => {
  const publicKey = vapidPublicKey();
  if (!publicKey) {
    return { status: 503, body: { error: "VAPID_PUBLIC_KEY não configurada no servidor" } };
  }
  return { status: 200, body: { publicKey } };
});

export const pushSubscribe = route({ methods: ["POST"], access: "profile" }, async (req, caller) => {
  const { subscription, deviceId } = req.body || {};
  if (!subscription?.endpoint) {
    return { status: 400, body: { error: "Invalid subscription payload" } };
  }
  const device =
    typeof deviceId === "string" && /^[a-zA-Z0-9_\-]{1,96}$/.test(deviceId)
      ? deviceId
      : `sub_${Buffer.from(subscription.endpoint).toString("base64").slice(-24).replace(/[^a-zA-Z0-9]/g, "_")}`;
  // One document per device and person (same scheme as src/utils/pushConfig.ts and firestore.rules)
  const id = `${device}_${caller!.uid}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Name and role come from the verified profile, not from the request body
  await adminDb().collection("push_subscriptions").doc(id).set({
    id,
    subscription,
    deviceId: device,
    uid: caller!.uid,
    userName: caller!.name || "Usuário PWA",
    userRole: caller!.role,
    username: caller!.username,
    updatedAt: new Date().toISOString(),
    platform: "PWA Web Push Native",
  }, { merge: true });
  console.log(`[WebPush] Subscription saved for device ${id} (${caller!.username})`);

  return { status: 200, body: { success: true, message: "Subscription registered successfully" } };
});

// Admins may broadcast to every device; everyone else may only test their own device
export const pushTest = route({ methods: ["POST"], access: "profile" }, async (req, caller) => {
  const { delaySeconds, title, body, deviceId } = req.body || {};
  const delay = Math.max(0, Math.min(30, Number(delaySeconds) || 0));
  const isAdmin = caller!.role === "ADMIN";
  if (!deviceId && !isAdmin) {
    throw new HttpError(403, "Apenas administradores podem enviar push para todos os aparelhos");
  }
  configureWebPush();

  const dispatchPush = async () => {
    const snap = await adminDb().collection("push_subscriptions").get();
    const targets = snap.docs.filter((d) => {
      const data = d.data();
      if (deviceId && data.deviceId !== deviceId && d.id !== deviceId) return false;
      return isAdmin || data.uid === caller!.uid;
    });
    const payload = JSON.stringify({
      title: title || "🔔 Teste de Notificação Push (PWA)",
      body: body || "Seu celular recebeu a notificação em segundo plano com sucesso! O Web Push está 100% ativo.",
      icon: "/logo_azevedo.png?v=11",
      badge: "/logo_azevedo.png?v=11",
      tag: `push_test_${Date.now()}`,
      data: { url: "/accounts-payable", timestamp: new Date().toISOString() },
    });
    return sendPushToDocs(targets, payload, "[WebPush Test]");
  };

  if (delay > 0) {
    const background = new Promise((resolve) => setTimeout(resolve, delay * 1000))
      .then(dispatchPush)
      .catch((err) => console.error("[WebPush Test] Delayed dispatch failed:", err));
    return {
      status: 200,
      body: {
        success: true,
        scheduled: true,
        delaySeconds: delay,
        message: `Disparo agendado para daqui a ${delay} segundos. Bloqueie a tela do celular agora!`,
      },
      background,
    };
  }

  const result = await dispatchPush();
  return {
    status: 200,
    body: { success: true, scheduled: false, ...result, message: "Push de teste disparado com sucesso para os dispositivos registrados!" },
  };
});

export const pushStatus = route({ methods: ["GET"], access: "profile" }, async () => {
  const snap = await adminDb().collection("push_subscriptions").get();
  const devices = snap.docs.map((d) => {
    const data = d.data();
    let endpointDomain = "unknown";
    try {
      if (data.subscription?.endpoint) endpointDomain = new URL(data.subscription.endpoint).hostname;
    } catch {}
    return {
      id: d.id,
      userName: data.userName || "Usuário",
      userRole: data.userRole || "USER",
      platform: data.platform || "PWA",
      updatedAt: data.updatedAt || "",
      endpointDomain,
    };
  });
  return { status: 200, body: { connected: true, devicesCount: snap.size, devices } };
});

// Same work as the GitHub Actions schedule (scripts/hourly-payable.ts). Unless force is set it claims
// the current hour in system_state/payable_hourly, so it never notifies twice for the same hour.
export const triggerHourlyPayable = route({ methods: ["POST"], access: "admin" }, async (req) => {
  const force = req.body?.force === true;
  const db = adminDb();
  const time = getPayableTimeParts();
  configureWebPush();

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
    return { status: 200, body: { success: true, skipped: true, summary: `Already notified for ${time.hourKey}` } };
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
  await db.collection("global_notifications").add(notification.notificationDoc);

  const result = await sendPushToDocs(await financeSubscriptions(db), notification.pushPayload, "[Hourly AP Trigger]");
  return { status: 200, body: { success: true, summary: `Notified for ${time.hourKey}`, ...result } };
});

// Reports go only to the group's own addresses, so the route can't be used to send spam or
// phishing in the company's name. Set EMAIL_ALLOWED_RECIPIENTS (comma separated) to change the list.
const DEFAULT_EMAIL_RECIPIENTS = ["rennaninacio0003@gmail.com", "azevedogas@yahoo.com.br"];

function allowedRecipients(): Set<string> {
  const fromEnv = (process.env.EMAIL_ALLOWED_RECIPIENTS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return new Set(fromEnv.length ? fromEnv : DEFAULT_EMAIL_RECIPIENTS);
}

export const sendEmail = route({ methods: ["POST"], access: "profile" }, async (req, caller) => {
  const { to, subject, text, html, storeName, reportType } = req.body || {};
  if (!to || !subject || (!text && !html)) {
    return { status: 400, body: { error: "Campos obrigatórios ausentes (to, subject, text/html)" } };
  }
  const recipients = (Array.isArray(to) ? to : String(to).split(","))
    .map((e: unknown) => String(e).trim().toLowerCase())
    .filter(Boolean);
  const allowed = allowedRecipients();
  const blocked = recipients.filter((e: string) => !allowed.has(e));
  if (recipients.length === 0 || recipients.length > 10 || blocked.length) {
    throw new HttpError(403, blocked.length ? `Destinatário não autorizado: ${blocked.join(", ")}` : "Informe de 1 a 10 destinatários");
  }
  if (String(subject).length > 200 || String(html || text).length > 500_000) {
    throw new HttpError(413, "E-mail grande demais");
  }
  await consumeDailyQuota("email", caller!, 50);
  const result = await dispatchEmailMessage({ to: recipients.join(","), subject: String(subject), text, html, storeName, reportType });
  return { status: 200, body: result };
});

let geminiClient: { key: string; ai: GoogleGenAI } | null = null;

// Os modelos Gemini 1.5 e 2.x foram aposentados para chaves novas. O alias "latest" sempre aponta para o
// Flash atual, então o sistema não quebra quando o Google troca de versão. GEMINI_MODEL permite fixar outro.
const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-flash-latest").trim();

export function resolveGeminiModel(requested?: unknown): string {
  if (typeof requested === "string" && /^gemini-(flash|flash-lite|pro)-latest$/.test(requested)) return requested;
  return DEFAULT_GEMINI_MODEL;
}

const AI_MAX_INPUT_CHARS = 600_000;
const AI_CONFIG_KEYS = ["temperature", "topP", "topK", "maxOutputTokens", "responseMimeType", "responseSchema", "systemInstruction"];

/** Only generation settings the app uses; output is capped so one call can't run up the bill. */
function safeAiConfig(config: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (config && typeof config === "object") {
    for (const key of AI_CONFIG_KEYS) {
      if (key in (config as Record<string, unknown>)) out[key] = (config as Record<string, unknown>)[key];
    }
  }
  out.maxOutputTokens = Math.min(Number(out.maxOutputTokens) || 8192, 16384);
  return out;
}

export const aiGenerate = route({ methods: ["POST"], access: "profile" }, async (req, caller) => {
  const key = geminiApiKey();
  if (!key) {
    return { status: 503, body: { error: "GEMINI_API_KEY não configurada no servidor" } };
  }
  if (geminiClient?.key !== key) {
    geminiClient = { key, ai: new GoogleGenAI({ apiKey: key }) };
  }

  const { model, contents, config } = req.body || {};
  if (!contents) throw new HttpError(400, "Envie o conteúdo para a IA");
  if (JSON.stringify(contents).length > AI_MAX_INPUT_CHARS) {
    throw new HttpError(413, "Conteúdo grande demais para uma consulta. Divida em partes menores.");
  }
  await consumeDailyQuota("ai", caller!, caller!.role === "ADMIN" ? 300 : 100);

  const response = await geminiClient.ai.models.generateContent({
    model: resolveGeminiModel(model),
    contents: Array.isArray(contents) ? contents : [{ role: "user", parts: [{ text: String(contents) }] }],
    config: safeAiConfig(config),
  });
  return { status: 200, body: { text: response.text || "" } };
});
