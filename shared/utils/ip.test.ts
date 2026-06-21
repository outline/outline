import { isIPv4Address, parseIPv4 } from "./ip";

describe("parseIPv4", () => {
  it("parses valid IPv4 addresses", () => {
    expect(parseIPv4("0.0.0.0")).toBe(0);
    expect(parseIPv4("255.255.255.255")).toBe(4294967295);
    expect(parseIPv4("192.168.1.1")).toBe(3232235777);
  });

  it("trims surrounding whitespace", () => {
    expect(parseIPv4("  192.168.1.1  ")).toBe(parseIPv4("192.168.1.1"));
  });

  it("orders addresses octet-wise within a subnet", () => {
    expect(parseIPv4("192.168.69.9")!).toBeLessThan(
      parseIPv4("192.168.69.10")!
    );
  });

  it("orders addresses octet-wise across subnets", () => {
    expect(parseIPv4("192.168.69.20")!).toBeLessThan(
      parseIPv4("192.168.150.10")!
    );
  });

  it("returns null for invalid input", () => {
    expect(parseIPv4("")).toBeNull();
    expect(parseIPv4("192.168.1")).toBeNull();
    expect(parseIPv4("192.168.1.1.1")).toBeNull();
    expect(parseIPv4("192.168.1.256")).toBeNull();
    expect(parseIPv4("not an ip")).toBeNull();
    expect(parseIPv4("1.2.3.4 ")).toBe(parseIPv4("1.2.3.4"));
    expect(parseIPv4("192.168.1.x")).toBeNull();
  });
});

describe("isIPv4Address", () => {
  it("returns true for valid addresses", () => {
    expect(isIPv4Address("10.0.0.1")).toBe(true);
    expect(isIPv4Address("255.255.255.255")).toBe(true);
  });

  it("returns false for invalid addresses", () => {
    expect(isIPv4Address("256.0.0.1")).toBe(false);
    expect(isIPv4Address("hello")).toBe(false);
    expect(isIPv4Address("")).toBe(false);
  });
});
