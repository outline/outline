import { isDomainBlocked } from "./embedBlocklist";

describe("isDomainBlocked", () => {
  const blockedDomains = ["linear.app", "github.com", "atlassian.net"];

  it("returns true for exact domain match", () => {
    expect(isDomainBlocked("https://linear.app/team/issue", blockedDomains)).toBe(true);
    expect(isDomainBlocked("https://github.com/org/repo", blockedDomains)).toBe(true);
  });

  it("returns true for subdomain match", () => {
    expect(isDomainBlocked("https://myteam.atlassian.net/browse/PROJ-1", blockedDomains)).toBe(true);
    expect(isDomainBlocked("https://api.github.com/repos", blockedDomains)).toBe(true);
  });

  it("returns false for non-blocked domains", () => {
    expect(isDomainBlocked("https://youtube.com/watch?v=123", blockedDomains)).toBe(false);
    expect(isDomainBlocked("https://example.com", blockedDomains)).toBe(false);
  });

  it("returns false for partial domain name matches that are not subdomains", () => {
    // "notlinear.app" should NOT match "linear.app"
    expect(isDomainBlocked("https://notlinear.app/page", blockedDomains)).toBe(false);
    // "mygithub.com" should NOT match "github.com"
    expect(isDomainBlocked("https://mygithub.com/page", blockedDomains)).toBe(false);
  });

  it("handles case insensitivity", () => {
    expect(isDomainBlocked("https://LINEAR.APP/team", blockedDomains)).toBe(true);
    expect(isDomainBlocked("https://GitHub.Com/org/repo", blockedDomains)).toBe(true);
  });

  it("returns false for empty URL", () => {
    expect(isDomainBlocked("", blockedDomains)).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isDomainBlocked("not-a-url", blockedDomains)).toBe(false);
  });

  it("returns false for empty blockedDomains array", () => {
    expect(isDomainBlocked("https://linear.app/issue", [])).toBe(false);
  });
});
