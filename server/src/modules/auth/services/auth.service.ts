import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { AppError } from "../../../errors/app-error.js";
import type {
  AuthResult,
  AuthUserRecord,
  AuthenticatedUser,
  PublicUser,
  StoredRefreshToken,
} from "../types/auth.types.js";
import type {
  LoginInput,
  RegisterInput,
} from "../validators/auth.validators.js";
import { DuplicateEmailError, type AuthRepository } from "./auth.repository.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  type TokenService,
} from "./jwt.service.js";
import type { PasswordService } from "./password.service.js";

const INVALID_LOGIN_MESSAGE = "Invalid email or password";
const DUMMY_PASSWORD_HASH =
  "$2b$12$/kTuqKOa6i19g7uaWV0/ReW3QDRgc9OgjCn0Re/bYeCAWLQALoJZ6";

type Clock = () => Date;
type IdGenerator = () => string;

export interface AuthServiceContract {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  logout(refreshToken?: string): Promise<void>;
  getCurrentUser(userId: string): Promise<PublicUser>;
}

export class AuthService implements AuthServiceContract {
  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdGenerator = randomUUID,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    if (await this.repository.findUserByEmail(input.email)) {
      throw new AppError("Unable to create account", 409);
    }

    const passwordHash = await this.passwords.hash(input.password);

    try {
      const user = await this.repository.createAgencyOwner({
        agencyName: input.agencyName,
        email: input.email,
        passwordHash,
      });
      return this.createSession(user);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new AppError("Unable to create account", 409);
      }

      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordMatches = await this.passwords.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AppError(INVALID_LOGIN_MESSAGE, 401);
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const storedToken = await this.repository.findRefreshToken(payload.jti);
    const now = this.clock();

    if (
      !storedToken ||
      storedToken.userId !== payload.sub ||
      storedToken.familyId !== payload.familyId ||
      storedToken.expiresAt <= now ||
      !hashesMatch(storedToken.tokenHash, hashToken(refreshToken))
    ) {
      throw new AppError("Invalid or expired session", 401);
    }

    if (storedToken.revokedAt) {
      await this.repository.revokeTokenFamily(storedToken.familyId, now);
      throw new AppError("Invalid or expired session", 401);
    }

    const replacement = this.buildRefreshToken(
      storedToken.user,
      storedToken.familyId,
      now,
    );
    const rotated = await this.repository.rotateRefreshToken(
      storedToken.id,
      storedToken.tokenHash,
      replacement.stored,
      now,
    );

    if (!rotated) {
      await this.repository.revokeTokenFamily(storedToken.familyId, now);
      throw new AppError("Invalid or expired session", 401);
    }

    return this.buildAuthResult(
      storedToken.user,
      replacement.token,
      this.tokens.signAccessToken(toAuthenticatedUser(storedToken.user)),
    );
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      await this.repository.revokeRefreshToken(
        payload.jti,
        hashToken(refreshToken),
        this.clock(),
      );
    } catch {
      // Logout is intentionally idempotent and does not reveal token validity.
    }
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new AppError("Authentication required", 401);
    }

    return toPublicUser(user);
  }

  private async createSession(user: AuthUserRecord): Promise<AuthResult> {
    const now = this.clock();
    const refresh = this.buildRefreshToken(user, this.createId(), now);
    await this.repository.createRefreshToken(refresh.stored);

    return this.buildAuthResult(
      user,
      refresh.token,
      this.tokens.signAccessToken(toAuthenticatedUser(user)),
    );
  }

  private buildRefreshToken(user: AuthUserRecord, familyId: string, now: Date) {
    const tokenId = this.createId();
    const token = this.tokens.signRefreshToken(
      toAuthenticatedUser(user),
      tokenId,
      familyId,
    );
    const stored: StoredRefreshToken = {
      id: tokenId,
      tokenHash: hashToken(token),
      familyId,
      userId: user.id,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1_000),
    };

    return { stored, token };
  }

  private buildAuthResult(
    user: AuthUserRecord,
    refreshToken: string,
    accessToken: string,
  ): AuthResult {
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: toPublicUser(user),
    };
  }
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const hashesMatch = (first: string, second: string) => {
  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");

  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
};

const toAuthenticatedUser = (user: AuthUserRecord): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  agencyId: user.agencyId,
  role: user.role,
});

const toPublicUser = (user: AuthUserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  agencyId: user.agencyId,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
