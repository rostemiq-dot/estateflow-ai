import type { AuthUserRecord } from "../types/auth.types.js";

export interface AuthRepository {
  provisionSupabaseUser(email: string, agencyName?: string): Promise<AuthUserRecord>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
}
