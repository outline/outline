import env from "@shared/env";
import { toInternalPath } from "./internalLinks";

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
