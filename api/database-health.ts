import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ success: true, status: "healthy", service: "estateflow-database" });
  } catch (error) {
    console.error("database-health", error);
    return res.status(503).json({ success: false, status: "unhealthy", service: "estateflow-database", error: error instanceof Error ? error.message : String(error) });
  }
}
