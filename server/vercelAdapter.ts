// Turns a shared API handler (server/api.ts) into a Vercel Node.js function.
import type { IncomingMessage, ServerResponse } from "http";
import { waitUntil } from "@vercel/functions";
import type { ApiHandler } from "./api.js";

type VercelRequest = IncomingMessage & { body?: any };

export function toVercel(handler: ApiHandler) {
  return async (req: VercelRequest, res: ServerResponse) => {
    const result = await handler({ method: req.method || "GET", headers: req.headers, body: req.body });
    if (result.background) {
      waitUntil(result.background);
    }
    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(result.body));
  };
}
