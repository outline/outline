import env from "@shared/env";
import { toInternalPath, toLinkUrl } from "./linkUrls";

describe("toInternalPath", () => {
  const origin = window.location.origin;

  beforeEach(() => {
    env.URL = origin;
  });

  it("should return the path, search and hash of an internal url", () => {
    expect(toInternalPath(`${origin}/doc/title-abc123defg?x=1#heading`)).toBe(
      "/doc/title-abc123defg?x=1#heading"
    );
  });

  it("should not route external urls", () => {
    expect(toInternalPath("https://example.com/doc/title-abc123defg")).toBe(
      undefined
    );
  });

  it("should not route api urls", () => {
    expect(toInternalPath(`${origin}/api/documents.info`)).toBe(undefined);
  });

  it("should not route a malformed percent-encoding", () => {
    expect(toInternalPath(`${origin}/doc/50%off`)).toBe(undefined);
  });
});

describe("toLinkUrl", () => {
  it("should return urls with a protocol", () => {
    expect(toLinkUrl("https://example.com/page")).toBe(
      "https://example.com/page"
    );
    expect(toLinkUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("should add a protocol to www urls", () => {
    expect(toLinkUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("should not treat titles as urls", () => {
    expect(toLinkUrl("Meeting notes")).toBe(undefined);
    expect(toLinkUrl("example.com")).toBe(undefined);
    expect(toLinkUrl("Notes: https://example.com")).toBe(undefined);
    expect(toLinkUrl("")).toBe(undefined);
  });

  it("should not accept unsafe protocols", () => {
    expect(toLinkUrl("javascript:alert(1)")).toBe(undefined);
  });
});
