import type { IncomingMessage, ServerResponse } from "node:http";
import serverless from "serverless-http";
import { app } from "../server/src/app.js";

const handler = serverless(app);

type VercelRequest = IncomingMessage & { url?: string };

type VercelResponse = ServerResponse<IncomingMessage>;

/**
 * Vercel mounts this function at /api and can strip the original pathname
 * before invoking the Express adapter. The rewrite in vercel.json preserves
 * the original API pathname in __estateflow_path so Express still receives
 * /api/properties, /api/clients, etc.
 */
export default function apiHandler(req: VercelRequest, res: VercelResponse) {
  const currentUrl = req.url ?? "/";
  const parsed = new URL(currentUrl, "http://vercel.local");
  const originalPath = parsed.searchParams.get("__estateflow_path");

  if (originalPath) {
    parsed.searchParams.delete("__estateflow_path");
    const query = parsed.searchParams.toString();
    req.url = originalPath + (query ? `?${query}` : "");
  }

  return handler(req, res);
}
