import type { IncomingMessage, ServerResponse } from "node:http";
import serverless from "serverless-http";
import { app } from "../server/src/app.js";

const handler = serverless(app);

type VercelRequest = IncomingMessage & {
  url?: string;
  query?: Record<string, string | string[]>;
};
type VercelResponse = ServerResponse<IncomingMessage>;

export default function apiHandler(req: VercelRequest, res: VercelResponse) {
  const route = req.query?.route;
  if (typeof route === "string" && route.startsWith("/api/")) {
    const current = new URL(req.url ?? "/", "http://vercel.local");
    current.searchParams.delete("route");
    const query = current.searchParams.toString();
    req.url = route + (query ? `?${query}` : "");
  }

  return handler(req, res);
}
