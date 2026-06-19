import { normalizeIp } from "./ip";

describe("normalizeIp", () => {
  it("returns null for nullish or empty input", () => {
    expect(normalizeIp(null)).toBeNull();
    expect(normalizeIp(undefined)).toBeNull();
    expect(normalizeIp("")).toBeNull();
    expect(normalizeIp("   ")).toBeNull();
  });

  it("returns valid IPv4 unchanged", () => {
    expect(normalizeIp("192.168.1.1")).toBe("192.168.1.1");
  });

  it("returns valid IPv6 unchanged", () => {
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
  });

  it("strips ::ffff: IPv4-mapped IPv6 prefix", () => {
    expect(normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
  });

  it("strips IPv6 zone identifier", () => {
    expect(normalizeIp("fe80::1%eth0")).toBe("fe80::1");
  });

  it("takes the first entry from an X-Forwarded-For chain", () => {
    expect(normalizeIp("203.0.113.1, 70.41.3.18, 150.172.238.178")).toBe(
      "203.0.113.1"
    );
  });

  it("returns null for non-IP values", () => {
    expect(normalizeIp("unknown")).toBeNull();
    expect(normalizeIp("not-an-ip")).toBeNull();
    expect(normalizeIp("999.999.999.999")).toBeNull();
  });
});
