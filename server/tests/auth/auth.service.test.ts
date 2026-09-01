import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/errors/app-error.js";
import { AuthService } from "../../src/modules/auth/services/auth.service.js";
import {
  createPasswordServiceMock,
  createRepositoryMock,
  createTokenServiceMock,
  userFixture,
} from "./auth.fixtures.js";

const now = new Date("2026-07-28T12:00:00.000Z");
const familyId = "33333333-3333-4333-8333-333333333333";
const tokenId = "44444444-4444-4444-8444-444444444444";

const createService = () => {
  const repository = createRepositoryMock();
  const tokens = createTokenServiceMock();
  const passwords = createPasswordServiceMock();
  const createId = vi
    .fn()
    .mockReturnValueOnce(familyId)
    .mockReturnValueOnce(tokenId);
  const service = new AuthService(
    repository,
    tokens,
    passwords,
    () => now,
    createId,
  );

  return { createId, passwords, repository, service, tokens };
};

describe("AuthService registration", () => {
  it("hashes the password and creates an owner session", async () => {
    const { passwords, repository, service } = createService();
    vi.mocked(repository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(repository.createAgencyOwner).mockResolvedValue(userFixture);

    const result = await service.register({
      agencyName: "North Star Realty",
      email: "owner@example.com",
      password: "StrongPassword123",
    });

    expect(passwords.hash).toHaveBeenCalledWith("StrongPassword123");
    expect(repository.createAgencyOwner).toHaveBeenCalledWith({
      agencyName: "North Star Realty",
      email: "owner@example.com",
      passwordHash: "new-password-hash",
    });
    expect(repository.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: tokenId,
        familyId,
        tokenHash: expect.not.stringContaining("refresh-token"),
        userId: userFixture.id,
      }),
    );
    expect(result).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: userFixture.id,
        email: userFixture.email,
      },
    });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("returns the same safe account-creation error for an existing email", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.findUserByEmail).mockResolvedValue(userFixture);

    await expect(
      service.register({
        agencyName: "North Star Realty",
        email: userFixture.email,
        password: "StrongPassword123",
      }),
    ).rejects.toMatchObject({
      message: "Unable to create account",
      statusCode: 409,
    });
  });
});

describe("AuthService login", () => {
  it("verifies the password and returns tokens without the password hash", async () => {
    const { passwords, repository, service } = createService();
    vi.mocked(repository.findUserByEmail).mockResolvedValue(userFixture);
    vi.mocked(passwords.compare).mockResolvedValue(true);

    const result = await service.login({
      email: userFixture.email,
      password: "StrongPassword123",
    });

    expect(passwords.compare).toHaveBeenCalledWith(
      "StrongPassword123",
      userFixture.passwordHash,
    );
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("performs a password comparison and uses a consistent error for unknown users", async () => {
    const { passwords, repository, service } = createService();
    vi.mocked(repository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(passwords.compare).mockResolvedValue(false);

    const action = service.login({
      email: "missing@example.com",
      password: "WrongPassword123",
    });

    await expect(action).rejects.toBeInstanceOf(AppError);
    await expect(action).rejects.toMatchObject({
      message: "Invalid email or password",
      statusCode: 401,
    });
    expect(passwords.compare).toHaveBeenCalledOnce();
  });
});
