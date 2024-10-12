import env from "../env";
import { parseDomain, getCookieDomain, slugifyDomain } from "./domains";

// test suite is based on subset of parse-domain module we want to support
// https://github.com/peerigon/parse-domain/blob/master/test/parseDomain.test.js
describe("#parseDomain", () => {
  beforeEach(() => {
    env.URL = "https://example.com";
  });

  it("should remove the protocol", () => {
    expect(parseDomain("http://example.com")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      port: undefined,
      custom: false,
    });
    expect(parseDomain("//example.com")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      port: undefined,
      custom: false,
    });
    expect(parseDomain("https://example.com:3030")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      port: "3030",
      custom: false,
    });
  });

  it("should find team sub-domains", () => {
    expect(parseDomain("myteam.example.com")).toMatchObject({
      teamSubdomain: "myteam",
      host: "myteam.example.com",
      custom: false,
    });
  });

  it("should ignore reserved sub-domains", () => {
    expect(parseDomain("www.example.com")).toMatchObject({
      teamSubdomain: "",
      host: "www.example.com",
      custom: false,
    });
  });

  it("should return the same result when parsing the returned host", () => {
    const customDomain = parseDomain("www.example.com");
    const subDomain = parseDomain("myteam.example.com");
    expect(parseDomain(customDomain.host)).toMatchObject(customDomain);
    expect(parseDomain(subDomain.host)).toMatchObject(subDomain);
  });

  it("should remove the path", () => {
    expect(parseDomain("example.com/some/path?and&query")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      custom: false,
    });
    expect(parseDomain("example.com/")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      custom: false,
    });
  });

  it("should remove the query string", () => {
    expect(parseDomain("www.example.com?and&query")).toMatchObject({
      teamSubdomain: "",
      host: "www.example.com",
      custom: false,
    });
  });

  it("should remove special characters", () => {
    expect(parseDomain("http://example.com\r")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      custom: false,
    });
  });

  it("should remove the port", () => {
    expect(parseDomain("example.com:8080")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      custom: false,
    });
  });

  it("should allow @ characters in the path", () => {
    expect(parseDomain("https://medium.com/@username/")).toMatchObject({
      teamSubdomain: "",
      host: "medium.com",
      custom: true,
    });
  });

  it("should recognize include private domains like blogspot.com as custom", () => {
    expect(parseDomain("foo.blogspot.com")).toMatchObject({
      teamSubdomain: "",
      host: "foo.blogspot.com",
      custom: true,
    });
  });

  it("should also work with the minimum", () => {
    expect(parseDomain("example.com")).toMatchObject({
      teamSubdomain: "",
      host: "example.com",
      custom: false,
    });
  });

  it("should throw a TypeError if the given value is not a valid string", () => {
    expect(() => parseDomain("")).toThrow(TypeError);
  });

  it("should also work with three-level domains like .co.uk", () => {
    env.URL = "https://example.co.uk";
    expect(parseDomain("myteam.example.co.uk")).toMatchObject({
      teamSubdomain: "myteam",
      host: "myteam.example.co.uk",
      custom: false,
    });
  });

  it("should work with custom top-level domains (eg .local)", () => {
    env.URL = "mymachine.local";
    expect(parseDomain("myteam.mymachine.local")).toMatchObject({
      teamSubdomain: "myteam",
      host: "myteam.mymachine.local",
      custom: false,
    });
  });

  it("should work with localhost", () => {
    env.URL = "http://localhost:3000";
    expect(parseDomain("https://localhost:3000/foo/bar?q=12345")).toMatchObject(
      {
        teamSubdomain: "",
        host: "localhost",
        custom: false,
      }
    );
  });

  it("should work with localhost subdomains", () => {
    env.URL = "http://localhost:3000";
    expect(parseDomain("https://www.localhost:3000")).toMatchObject({
      teamSubdomain: "",
      host: "www.localhost",
      custom: false,
    });
    expect(parseDomain("https://myteam.localhost:3000")).toMatchObject({
      teamSubdomain: "myteam",
      host: "myteam.localhost",
      custom: false,
    });
  });
});

describe("#slugifyDomain", () => {
  it("strips the last . delineated segment from strings", () => {
    expect(slugifyDomain("foo.co")).toBe("foo");
    expect(slugifyDomain("foo.co.uk")).toBe("foo-co");
    expect(slugifyDomain("www.foo.co.uk")).toBe("www-foo-co");
  });
});

describe("#getCookieDomain", () => {
  beforeEach(() => {
    env.URL = "https://example.com";
  });

  it("returns the normalized app host when on the host domain", () => {
    expect(getCookieDomain("subdomain.example.com", true)).toBe("example.com");
    expect(getCookieDomain("www.example.com", true)).toBe("example.com");
    expect(getCookieDomain("http://example.com:3000", true)).toBe(
      "example.com"
    );
    expect(
      getCookieDomain("myteam.example.com/document/12345?q=query", true)
    ).toBe("example.com");
  });

  it("returns the input if not on the host domain", () => {
    expect(getCookieDomain("www.blogspot.com", true)).toBe("www.blogspot.com");
    expect(getCookieDomain("anything else", true)).toBe("anything else");
  });

  it("always returns the input when not cloud hosted", () => {
    expect(getCookieDomain("example.com", false)).toBe("example.com");
    expect(getCookieDomain("www.blogspot.com", false)).toBe("www.blogspot.com");
    expect(getCookieDomain("anything else", false)).toBe("anything else");
  });
});
