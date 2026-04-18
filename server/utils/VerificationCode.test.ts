import { VerificationCode } from "./VerificationCode";

describe("VerificationCode", () => {
  const teamId = "team-1";
  const otherTeamId = "team-2";
  const email = "user@example.com";

  afterEach(async () => {
    await VerificationCode.delete(teamId, email);
    await VerificationCode.delete(otherTeamId, email);
  });

  describe("generate", () => {
    it("should return a 6-digit string", () => {
      const code = VerificationCode.generate();
      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe("store and retrieve", () => {
    it("should store and retrieve a code", async () => {
      const code = "123456";
      await VerificationCode.store(teamId, email, code);
      const retrieved = await VerificationCode.retrieve(teamId, email);
      expect(retrieved).toBe(code);
    });

    it("should return undefined for an unknown email", async () => {
      const retrieved = await VerificationCode.retrieve(
        teamId,
        "unknown@example.com"
      );
      expect(retrieved).toBeUndefined();
    });

    it("should be case-insensitive for email", async () => {
      const code = "654321";
      await VerificationCode.store(teamId, "User@Example.COM", code);
      const retrieved = await VerificationCode.retrieve(
        teamId,
        "user@example.com"
      );
      expect(retrieved).toBe(code);
      await VerificationCode.delete(teamId, "user@example.com");
    });

    it("should isolate codes between teams for the same email", async () => {
      await VerificationCode.store(teamId, email, "111111");
      await VerificationCode.store(otherTeamId, email, "222222");

      expect(await VerificationCode.retrieve(teamId, email)).toBe("111111");
      expect(await VerificationCode.retrieve(otherTeamId, email)).toBe(
        "222222"
      );
    });
  });

  describe("verify", () => {
    it("should return true for a matching code", async () => {
      const code = "123456";
      await VerificationCode.store(teamId, email, code);
      const result = await VerificationCode.verify(teamId, email, code);
      expect(result).toBe(true);
    });

    it("should return false for an incorrect code", async () => {
      await VerificationCode.store(teamId, email, "123456");
      const result = await VerificationCode.verify(teamId, email, "000000");
      expect(result).toBe(false);
    });

    it("should return false when no code is stored", async () => {
      const result = await VerificationCode.verify(teamId, email, "123456");
      expect(result).toBe(false);
    });

    it("should not verify a code issued for a different team", async () => {
      await VerificationCode.store(teamId, email, "123456");
      const result = await VerificationCode.verify(
        otherTeamId,
        email,
        "123456"
      );
      expect(result).toBe(false);
    });

    it("should delete the code after exceeding max attempts", async () => {
      await VerificationCode.store(teamId, email, "123456");

      // Exhaust all 10 allowed attempts with wrong codes
      for (let i = 0; i < 10; i++) {
        await VerificationCode.verify(teamId, email, "000000");
      }

      // 11th attempt should fail even with the correct code
      const result = await VerificationCode.verify(teamId, email, "123456");
      expect(result).toBe(false);

      // Code should be deleted from storage
      const stored = await VerificationCode.retrieve(teamId, email);
      expect(stored).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should remove the stored code", async () => {
      await VerificationCode.store(teamId, email, "123456");
      await VerificationCode.delete(teamId, email);
      const retrieved = await VerificationCode.retrieve(teamId, email);
      expect(retrieved).toBeUndefined();
    });

    it("should reset the attempt counter", async () => {
      await VerificationCode.store(teamId, email, "123456");

      // Use some attempts
      for (let i = 0; i < 5; i++) {
        await VerificationCode.verify(teamId, email, "000000");
      }

      // Delete and re-store
      await VerificationCode.delete(teamId, email);
      await VerificationCode.store(teamId, email, "654321");

      // Should have a fresh set of attempts
      for (let i = 0; i < 9; i++) {
        await VerificationCode.verify(teamId, email, "000000");
      }

      const result = await VerificationCode.verify(teamId, email, "654321");
      expect(result).toBe(true);
    });
  });
});
