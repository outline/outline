import env from "@server/env";
import { WebhookSubscription } from "@server/models";

describe("IsUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validateUrl = (url: string) =>
    WebhookSubscription.build({ url }).validate({ fields: ["url"] });

  describe("when cloud hosted", () => {
    beforeEach(() => {
      vi.spyOn(env, "isCloudHosted", "get").mockReturnValue(true);
    });

    it("should allow urls with a top-level domain", async () => {
      await expect(validateUrl("https://example.com")).resolves.toBeTruthy();
    });

    it("should reject urls without a top-level domain", async () => {
      await expect(validateUrl("https://webhook")).rejects.toThrow();
    });
  });

  describe("self hosted", () => {
    beforeEach(() => {
      vi.spyOn(env, "isCloudHosted", "get").mockReturnValue(false);
    });

    it("should allow urls with a top-level domain", async () => {
      await expect(validateUrl("https://example.com")).resolves.toBeTruthy();
    });

    it("should allow urls without a top-level domain", async () => {
      await expect(validateUrl("http://webhook")).resolves.toBeTruthy();
    });
  });

  it("should reject urls without a protocol", async () => {
    await expect(validateUrl("example.com")).rejects.toThrow();
  });

  it("should reject non-http protocols", async () => {
    await expect(validateUrl("ftp://example.com")).rejects.toThrow();
  });
});
