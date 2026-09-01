import type { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { AppError } from "../../../errors/app-error.js";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from "../types/auth.types.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const TOKEN_ISSUER = "estateflow-api";
const TOKEN_AUDIENCE = "estateflow-client";

const accessPayloadSchema = z.object({
  sub: z.string().uuid(),
  agencyId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "AGENT"]),
  type: z.literal("access"),
});

const refreshPayloadSchema = z.object({
  sub: z.string().uuid(),
  agencyId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "AGENT"]),
  type: z.literal("refresh"),
  jti: z.string().uuid(),
  familyId: z.string().uuid(),
});

type JwtConfiguration = {
  accessSecret: string;
  refreshSecret: string;
};

export interface TokenService {
  signAccessToken(user: AuthenticatedUser): string;
  signRefreshToken(
    user: AuthenticatedUser,
    tokenId: string,
    familyId: string,
  ): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}

export class JwtTokenService implements TokenService {
  constructor(
    private readonly configuration: JwtConfiguration = {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
    },
  ) {}

  signAccessToken(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        agencyId: user.agencyId,
        role: user.role,
        type: "access",
      },
      this.configuration.accessSecret,
      {
        algorithm: "HS256",
        audience: TOKEN_AUDIENCE,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        issuer: TOKEN_ISSUER,
        subject: user.id,
      },
    );
  }

  signRefreshToken(
    user: AuthenticatedUser,
    tokenId: string,
    familyId: string,
  ): string {
    return jwt.sign(
      {
        agencyId: user.agencyId,
        role: user.role,
        type: "refresh",
        familyId,
      },
      this.configuration.refreshSecret,
      {
        algorithm: "HS256",
        audience: TOKEN_AUDIENCE,
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        issuer: TOKEN_ISSUER,
        jwtid: tokenId,
        subject: user.id,
      },
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify(token, this.configuration.accessSecret);
    const result = accessPayloadSchema.safeParse(payload);

    if (!result.success) {
      throw new AppError("Authentication required", 401);
    }

    return {
      ...result.data,
      role: result.data.role as UserRole,
    };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify(token, this.configuration.refreshSecret);
    const result = refreshPayloadSchema.safeParse(payload);

    if (!result.success) {
      throw new AppError("Invalid or expired session", 401);
    }

    return {
      ...result.data,
      role: result.data.role as UserRole,
    };
  }

  private verify(token: string, secret: string): string | jwt.JwtPayload {
    try {
      return jwt.verify(token, secret, {
        algorithms: ["HS256"],
        audience: TOKEN_AUDIENCE,
        issuer: TOKEN_ISSUER,
      });
    } catch {
      throw new AppError("Authentication required", 401);
    }
  }
}
