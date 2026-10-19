import { queryStringObfuscation } from "./tracer";

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
