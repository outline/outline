import { randomString } from "@shared/random";
import { buildShare } from "@server/test/factories";
import ShareSubscription from "./ShareSubscription";

describe("ShareSubscription", () => {
  describe("generateConfirmToken / generateUnsubscribeToken", () => {
    it("should produce deterministic tokens", async () => {
      const share = await buildShare();
      const subscription = await ShareSubscription.create({
        shareId: share.id,
        email: "test@example.com",
        emailFingerprint: "test@example.com",
        secret: randomString(32),
      });

      const token1 = ShareSubscription.generateConfirmToken(subscription);
      const token2 = ShareSubscription.generateConfirmToken(subscription);
      expect(token1).toBe(token2);
    });

    it("should produce different tokens for confirm vs unsubscribe", async () => {
      const share = await buildShare();
      const subscription = await ShareSubscription.create({
        shareId: share.id,
        email: "test@example.com",
        emailFingerprint: "test@example.com",
        secret: randomString(32),
      });

      const confirmToken = ShareSubscription.generateConfirmToken(subscription);
      const unsubscribeToken =
        ShareSubscription.generateUnsubscribeToken(subscription);
      expect(confirmToken).not.toBe(unsubscribeToken);
    });

    it("should produce different tokens for different secrets", async () => {
      const share = await buildShare();
      const sub1 = await ShareSubscription.create({
        shareId: share.id,
        email: "test@example.com",
        emailFingerprint: "test@example.com",
        secret: randomString(32),
      });
      const sub2 = await ShareSubscription.create({
        shareId: share.id,
        email: "test2@example.com",
        emailFingerprint: "test2@example.com",
        secret: randomString(32),
      });

      expect(ShareSubscription.generateConfirmToken(sub1)).not.toBe(
        ShareSubscription.generateConfirmToken(sub2)
      );
    });
  });

  describe("normalizeEmailFingerprint", () => {
    it("should lowercase the email", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("User@Example.COM")
      ).toBe("user@example.com");
    });

    it("should remove dots from local part", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("first.last@example.com")
      ).toBe("firstlast@example.com");
    });

    it("should strip +alias from local part", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user+tag@example.com")
      ).toBe("user@example.com");
    });

    it("should handle dots and +alias together", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint(
          "first.last+newsletter@example.com"
        )
      ).toBe("firstlast@example.com");
    });

    it("should not remove dots from domain", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user@sub.example.com")
      ).toBe("user@sub.example.com");
    });

    it("should trim whitespace", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("  user@example.com  ")
      ).toBe("user@example.com");
    });

    it("should normalize googlemail.com to gmail.com", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user@googlemail.com")
      ).toBe("user@gmail.com");
    });

    it("should treat gmail.com and googlemail.com as equivalent", () => {
      const gmail = ShareSubscription.normalizeEmailFingerprint(
        "first.last+tag@gmail.com"
      );
      const googlemail = ShareSubscription.normalizeEmailFingerprint(
        "first.last+tag@googlemail.com"
      );
      expect(gmail).toBe(googlemail);
      expect(gmail).toBe("firstlast@gmail.com");
    });

    it("should not alter other domains ending in googlemail.com", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user@notgooglemail.com")
      ).toBe("user@notgooglemail.com");
    });

    it("should handle email without @ gracefully", () => {
      expect(ShareSubscription.normalizeEmailFingerprint("invalid")).toBe(
        "invalid"
      );
    });

    it("should strip null bytes to prevent injection bypasses", () => {
      const normal =
        ShareSubscription.normalizeEmailFingerprint("user@example.com");
      const withNull =
        ShareSubscription.normalizeEmailFingerprint("user\0@example.com");
      expect(withNull).toBe(normal);
    });
  });

  describe("checkIPLimit", () => {
    beforeEach(async () => {
      await ShareSubscription.destroy({ where: {}, force: true });
    });

    it("should allow up to 5 unique emails from the same IP", async () => {
      const share = await buildShare();
      const ip = "192.168.1.1";

      for (let i = 0; i < 5; i++) {
        await ShareSubscription.create({
          shareId: share.id,
          email: `user${i}@example.com`,
          emailFingerprint: `user${i}@example.com`,
          secret: randomString(32),
          ipAddress: ip,
        });
      }

      await expect(
        ShareSubscription.create({
          shareId: share.id,
          email: "user5@example.com",
          emailFingerprint: "user5@example.com",
          secret: randomString(32),
          ipAddress: ip,
        })
      ).rejects.toThrow("limit");
    });

    it("should not count subscriptions from different IPs", async () => {
      const share = await buildShare();

      for (let i = 0; i < 5; i++) {
        await ShareSubscription.create({
          shareId: share.id,
          email: `user${i}@example.com`,
          emailFingerprint: `user${i}@example.com`,
          secret: randomString(32),
          ipAddress: `10.0.0.${i}`,
        });
      }

      await expect(
        ShareSubscription.create({
          shareId: share.id,
          email: "user5@example.com",
          emailFingerprint: "user5@example.com",
          secret: randomString(32),
          ipAddress: "10.0.0.5",
        })
      ).resolves.toBeDefined();
    });

    it("should not count duplicate fingerprints from the same IP", async () => {
      const share1 = await buildShare();
      const share2 = await buildShare();
      const ip = "192.168.2.1";

      // Same fingerprint across different shares — should count as 1
      for (let i = 0; i < 3; i++) {
        const share = await buildShare();
        await ShareSubscription.create({
          shareId: share.id,
          email: "same@example.com",
          emailFingerprint: "same@example.com",
          secret: randomString(32),
          ipAddress: ip,
        });
      }

      // 4 more unique fingerprints — total distinct = 5
      for (let i = 0; i < 4; i++) {
        await ShareSubscription.create({
          shareId: share1.id,
          email: `other${i}@example.com`,
          emailFingerprint: `other${i}@example.com`,
          secret: randomString(32),
          ipAddress: ip,
        });
      }

      // 6th unique fingerprint should be blocked
      await expect(
        ShareSubscription.create({
          shareId: share2.id,
          email: "blocked@example.com",
          emailFingerprint: "blocked@example.com",
          secret: randomString(32),
          ipAddress: ip,
        })
      ).rejects.toThrow("limit");
    });

    it("should skip the check if ipAddress is null", async () => {
      const share = await buildShare();

      for (let i = 0; i < 6; i++) {
        await ShareSubscription.create({
          shareId: share.id,
          email: `user${i}@example.com`,
          emailFingerprint: `user${i}@example.com`,
          secret: randomString(32),
        });
      }
    });
  });
});
