import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage;
type VercelResponse = ServerResponse<IncomingMessage> & {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
};

export default function health(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "estateflow-api",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "production",
  });
}
