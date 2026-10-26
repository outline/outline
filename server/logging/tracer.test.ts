import { applyForwardedHost, queryStringObfuscation } from "./tracer";

/**
 * Applies the query string obfuscation in the same way as dd-trace.
 *
 * @param query the query string to redact.
 * @returns the redacted query string.
 */
function redact(query: string) {
  return query.replace(new RegExp(queryStringObfuscation, "gi"), "<redacted>");
}

describe("queryStringObfuscation", () => {
  it("should redact the values of parameters that are not allowed", () => {
    expect(redact("code=1.AU8A&state=eyJhbGciOi.eyJzdWIi.sig")).toEqual(
      "code=<redacted>&state=<redacted>"
    );
    expect(redact("id=cf72&token=abc")).toEqual("id=cf72&token=<redacted>");
  });

  it("should keep the values of allowed parameters", () => {
    expect(
      redact("error=access_denied&error_description=User+cancelled")
    ).toEqual("error=access_denied&error_description=User+cancelled");
    expect(redact("limit=25&offset=50")).toEqual("limit=25&offset=50");
  });

  it("should only allow exact parameter names", () => {
    expect(redact("idx=1&errors=2&barcode=3")).toEqual(
      "idx=<redacted>&errors=<redacted>&barcode=<redacted>"
    );
  });

  it("should redact the whole value when it contains an equals sign", () => {
    expect(redact("sig=abc==&id=1")).toEqual("sig=<redacted>&id=1");
    expect(redact("error=a=b")).toEqual("error=a=b");
  });
});

describe("applyForwardedHost", () => {
  it("should replace the host with the forwarded host", () => {
    expect(
      applyForwardedHost("http://app.getoutline.com/", "docs.example.com")
    ).toEqual("http://docs.example.com/");
    expect(
      applyForwardedHost(
        "http://app.getoutline.com:3000/s/abc?token=<redacted>",
        "docs.example.com:8080"
      )
    ).toEqual("http://docs.example.com:8080/s/abc?token=<redacted>");
  });

  it("should use the first value of a forwarded host list", () => {
    expect(
      applyForwardedHost(
        "http://app.getoutline.com/",
        "docs.example.com, proxy.internal"
      )
    ).toEqual("http://docs.example.com/");
    expect(
      applyForwardedHost("http://app.getoutline.com/", [
        "docs.example.com",
        "proxy.internal",
      ])
    ).toEqual("http://docs.example.com/");
  });

  it("should keep the url when the forwarded host is missing or invalid", () => {
    const url = "http://app.getoutline.com/";
    expect(applyForwardedHost(url, undefined)).toEqual(url);
    expect(applyForwardedHost(url, "")).toEqual(url);
    expect(applyForwardedHost(url, "evil.com/path")).toEqual(url);
    expect(applyForwardedHost(url, "evil.com@x")).toEqual(url);
    expect(applyForwardedHost(url, "docs.example.com:abc")).toEqual(url);
    expect(applyForwardedHost(url, "docs.example.com:99999")).toEqual(url);
    expect(applyForwardedHost(url, "[not-ip]")).toEqual(url);
    expect(applyForwardedHost(url, "[::1")).toEqual(url);
  });

  it("should accept IPv6 literals", () => {
    expect(
      applyForwardedHost("http://app.getoutline.com/", "[::1]:3000")
    ).toEqual("http://[::1]:3000/");
  });
});
