import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const apiKey = (process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               "").trim();

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check and API status
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      apiConfigured: !!apiKey && apiKey.length > 10,
      keyPrefix: apiKey ? apiKey.substring(0, 4) + "..." : "none"
    });
  });

  // Gemini API Proxy
  app.post("/api/ai/generate", async (req, res) => {
    try {
      if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
        const availableVars = Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY") || k.includes("GOOGLE") || k.includes("GEMINI"));
        console.error("Missing or invalid API Key. Available env vars:", availableVars);
        return res.status(500).json({ 
          error: `GEMINI_API_KEY is not configured. Please ensure you saved the Secret in the Settings > Secrets panel in AI Studio.` 
        });
      }

      const { model, contents, config } = req.body;

      // Use modern model names
      const modelName = model && !model.includes("1.5") ? model : "gemini-3-flash-preview";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: String(contents) }] }],
        config: config,
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
    // Support SPA routing in production
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
