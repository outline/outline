import { OAuthClient } from "@server/models";

describe("IsUrlList", () => {
  const validateUrls = (redirectUris: string[]) =>
    OAuthClient.build({ redirectUris }).validate({ fields: ["redirectUris"] });

  it("should allow http and https urls", async () => {
    await expect(
      validateUrls(["https://example.com/callback", "http://localhost:8080"])
    ).resolves.toBeTruthy();
  });

  it("should allow urls without a top-level domain", async () => {
    await expect(
      validateUrls(["https://internal/callback"])
    ).resolves.toBeTruthy();
  });

  it("should allow private-use schemes for native apps", async () => {
    await expect(
      validateUrls(["com.example.app:/oauth2redirect", "myapp://callback"])
    ).resolves.toBeTruthy();
  });

  it("should reject schemes that can execute or embed content", async () => {
    await expect(validateUrls(["javascript:alert(1)"])).rejects.toThrow();
    await expect(validateUrls(["data:text/html,hi"])).rejects.toThrow();
    await expect(validateUrls(["file:///etc/passwd"])).rejects.toThrow();
  });

  it("should reject urls without a protocol", async () => {
    await expect(validateUrls(["callback"])).rejects.toThrow();
    await expect(validateUrls(["example.com/callback"])).rejects.toThrow();
  });

  it("should reject a private-use scheme without a destination", async () => {
    await expect(validateUrls(["myapp:"])).rejects.toThrow();
    await expect(validateUrls(["myapp:/"])).rejects.toThrow();
  });

  it("should reject duplicate urls", async () => {
    await expect(
      validateUrls(["myapp://callback", "myapp://callback"])
    ).rejects.toThrow();
  });
});
