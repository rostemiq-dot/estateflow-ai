import cookieParser from "cookie-parser";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { REFRESH_COOKIE_NAME } from "../../src/modules/auth/controllers/auth.controller.js";
import { createAuthRouter } from "../../src/modules/auth/routes/auth.routes.js";
import type { AuthServiceContract } from "../../src/modules/auth/services/auth.service.js";
import { userFixture } from "./auth.fixtures.js";

const authResult = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessTokenExpiresIn: 900,
  user: {
    id: userFixture.id,
    email: userFixture.email,
    agencyId: userFixture.agencyId,
    role: userFixture.role,
    createdAt: userFixture.createdAt,
    updatedAt: userFixture.updatedAt,
  },
};

const createServiceMock = (): AuthServiceContract => ({
  register: vi.fn().mockResolvedValue(authResult),
  login: vi.fn().mockResolvedValue(authResult),
  refresh: vi.fn().mockResolvedValue(authResult),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(authResult.user),
});

const authenticated: RequestHandler = (req, _res, next) => {
  req.user = {
    id: userFixture.id,
    email: userFixture.email,
    agencyId: userFixture.agencyId,
    role: userFixture.role,
  };
  next();
};

const createTestApp = () => {
  const service = createServiceMock();
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    "/api/auth",
    createAuthRouter({ authService: service, authenticate: authenticated }),
  );
  app.use(errorHandler);

  return { app, service };
};

describe("authentication routes", () => {
  it("registers validated agency owner data and sets an HttpOnly cookie", async () => {
    const { app, service } = createTestApp();
    const response = await request(app).post("/api/auth/register").send({
      agencyName: "North Star Realty",
      email: " OWNER@EXAMPLE.COM ",
      password: "StrongPassword123",
    });

    expect(response.status).toBe(201);
    expect(service.register).toHaveBeenCalledWith({
      agencyName: "North Star Realty",
      email: "owner@example.com",
      password: "StrongPassword123",
    });
    expect(response.headers["set-cookie"]?.[0]).toContain(
      `${REFRESH_COOKIE_NAME}=refresh-token`,
    );
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 900,
    });
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects invalid registration input before calling the service", async () => {
    const { app, service } = createTestApp();
    const response = await request(app).post("/api/auth/register").send({
      agencyName: "A",
      email: "not-an-email",
      password: "short",
      unexpected: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid request data");
    expect(service.register).not.toHaveBeenCalled();
  });

  it("validates and forwards login credentials", async () => {
    const { app, service } = createTestApp();
    const response = await request(app).post("/api/auth/login").send({
      email: "OWNER@EXAMPLE.COM",
      password: "StrongPassword123",
    });

    expect(response.status).toBe(200);
    expect(service.login).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "StrongPassword123",
    });
  });

  it("rotates a refresh token from the cookie", async () => {
    const { app, service } = createTestApp();
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=old-refresh-token`);

    expect(response.status).toBe(200);
    expect(service.refresh).toHaveBeenCalledWith("old-refresh-token");
  });

  it("logs out idempotently and clears the refresh cookie", async () => {
    const { app, service } = createTestApp();
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=refresh-token`);

    expect(response.status).toBe(204);
    expect(service.logout).toHaveBeenCalledWith("refresh-token");
    expect(response.headers["set-cookie"]?.[0]).toContain(
      `${REFRESH_COOKIE_NAME}=;`,
    );
  });

  it("returns the authenticated user from /me", async () => {
    const { app, service } = createTestApp();
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(service.getCurrentUser).toHaveBeenCalledWith(userFixture.id);
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });
});
