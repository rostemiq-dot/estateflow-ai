import express from "express";
import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createDatabaseHealthRouter } from "../src/routes/database-health.routes.js";

const createTestApp = (queryRaw: ReturnType<typeof vi.fn>) => {
  const app = express();
  const databaseClient = {
    $queryRaw: queryRaw,
  } as unknown as Pick<PrismaClient, "$queryRaw">;

  app.use("/api/health/database", createDatabaseHealthRouter(databaseClient));

  return app;
};

describe("GET /api/health/database", () => {
  it("returns 200 when Prisma can query the database", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    const response = await request(createTestApp(queryRaw)).get(
      "/api/health/database",
    );

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body).toMatchObject({
      success: true,
      status: "healthy",
      service: "estateflow-database",
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns a sanitized 503 response when the database query fails", async () => {
    const sensitiveError =
      "password=secret host=private.database.internal connection refused";
    const queryRaw = vi.fn().mockRejectedValue(new Error(sensitiveError));
    const response = await request(createTestApp(queryRaw)).get(
      "/api/health/database",
    );

    expect(response.status).toBe(503);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body).toMatchObject({
      success: false,
      status: "unhealthy",
      service: "estateflow-database",
      error: {
        message: "Database connection unavailable",
        statusCode: 503,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(sensitiveError);
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});
