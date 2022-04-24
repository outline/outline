import { stripSubdomain, parseDomain, isHostedSubdomain } from "./domains";
// test suite is based on subset of parse-domain module we want to support
// https://github.com/peerigon/parse-domain/blob/master/test/parseDomain.test.js
describe("#parseDomain", () => {
  beforeEach(() => {
    process.env.URL = "https://example.com";
  });

  it("should remove the protocol", () => {
    expect(parseDomain("http://example.com")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
    expect(parseDomain("//example.com")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
    expect(parseDomain("https://example.com")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
  });

  it("should remove sub-domains", () => {
    expect(parseDomain("www.example.com")).toMatchObject({
      subdomain: "www",
      domain: "example.com",
    });
  });

  it("should remove the path", () => {
    expect(parseDomain("example.com/some/path?and&query")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
    expect(parseDomain("example.com/")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
  });

  it("should remove the query string", () => {
    expect(parseDomain("example.com?and&query")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
  });

  it("should remove special characters", () => {
    expect(parseDomain("http://m.example.com\r")).toMatchObject({
      subdomain: "m",
      domain: "example.com",
    });
  });

  it("should remove the port", () => {
    expect(parseDomain("example.com:8080")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
  });

  it("should allow @ characters in the path", () => {
    expect(parseDomain("https://medium.com/@username/")).toMatchObject({
      subdomain: "",
      domain: "medium.com",
    });
  });

  it("should not include private domains like blogspot.com by default", () => {
    expect(parseDomain("foo.blogspot.com")).toMatchObject({
      subdomain: "",
      domain: "foo.blogspot.com",
    });
  });

  it("should also work with the minimum", () => {
    expect(parseDomain("example.com")).toMatchObject({
      subdomain: "",
      domain: "example.com",
    });
  });

  it("should return null if the given value is not a valid string", () => {
    expect(parseDomain(undefined)).toBe(null);
    expect(parseDomain("")).toBe(null);
  });

  it("should also work with three-level domains like .co.uk", () => {
    process.env.URL = "https://example.co.uk";
    expect(parseDomain("www.example.co.uk")).toMatchObject({
      subdomain: "www",
      domain: "example.co.uk",
    });
  });

  it("should work with custom top-level domains (eg .local)", () => {
    process.env.URL = "mymachine.local";
    expect(parseDomain("mymachine.local")).toMatchObject({
      subdomain: "",
      domain: "mymachine.local",
    });
  });

  it("should work with localhost", () => {
    process.env.URL = "http://localhost:3000";
    expect(parseDomain("https://localhost:3000")).toMatchObject({
      subdomain: "",
      domain: "localhost",
    });
  });

  it("should work with localhost subdomains", () => {
    process.env.URL = "http://localhost:3000";
    expect(parseDomain("https://www.localhost:3000")).toMatchObject({
      subdomain: "www",
      domain: "localhost",
    });
  });
});

describe("#stripSubdomain", () => {
  beforeEach(() => {
    process.env.URL = "https://example.com";
  });

  test("to return domains without a subdomain", () => {
    expect(stripSubdomain("example")).toBe("example");
    expect(stripSubdomain("example.com")).toBe("example.com");
    expect(stripSubdomain("example.com:3000")).toBe("example.com");
  });

  test("to remove subdomains", () => {
    expect(stripSubdomain("test.example.com")).toBe("example.com");
    expect(stripSubdomain("test.example.com:3000")).toBe("example.com");
  });

  test("to work with localhost", () => {
    process.env.URL = "http://localhost:3000";
    expect(stripSubdomain("localhost")).toBe("localhost");
    expect(stripSubdomain("foo.localhost")).toBe("localhost");
  });
});

describe("#isHostedSubdomain", () => {
  beforeEach(() => {
    process.env.URL = "https://example.com";
  });

  test("to return false for domains without a subdomain", () => {
    expect(isHostedSubdomain("example")).toBe(false);
    expect(isHostedSubdomain("example.com")).toBe(false);
    expect(isHostedSubdomain("example.org:3000")).toBe(false);
  });

  test("to return false for www", () => {
    expect(isHostedSubdomain("www.example.com")).toBe(false);
    expect(isHostedSubdomain("www.example.com:3000")).toBe(false);
  });

  test("to return true for subdomains", () => {
    expect(isHostedSubdomain("test.example.com")).toBe(true);
    expect(isHostedSubdomain("test.example.com:3000")).toBe(true);
  });

  test("to work with localhost", () => {
    process.env.URL = "http://localhost:3000";
    expect(isHostedSubdomain("localhost")).toBe(false);
    expect(isHostedSubdomain("foo.localhost")).toBe(true);
  });
});
