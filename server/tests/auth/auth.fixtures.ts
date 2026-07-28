import { UserRole } from "@prisma/client";
import type { AuthRepository } from "../../src/modules/auth/services/auth.repository.js";
import type { TokenService } from "../../src/modules/auth/services/jwt.service.js";
import type { PasswordService } from "../../src/modules/auth/services/password.service.js";
import type { AuthUserRecord } from "../../src/modules/auth/types/auth.types.js";
import { vi } from "vitest";

export const userFixture: AuthUserRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  passwordHash: "stored-password-hash",
  agencyId: "22222222-2222-4222-8222-222222222222",
  role: UserRole.OWNER,
  createdAt: new Date("2026-07-28T00:00:00.000Z"),
  updatedAt: new Date("2026-07-28T00:00:00.000Z"),
};

export const createRepositoryMock = (): AuthRepository => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createAgencyOwner: vi.fn(),
  createRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeTokenFamily: vi.fn(),
});

export const createTokenServiceMock = (): TokenService => ({
  signAccessToken: vi.fn().mockReturnValue("access-token"),
  signRefreshToken: vi.fn().mockReturnValue("refresh-token"),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
});

export const createPasswordServiceMock = (): PasswordService => ({
  hash: vi.fn().mockResolvedValue("new-password-hash"),
  compare: vi.fn(),
});
