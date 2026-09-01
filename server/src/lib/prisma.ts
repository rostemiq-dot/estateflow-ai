import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  bootstrapPromise: Promise<void> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * One-time/admin bootstrap for the existing EstateFlow admin account.
 * It is enabled only when BOOTSTRAP_ADMIN_PASSWORD is explicitly configured.
 * After the password is synchronized, the environment variable can be removed.
 */
export const bootstrapAdminPassword = (): Promise<void> => {
  if (globalForPrisma.bootstrapPromise) return globalForPrisma.bootstrapPromise;

  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!password || !email) return Promise.resolve();

  globalForPrisma.bootstrapPromise = (async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true },
    });
  })();

  return globalForPrisma.bootstrapPromise;
};
