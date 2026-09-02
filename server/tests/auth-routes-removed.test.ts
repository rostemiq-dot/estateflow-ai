import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("legacy authentication routes", () => {
  it("does not expose the removed register endpoint", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "legacy@example.com",
      password: "not-used",
    });

    expect(response.status).toBe(404);
  });

  it("does not expose the removed login endpoint", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "legacy@example.com",
      password: "not-used",
    });

    expect(response.status).toBe(404);
  });
});
