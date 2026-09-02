import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { AuthUserRecord } from "../types/auth.types.js";
import type { AuthRepository } from "./auth.repository.js";

const userSelection = {
  id: true,
  email: true,
  passwordHash: true,
  agencyId: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class PrismaAuthRepository implements AuthRepository {
  async provisionSupabaseUser(
    email: string,
    agencyName = "My Agency",
  ): Promise<AuthUserRecord> {
    const existing = await this.findUserByEmail(email);
    if (existing) return existing;

    try {
      return await prisma.$transaction(async (transaction) => {
        const agency = await transaction.agency.create({
          data: { name: agencyName },
          select: { id: true },
        });
        const user = await transaction.user.create({
          data: {
            agencyId: agency.id,
            email,
            passwordHash: "supabase-managed",
            role: UserRole.OWNER,
          },
          select: userSelection,
        });
        await transaction.agency.update({
          where: { id: agency.id },
          data: { ownerId: user.id },
        });
        return user;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrentUser = await this.findUserByEmail(email);
        if (concurrentUser) return concurrentUser;
      }
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      select: userSelection,
    });
  }
}
