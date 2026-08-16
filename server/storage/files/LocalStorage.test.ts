import JWT from "jsonwebtoken";
import { Hour } from "@shared/utils/time";
import env from "@server/env";
import LocalStorage from "./LocalStorage";

describe("LocalStorage", () => {
  describe("getSignedUrl", () => {
    it("should return an identical url for repeated calls", async () => {
      const storage = new LocalStorage();
      const first = await storage.getSignedUrl(
        "uploads/test.png",
        Hour.seconds
      );
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
