import type { APIContext } from "@server/types";
import { getExpectedOrigin } from "./passkeys";

describe("getExpectedOrigin", () => {
  // Helper to mock APIContext for testing
  const createMockContext = (options: {
    protocol: string;
    hostname: string;
    host: string;
    forwardedPort?: string;
  }): APIContext => ({
    protocol: options.protocol,
    request: {
      hostname: options.hostname,
      host: options.host,
      get: (header: string) => {
        if (header === "X-Forwarded-Port" && options.forwardedPort) {
          return options.forwardedPort;
        }
        return undefined;
      },
    } as unknown,
  }) as unknown as APIContext;

  it("should construct origin with non-standard HTTPS port from X-Forwarded-Port", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com", // Without port (from X-Forwarded-Host)
      forwardedPort: "10081",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com:10081");
  });

  it("should construct origin without port for standard HTTPS port (443)", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com",
      forwardedPort: "443",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com");
  });

  it("should construct origin without port for standard HTTP port (80)", () => {
    const ctx = createMockContext({
      protocol: "http",
      hostname: "outline.example.com",
      host: "outline.example.com",
      forwardedPort: "80",
    });

    expect(getExpectedOrigin(ctx)).toBe("http://outline.example.com");
  });

  it("should use host with port when X-Forwarded-Port is not present", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com:8443",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com:8443");
  });

  it("should construct origin without port when not in host and no X-Forwarded-Port", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com");
  });

  it("should handle HTTP with non-standard port", () => {
    const ctx = createMockContext({
      protocol: "http",
      hostname: "outline.example.com",
      host: "outline.example.com",
      forwardedPort: "8080",
    });

    expect(getExpectedOrigin(ctx)).toBe("http://outline.example.com:8080");
  });
});
