import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        agencyId: string;
        role: UserRole;
      };
    }
  }
}

export {};
