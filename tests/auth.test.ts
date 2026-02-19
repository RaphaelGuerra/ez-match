import { describe, expect, it } from "vitest";
import { createAdminSessionToken, verifyAdminSessionToken } from "../lib/auth";

describe("admin signed sessions", () => {
  it("accepts a valid token and rejects tampered tokens", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";

    const token = await createAdminSessionToken();
    await expect(verifyAdminSessionToken(token)).resolves.toBe(true);

    const tampered = `${token}x`;
    await expect(verifyAdminSessionToken(tampered)).resolves.toBe(false);

    const [payload] = token.split(".");
    await expect(verifyAdminSessionToken(`${payload}.bad`)).resolves.toBe(false);
  });
});
