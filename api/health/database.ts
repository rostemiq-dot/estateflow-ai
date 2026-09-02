import type { IncomingMessage, ServerResponse } from "node:http";
import { PrismaClient } from "@prisma/client";

type VercelRequest = IncomingMessage;
type VercelResponse = ServerResponse<IncomingMessage> & {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default async function healthDatabase(
  _req: VercelRequest,
  res: VercelResponse,
) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      status: "healthy",
      service: "estateflow-database",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "production",
    });
  } catch (error) {
    console.error("Database health check failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });

    res.status(503).json({
      success: false,
      status: "unhealthy",
      service: "estateflow-database",
      timestamp: new Date().toISOString(),
      error: {
        message: "Database connection unavailable",
        statusCode: 503,
      },
    });
  }
}
