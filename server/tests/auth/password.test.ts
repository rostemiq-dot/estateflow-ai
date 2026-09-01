import { describe, expect, it } from "vitest";
import {
  BcryptPasswordService,
  PASSWORD_HASH_ROUNDS,
} from "../../src/modules/auth/services/password.service.js";

describe("bcrypt password service", () => {
  it("hashes with 12 rounds and verifies without exposing the password", async () => {
    const service = new BcryptPasswordService();
    const password = "StrongPassword123";
    const hash = await service.hash(password);

    expect(hash).not.toContain(password);
    expect(Number(hash.split("$")[2])).toBe(PASSWORD_HASH_ROUNDS);
    await expect(service.compare(password, hash)).resolves.toBe(true);
    await expect(service.compare("WrongPassword123", hash)).resolves.toBe(
      false,
    );
  });
});
