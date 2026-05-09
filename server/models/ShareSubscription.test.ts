import { randomString } from "@shared/random";
import { buildDocument, buildShare } from "@server/test/factories";
import ShareSubscription from "./ShareSubscription";

describe("ShareSubscription", () => {
  describe("generateConfirmToken / generateUnsubscribeToken", () => {
    it("should produce deterministic tokens", async () => {
      const document = await buildDocument();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
      });
      const subscription = await ShareSubscription.create({
        shareId: share.id,
        documentId: document.id,
        email: "test@example.com",
        emailFingerprint: "test@example.com",
        secret: randomString(32),
      });

      const token1 = ShareSubscription.generateConfirmToken(subscription);
      const token2 = ShareSubscription.generateConfirmToken(subscription);
      expect(token1).toBe(token2);
    });

    it("should produce different tokens for confirm vs unsubscribe", async () => {
      const document = await buildDocument();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
      });
      const subscription = await ShareSubscription.create({
        shareId: share.id,
        documentId: document.id,
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
      const document = await buildDocument();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
      });
      const sub1 = await ShareSubscription.create({
        shareId: share.id,
        documentId: document.id,
        email: "test@example.com",
        emailFingerprint: "test@example.com",
        secret: randomString(32),
      });
      const document2 = await buildDocument({ teamId: document.teamId });
      const sub2 = await ShareSubscription.create({
        shareId: share.id,
        documentId: document2.id,
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
    it("should return a hex hash string", () => {
      const fp =
        ShareSubscription.normalizeEmailFingerprint("user@example.com");
      expect(fp).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should treat different cases as equivalent", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("User@Example.COM")
      ).toBe(ShareSubscription.normalizeEmailFingerprint("user@example.com"));
    });

    it("should remove dots from Gmail local part", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("first.last@gmail.com")
      ).toBe(
        ShareSubscription.normalizeEmailFingerprint("firstlast@gmail.com")
      );
    });

    it("should preserve dots for non-Gmail domains", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("first.last@example.com")
      ).not.toBe(
        ShareSubscription.normalizeEmailFingerprint("firstlast@example.com")
      );
    });

    it("should strip +alias from local part", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user+tag@example.com")
      ).toBe(ShareSubscription.normalizeEmailFingerprint("user@example.com"));
    });

    it("should handle dots and +alias together for Gmail", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint(
          "first.last+newsletter@gmail.com"
        )
      ).toBe(
        ShareSubscription.normalizeEmailFingerprint("firstlast@gmail.com")
      );
    });

    it("should not remove dots from domain", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user@sub.example.com")
      ).not.toBe(
        ShareSubscription.normalizeEmailFingerprint("user@subexample.com")
      );
    });

    it("should trim whitespace", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("  user@example.com  ")
      ).toBe(ShareSubscription.normalizeEmailFingerprint("user@example.com"));
    });

    it("should treat gmail.com and googlemail.com as equivalent", () => {
      const gmail = ShareSubscription.normalizeEmailFingerprint(
        "first.last+tag@gmail.com"
      );
      const googlemail = ShareSubscription.normalizeEmailFingerprint(
        "first.last+tag@googlemail.com"
      );
      expect(gmail).toBe(googlemail);
    });

    it("should not alter other domains ending in googlemail.com", () => {
      expect(
        ShareSubscription.normalizeEmailFingerprint("user@notgooglemail.com")
      ).not.toBe(ShareSubscription.normalizeEmailFingerprint("user@gmail.com"));
    });

    it("should handle email without @ gracefully", () => {
      const fp = ShareSubscription.normalizeEmailFingerprint("invalid");
      expect(fp).toMatch(/^[0-9a-f]{64}$/);
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

    it("should allow up to 3 unique emails from the same IP", async () => {
      const ip = "192.168.1.1";

      for (let i = 0; i < 3; i++) {
        const document = await buildDocument();
        const share = await buildShare({
          documentId: document.id,
          teamId: document.teamId,
        });
        await ShareSubscription.create({
          shareId: share.id,
          documentId: document.id,
          email: `user${i}@example.com`,
          emailFingerprint: `user${i}@example.com`,
          secret: randomString(32),
          ipAddress: ip,
        });
      }

      const document = await buildDocument();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
      });
      await expect(
        ShareSubscription.create({
          shareId: share.id,
          documentId: document.id,
          email: "user3@example.com",
          emailFingerprint: "user3@example.com",
          secret: randomString(32),
          ipAddress: ip,
        })
      ).rejects.toThrow("limit");
    });

    it("should not count subscriptions from different IPs", async () => {
      for (let i = 0; i < 3; i++) {
        const document = await buildDocument();
        const share = await buildShare({
          documentId: document.id,
          teamId: document.teamId,
        });
        await ShareSubscription.create({
          shareId: share.id,
          documentId: document.id,
          email: `user${i}@example.com`,
          emailFingerprint: `user${i}@example.com`,
          secret: randomString(32),
          ipAddress: `10.0.0.${i}`,
        });
      }

      const document = await buildDocument();
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
      });
      await expect(
        ShareSubscription.create({
          shareId: share.id,
          documentId: document.id,
          email: "user3@example.com",
          emailFingerprint: "user3@example.com",
          secret: randomString(32),
          ipAddress: "10.0.0.3",
        })
      ).resolves.toBeDefined();
    });

    it("should not count duplicate fingerprints from the same IP", async () => {
      const document1 = await buildDocument();
      const share1 = await buildShare({
        documentId: document1.id,
        teamId: document1.teamId,
      });
      const document2 = await buildDocument();
      const share2 = await buildShare({
        documentId: document2.id,
        teamId: document2.teamId,
      });
      const ip = "192.168.2.1";

      // Same fingerprint across different shares — should count as 1
      for (let i = 0; i < 3; i++) {
        const doc = await buildDocument();
        const share = await buildShare({
          documentId: doc.id,
          teamId: doc.teamId,
        });
        await ShareSubscription.create({
          shareId: share.id,
          documentId: doc.id,
          email: "same@example.com",
          emailFingerprint: "same@example.com",
          secret: randomString(32),
          ipAddress: ip,
        });
      }

      // 2 more unique fingerprints — total distinct = 3
      for (let i = 0; i < 2; i++) {
        const doc = await buildDocument();
        await ShareSubscription.create({
          shareId: share1.id,
          documentId: doc.id,
          email: `other${i}@example.com`,
          emailFingerprint: `other${i}@example.com`,
          secret: randomString(32),
          ipAddress: ip,
        });
      }

      // 4th unique fingerprint should be blocked
      await expect(
        ShareSubscription.create({
          shareId: share2.id,
          documentId: document2.id,
          email: "blocked@example.com",
          emailFingerprint: "blocked@example.com",
          secret: randomString(32),
          ipAddress: ip,
        })
      ).rejects.toThrow("limit");
    });

    it("should skip the check if ipAddress is null", async () => {
      for (let i = 0; i < 6; i++) {
        const document = await buildDocument();
        const share = await buildShare({
          documentId: document.id,
          teamId: document.teamId,
        });
        await ShareSubscription.create({
          shareId: share.id,
          documentId: document.id,
          email: `user${i}@example.com`,
          emailFingerprint: `user${i}@example.com`,
          secret: randomString(32),
        });
      }
    });
  });
});
