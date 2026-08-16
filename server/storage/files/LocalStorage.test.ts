import JWT from "jsonwebtoken";
import { Hour } from "@shared/utils/time";
import env from "@server/env";
import LocalStorage from "./LocalStorage";

describe("LocalStorage", () => {
  describe("getSignedUrl", () => {
    // A time deliberately offset from a window boundary, so that rounding is
    // exercised and two calls cannot straddle a boundary.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-16T12:07:31.500Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return an identical url for repeated calls", async () => {
      const storage = new LocalStorage();
      const first = await storage.getSignedUrl(
        "uploads/test.png",
        Hour.seconds
      );

      // Move on within the same window, which is what separates the server
      // rendered page from the API request that follows it.
      vi.setSystemTime(new Date("2026-04-16T12:08:01.500Z"));
      const second = await storage.getSignedUrl(
        "uploads/test.png",
        Hour.seconds
      );

      expect(second).toBe(first);
    });

    it("should return a different url for a different key", async () => {
      const storage = new LocalStorage();
      const first = await storage.getSignedUrl("uploads/one.png", Hour.seconds);
      const second = await storage.getSignedUrl(
        "uploads/two.png",
        Hour.seconds
      );

      expect(second).not.toBe(first);
    });

    it("should return a different url once the window has passed", async () => {
      const storage = new LocalStorage();
      const first = await storage.getSignedUrl(
        "uploads/test.png",
        Hour.seconds
      );

      vi.setSystemTime(new Date("2026-04-16T12:22:31.500Z"));
      const second = await storage.getSignedUrl(
        "uploads/test.png",
        Hour.seconds
      );

      expect(second).not.toBe(first);
    });

    it("should remain valid for at least half of the requested lifetime", async () => {
      const storage = new LocalStorage();
      const url = await storage.getSignedUrl("uploads/test.png", Hour.seconds);
      const sig = new URL(url).searchParams.get("sig");

      const payload = JWT.verify(sig!, env.SECRET_KEY) as { exp: number };
      const remaining = payload.exp - Math.floor(Date.now() / 1000);

      expect(remaining).toBeGreaterThanOrEqual(Hour.seconds / 2);
      expect(remaining).toBeLessThanOrEqual(Hour.seconds);
    });
  });
});
