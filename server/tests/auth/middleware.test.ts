import { UserRole } from "@prisma/client";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAuthenticate } from "../../src/modules/auth/middleware/authenticate.js";
import { authorize } from "../../src/modules/auth/middleware/authorize.js";
import {
  createRepositoryMock,
  createTokenServiceMock,
  userFixture,
} from "./auth.fixtures.js";

const createProtectedApp = (role: UserRole, allow: UserRole[]) => {
  const repository = createRepositoryMock();
  const tokens = createTokenServiceMock();
  vi.mocked(tokens.verifyAccessToken).mockReturnValue({
    sub: userFixture.id,
    agencyId: userFixture.agencyId,
    role,
    type: "access",
  });
  vi.mocked(repository.findUserById).mockResolvedValue({
    ...userFixture,
    role,
  });

  const app = express();
  app.get(
    "/protected",
    createAuthenticate(tokens, repository),
    authorize(...allow),
    (req, res) => res.json({ success: true, user: req.user }),
  );
  app.use(errorHandler);

  return { app, repository, tokens };
};

describe("authentication middleware", () => {
  it("rejects requests without a Bearer token", async () => {
    const { app, repository } = createProtectedApp(UserRole.OWNER, [
      UserRole.OWNER,
    ]);
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(repository.findUserById).not.toHaveBeenCalled();
  });

  it("loads the current user for a valid access token", async () => {
    const { app } = createProtectedApp(UserRole.OWNER, [UserRole.OWNER]);
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-access-token");

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: userFixture.id,
      role: UserRole.OWNER,
    });
  });
});

describe("authorization middleware", () => {
  it.each([UserRole.OWNER, UserRole.ADMIN])(
    "allows the %s role when configured",
    async (role) => {
      const { app } = createProtectedApp(role, [
        UserRole.OWNER,
        UserRole.ADMIN,
      ]);
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer valid-access-token");

      expect(response.status).toBe(200);
    },
  );

  it("rejects an authenticated role without permission", async () => {
    const { app } = createProtectedApp(UserRole.AGENT, [UserRole.OWNER]);
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-access-token");

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe("Insufficient permissions");
  });
});
