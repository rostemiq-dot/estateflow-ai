import type { UserRole } from "@prisma/client";

export type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  agencyId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Omit<AuthUserRecord, "passwordHash">;

export type AuthenticatedUser = {
  id: string;
  email: string;
  agencyId: string;
  role: UserRole;
};

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: AuthUserRecord;
};

export type StoredRefreshToken = {
  id: string;
  tokenHash: string;
  familyId: string;
  userId: string;
  expiresAt: Date;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

export type AuthResult = TokenPair & {
  user: PublicUser;
};

export type AccessTokenPayload = {
  sub: string;
  agencyId: string;
  role: UserRole;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  agencyId: string;
  role: UserRole;
  type: "refresh";
  jti: string;
  familyId: string;
};
