import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("EstateFlow API", () => {
  it("returns a healthy JSON response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body).toMatchObject({
      success: true,
      status: "healthy",
      service: "estateflow-api",
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.environment).toEqual(expect.any(String));
  });

  it("returns the expected JSON error for an unknown API route", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        message: "Route not found: GET /api/does-not-exist",
        statusCode: 404,
      },
    });
  });
});
