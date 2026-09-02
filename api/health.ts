import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function health(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "estateflow-api",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "production",
  });
}
