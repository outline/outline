import { isDomainBlocked, isEmbedBlockedByDomains } from "./embedBlocklist";
import type { EmbedDescriptor } from "../embeds";

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

describe("isEmbedBlockedByDomains", () => {
  // Mock embed descriptor with a matcher that matches github.com URLs
  // Note: isEmbedBlockedByDomains passes "https://<domain>" without path,
  // so matcher must handle URLs without trailing path
  const githubEmbed: EmbedDescriptor = {
    title: "GitHub",
    icon: () => null,
    matcher: (url: string) => url.match(/^https:\/\/(www\.)?github\.com/),
  } as unknown as EmbedDescriptor;

  // Mock embed descriptor that matches youtube.com URLs
  const youtubeEmbed: EmbedDescriptor = {
    title: "YouTube",
    icon: () => null,
    matcher: (url: string) => url.match(/^https:\/\/(www\.)?youtube\.com\/watch/),
  } as unknown as EmbedDescriptor;

  it("returns true when embed matches a blocked domain", () => {
    expect(isEmbedBlockedByDomains(githubEmbed, ["github.com"])).toBe(true);
  });

  it("returns false when embed does not match any blocked domain", () => {
    expect(isEmbedBlockedByDomains(youtubeEmbed, ["github.com", "linear.app"])).toBe(false);
  });

  it("returns false for empty blockedDomains array", () => {
    expect(isEmbedBlockedByDomains(githubEmbed, [])).toBe(false);
  });

  it("handles matcher that throws an error gracefully", () => {
    const brokenEmbed: EmbedDescriptor = {
      title: "Broken",
      icon: () => null,
      matcher: () => {
        throw new Error("matcher error");
      },
    } as unknown as EmbedDescriptor;

    expect(isEmbedBlockedByDomains(brokenEmbed, ["example.com"])).toBe(false);
  });
});
