import type { UserRole } from "@prisma/client";

/**
 * Loads Express request augmentation as part of the server module graph.
 * Keeping this in a .ts module and importing it from app.ts prevents the
 * declaration from being silently excluded by build tooling.
 */
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
