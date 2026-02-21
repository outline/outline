import dns from "node:dns";
import env from "@server/env";
import { validateUrlNotPrivate } from "./url";

describe("validateUrlNotPrivate", () => {
  let lookupSpy: jest.SpyInstance;

  beforeEach(() => {
    lookupSpy = jest
      .spyOn(dns.promises, "lookup")
      .mockResolvedValue({ address: "93.184.216.34", family: 4 });
  });

  afterEach(() => {
    lookupSpy.mockRestore();
    env.ALLOWED_PRIVATE_IP_ADDRESSES = undefined;
  });

  it("should allow public IP addresses", async () => {
    lookupSpy.mockResolvedValue({ address: "93.184.216.34", family: 4 });
    await expect(
      validateUrlNotPrivate("https://example.com")
    ).resolves.toBeUndefined();
  });

  it("should reject private IP in URL", async () => {
    await expect(validateUrlNotPrivate("https://10.0.0.1/api")).rejects.toThrow(
      "is not allowed"
    );
  });

  it("should reject URL resolving to private IP", async () => {
    lookupSpy.mockResolvedValue({ address: "192.168.1.1", family: 4 });
    await expect(
      validateUrlNotPrivate("https://internal.example.com")
    ).rejects.toThrow("is not allowed");
  });

  it("should reject loopback address", async () => {
    await expect(
      validateUrlNotPrivate("https://127.0.0.1/api")
    ).rejects.toThrow("is not allowed");
  });

  it("should reject link-local address", async () => {
    lookupSpy.mockResolvedValue({ address: "169.254.169.254", family: 4 });
    await expect(
      validateUrlNotPrivate("https://metadata.internal")
    ).rejects.toThrow("is not allowed");
  });

  describe("with ALLOWED_PRIVATE_IP_ADDRESSES", () => {
    it("should allow exact IP match", async () => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["10.0.0.1"];
      await expect(
        validateUrlNotPrivate("https://10.0.0.1/api")
      ).resolves.toBeUndefined();
    });

    it("should allow IP within CIDR range", async () => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["192.168.1.0/24"];
      lookupSpy.mockResolvedValue({ address: "192.168.1.50", family: 4 });
      await expect(
        validateUrlNotPrivate("https://gitlab.internal")
      ).resolves.toBeUndefined();
    });

    it("should reject IP outside CIDR range", async () => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["192.168.1.0/24"];
      lookupSpy.mockResolvedValue({ address: "192.168.2.1", family: 4 });
      await expect(
        validateUrlNotPrivate("https://gitlab.internal")
      ).rejects.toThrow("is not allowed");
    });

    it("should allow resolved hostname matching allowlist", async () => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["10.0.0.5"];
      lookupSpy.mockResolvedValue({ address: "10.0.0.5", family: 4 });
      await expect(
        validateUrlNotPrivate("https://gitlab.internal")
      ).resolves.toBeUndefined();
    });

    it("should still reject non-matching private IPs", async () => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["10.0.0.1"];
      await expect(
        validateUrlNotPrivate("https://10.0.0.2/api")
      ).rejects.toThrow("is not allowed");
    });

    it("should support multiple entries in allowlist", async () => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["10.0.0.1", "172.16.0.0/12"];
      lookupSpy.mockResolvedValue({ address: "172.20.5.10", family: 4 });
      await expect(
        validateUrlNotPrivate("https://gitlab.internal")
      ).resolves.toBeUndefined();
    });
  });
});
