import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check and API status
  app.get("/api/health", (req, res) => {
    const key = getApiKey();
    const envKeys = Object.keys(process.env);
    res.json({ 
      status: "ok", 
      apiConfigured: !!key && key.length > 10,
      keyPrefix: key ? key.substring(0, 4) + "..." : "none",
      availableEnvVars: envKeys.filter(k => k.includes("API") || k.includes("KEY") || k.includes("GOOGLE") || k.includes("GEMINI"))
    });
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
