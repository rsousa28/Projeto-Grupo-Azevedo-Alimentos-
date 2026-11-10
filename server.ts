import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { adminDb } from "./server/firebaseAdmin";
import { dispatchEmailMessage } from "./server/email";
import {
  type ApiHandler,
  health,
  pushVapidPublicKey,
  pushSubscribe,
  pushTest,
  pushStatus,
  triggerHourlyPayable,
  sendEmail,
  aiGenerate,
} from "./server/api";

dotenv.config();

// Set DISABLE_BACKGROUND_JOBS=true for local development so this instance does not
// process the shared email queue.
const backgroundJobsDisabled = process.env.DISABLE_BACKGROUND_JOBS === "true";
if (backgroundJobsDisabled) {
  console.log("[Server] DISABLE_BACKGROUND_JOBS=true: email queue listener is off.");
} else {
  setupEmailQueueListener();
}

// Firestore email_requests queue: the frontend falls back to it when /api/send-email fails.
// Only a long-running server.ts instance processes it (Vercel functions cannot listen).
function setupEmailQueueListener() {
  let db;
  try {
    db = adminDb();
  } catch (err: any) {
    console.warn("[Email Queue] Not started:", err.message || err);
    return;
  }
  db.collection("email_requests").where("status", "==", "pending").onSnapshot(async (snap) => {
    for (const change of snap.docChanges()) {
      if (change.type !== "added" && change.type !== "modified") continue;
      const docData = change.doc.data();
      if (docData?.status !== "pending") continue;
      const ref = change.doc.ref;
      console.log(`[Email Queue] Processing email request ${ref.id} for ${docData.to}...`);
      try {
        await ref.set({ status: "processing" }, { merge: true });
        const result = await dispatchEmailMessage({
          to: docData.to,
          subject: docData.subject,
          text: docData.text,
          html: docData.html,
          storeName: docData.storeName,
          reportType: docData.reportType,
        });
        await ref.set({
          status: "delivered",
          deliveredAt: new Date().toISOString(),
          resultMessage: result.message,
          messageId: result.id || null,
        }, { merge: true });
        console.log(`[Email Queue] Request ${ref.id} marked delivered!`);
      } catch (err: any) {
        console.error(`[Email Queue] Error processing ${ref.id}:`, err);
        await ref.set({ status: "failed", error: err.message || String(err) }, { merge: true });
      }
    }
  }, (err) => console.warn("[Email Queue] Listener error:", err.message || err));
  console.log("[Server Firebase] Listening to Firestore email_requests queue.");
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // Same handlers as the Vercel functions in api/
  const mount = (routePath: string, handler: ApiHandler) => {
    app.all(routePath, async (req, res) => {
      const result = await handler({ method: req.method, headers: req.headers, body: req.body });
      res.status(result.status).json(result.body);
    });
  };
  mount("/api/health", health);
  mount("/api/push/vapid-public-key", pushVapidPublicKey);
  mount("/api/push/subscribe", pushSubscribe);
  mount("/api/push/test", pushTest);
  mount("/api/push/status", pushStatus);
  mount("/api/notifications/trigger-hourly-payable", triggerHourlyPayable);
  mount("/api/send-email", sendEmail);
  mount("/api/ai/generate", aiGenerate);

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

