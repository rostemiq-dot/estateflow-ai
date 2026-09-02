import type { IncomingMessage, ServerResponse } from "node:http";
import serverless from "serverless-http";
import { app } from "../server/src/app.js";

type VercelRequest = IncomingMessage & {
  url?: string;
  query?: Record<string, string | string[]>;
};

type VercelResponse = ServerResponse<IncomingMessage>;

const handler = serverless(app);

export default function apiHandler(req: VercelRequest, res: VercelResponse) {
  const currentUrl = req.url ?? "/";
  const queryPath = req.query?.path;
  const pathParts = Array.isArray(queryPath) ? queryPath : queryPath ? [queryPath] : [];

  // Vercel's dynamic API function exposes the captured pathname as req.query.path.
  // Rebuild the URL before passing the request to serverless-http so Express sees
  // the real route instead of "/".
  if (pathParts.length > 0) {
    const parsed = new URL(currentUrl, "http://vercel.local");
    const routePath = "/api/" + pathParts.map(encodeURIComponent).join("/");
    const query = parsed.searchParams.toString();
    req.url = routePath + (query ? `?${query}` : "");
  } else if (currentUrl === "/") {
    req.url = "/api";
  }

  return handler(req, res);
}
