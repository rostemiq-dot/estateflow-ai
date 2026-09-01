import type { RegisterInput } from "../validators/auth.validators.js";
import type {
  AuthUserRecord,
  RefreshTokenRecord,
  StoredRefreshToken,
} from "../types/auth.types.js";

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already exists");
    this.name = "DuplicateEmailError";
  }
}

export interface AuthRepository {
  provisionSupabaseUser?(email: string, agencyName?: string): Promise<AuthUserRecord>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  createAgencyOwner(
    input: Omit<RegisterInput, "password"> & { passwordHash: string },
  ): Promise<AuthUserRecord>;
  createRefreshToken(token: StoredRefreshToken): Promise<void>;
  findRefreshToken(id: string): Promise<RefreshTokenRecord | null>;
  rotateRefreshToken(
    currentId: string,
    currentHash: string,
    replacement: StoredRefreshToken,
    now: Date,
  ): Promise<boolean>;
  revokeRefreshToken(id: string, tokenHash: string, now: Date): Promise<void>;
  revokeTokenFamily(familyId: string, now: Date): Promise<void>;
}
