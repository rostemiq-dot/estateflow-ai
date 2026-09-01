import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type {
  AuthUserRecord,
  RefreshTokenRecord,
  StoredRefreshToken,
} from "../types/auth.types.js";
import type { RegisterInput } from "../validators/auth.validators.js";
import { DuplicateEmailError, type AuthRepository } from "./auth.repository.js";

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
  async provisionSupabaseUser(email: string, agencyName = "My Agency"): Promise<AuthUserRecord> {
    const existing = await this.findUserByEmail(email);
    if (existing) return existing;
    return prisma.$transaction(async (transaction) => {
      const agency = await transaction.agency.create({ data: { name: agencyName }, select: { id: true } });
      const user = await transaction.user.create({ data: { agencyId: agency.id, email, passwordHash: "supabase-managed", role: UserRole.OWNER }, select: userSelection });
      await transaction.agency.update({ where: { id: agency.id }, data: { ownerId: user.id } });
      return user;
    });
  }
  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      select: userSelection,
    });
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
      select: userSelection,
    });
  }

  async createAgencyOwner(
    input: Omit<RegisterInput, "password"> & { passwordHash: string },
  ): Promise<AuthUserRecord> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const agency = await transaction.agency.create({
          data: { name: input.agencyName },
          select: { id: true },
        });
        const user = await transaction.user.create({
          data: {
            agencyId: agency.id,
            email: input.email,
            passwordHash: input.passwordHash,
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
        throw new DuplicateEmailError();
      }

      throw error;
    }
  }

  async createRefreshToken(token: StoredRefreshToken): Promise<void> {
    await prisma.refreshToken.create({ data: token });
  }

  async findRefreshToken(id: string): Promise<RefreshTokenRecord | null> {
    return prisma.refreshToken.findUnique({
      where: { id },
      select: {
        id: true,
        tokenHash: true,
        familyId: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: userSelection },
      },
    });
  }

  async rotateRefreshToken(
    currentId: string,
    currentHash: string,
    replacement: StoredRefreshToken,
    now: Date,
  ): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const update = await transaction.refreshToken.updateMany({
        where: {
          id: currentId,
          tokenHash: currentHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
          replacedByTokenId: replacement.id,
        },
      });

      if (update.count !== 1) {
        return false;
      }

      await transaction.refreshToken.create({ data: replacement });
      return true;
    });
  }

  async revokeRefreshToken(
    id: string,
    tokenHash: string,
    now: Date,
  ): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { id, tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeTokenFamily(familyId: string, now: Date): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
