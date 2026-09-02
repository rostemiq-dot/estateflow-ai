import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const withTimeout = async <T>(promise: Promise<T>, ms = 8000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database request timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export default async function properties(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: { message: "Method not supported on this diagnostic endpoint" } });
    return;
  }

  try {
    const authorization = req.headers.authorization;
    const token = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!token || !supabaseUrl || !supabaseAnonKey) {
      res.status(401).json({ success: false, error: { message: "Authentication configuration is missing" } });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await withTimeout(
      supabase.auth.getUser(token),
    );

    if (authError || !authData.user?.email) {
      res.status(401).json({ success: false, error: { message: "Authentication required" } });
      return;
    }

    const user = await withTimeout(
      prisma.user.findUnique({
        where: { email: authData.user.email },
        select: { id: true, agencyId: true, isActive: true },
      }),
    );

    if (!user || !user.isActive) {
      res.status(403).json({ success: false, error: { message: "Application account is not provisioned" } });
      return;
    }

    const properties = await withTimeout(
      prisma.property.findMany({
        where: { agencyId: user.agencyId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    );

    res.status(200).json({ data: properties, pagination: { page: 1, pageSize: 100, total: properties.length } });
  } catch (error) {
    console.error("Properties API failed", error);
    res.status(503).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Properties service unavailable",
        statusCode: 503,
      },
    });
  }
}
