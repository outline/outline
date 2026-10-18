import { getQueryStringObfuscation } from "./tracer";

/**
 * Applies the query string obfuscation in the same way as dd-trace.
 *
 * @param query the query string to redact.
 * @returns the redacted query string.
 */
function redact(query: string) {
  const pattern = getQueryStringObfuscation();
  if (!pattern) {
    throw new Error("Query string obfuscation pattern not found");
  }
  return query.replace(new RegExp(pattern, "gi"), "<redacted>");
}

describe("getQueryStringObfuscation", () => {
  afterEach(() => {
    delete process.env.DD_TRACE_OBFUSCATION_QUERY_STRING_REGEXP;
  });

  it("should extend the dd-trace default pattern", () => {
    expect(getQueryStringObfuscation()).toContain("bearer");
  });

  it("should redact the OAuth authorization code", () => {
    expect(redact("code=1.AU8Ap2dh&session_state=009b")).toEqual(
      "<redacted>&session_state=009b"
    );
    expect(redact("id=cf72&code=xyz")).toEqual("id=cf72&<redacted>");
  });

  it("should not redact parameters that end in code", () => {
    expect(redact("barcode=123&id=abc")).toEqual("barcode=123&id=abc");
  });

  it("should still redact values covered by the dd-trace default", () => {
    expect(redact("token=abc&page=2")).toEqual("<redacted>&page=2");
    expect(redact("state=eyJhbGciOi.eyJzdWIi.sig")).toEqual("state=<redacted>");
  });

  it("should extend a pattern configured in the environment", () => {
    process.env.DD_TRACE_OBFUSCATION_QUERY_STRING_REGEXP = "secret=[^&]+";

    expect(redact("secret=a&code=b&token=c")).toEqual(
      "<redacted>&<redacted>&token=c"
    );
  });
});
