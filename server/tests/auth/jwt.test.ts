import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { AppError } from "../../src/errors/app-error.js";
import { JwtTokenService } from "../../src/modules/auth/services/jwt.service.js";
import { userFixture } from "./auth.fixtures.js";

const tokens = new JwtTokenService({
  accessSecret: "access-secret-that-is-at-least-thirty-two-characters",
  refreshSecret: "refresh-secret-that-is-different-and-thirty-two-chars",
});

const authenticatedUser = {
  id: userFixture.id,
  email: userFixture.email,
  agencyId: userFixture.agencyId,
  role: UserRole.OWNER,
};

describe("JWT service", () => {
  it("signs and verifies a scoped 15-minute access token", () => {
    const token = tokens.signAccessToken(authenticatedUser);
    const payload = tokens.verifyAccessToken(token);

    expect(payload).toMatchObject({
      sub: authenticatedUser.id,
      agencyId: authenticatedUser.agencyId,
      role: UserRole.OWNER,
      type: "access",
    });
  });

  it("signs and verifies a refresh token with rotation identifiers", () => {
    const tokenId = "44444444-4444-4444-8444-444444444444";
    const familyId = "33333333-3333-4333-8333-333333333333";
    const token = tokens.signRefreshToken(authenticatedUser, tokenId, familyId);

    expect(tokens.verifyRefreshToken(token)).toMatchObject({
      sub: authenticatedUser.id,
      jti: tokenId,
      familyId,
      type: "refresh",
    });
  });

  it("rejects using a refresh token as an access token", () => {
    const token = tokens.signRefreshToken(
      authenticatedUser,
      "44444444-4444-4444-8444-444444444444",
      "33333333-3333-4333-8333-333333333333",
    );

    expect(() => tokens.verifyAccessToken(token)).toThrow(AppError);
  });

  it("rejects tokens signed with another secret", () => {
    const foreignTokens = new JwtTokenService({
      accessSecret: "foreign-access-secret-with-thirty-two-characters",
      refreshSecret: "foreign-refresh-secret-with-thirty-two-characters",
    });
    const token = foreignTokens.signAccessToken(authenticatedUser);

    expect(() => tokens.verifyAccessToken(token)).toThrow(AppError);
  });
});
