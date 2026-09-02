import type { UserRole } from "@prisma/client";

export type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  agencyId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  agencyId: string;
  role: UserRole;
};
