import { MentionType, UnfurlResourceType } from "@shared/types";
import { GiteaUtils } from "./GiteaUtils";

const baseUrl = "https://gitea.example.com";

describe("GiteaUtils.parseUrl", () => {
  it("should parse an issue url", () => {
    const url = `${baseUrl}/owner/repo/issues/12`;
    expect(GiteaUtils.parseUrl(url, baseUrl)).toEqual({
      owner: "owner",
      repo: "repo",
      type: UnfurlResourceType.Issue,
      id: 12,
      url,
    });
  });

  it("should parse a pull request url", () => {
    const url = `${baseUrl}/owner/repo/pulls/3/files`;
    expect(GiteaUtils.parseUrl(url, baseUrl)).toEqual({
      owner: "owner",
      repo: "repo",
      type: UnfurlResourceType.PR,
      id: 3,
      url,
    });
  });

  it("should parse a repository url", () => {
    const url = `${baseUrl}/owner/repo/`;
    expect(GiteaUtils.parseUrl(url, baseUrl)).toEqual({
      owner: "owner",
      repo: "repo",
      type: UnfurlResourceType.Project,
      url,
    });
  });

  it("should parse urls on an instance served from a sub-path", () => {
    const base = "https://example.com/gitea/";
    expect(
      GiteaUtils.parseUrl("https://example.com/gitea/owner/repo/issues/1", base)
    ).toMatchObject({ owner: "owner", repo: "repo", id: 1 });
    expect(
      GiteaUtils.parseUrl("https://example.com/owner/repo/issues/1", base)
    ).toBeUndefined();
  });

  it("should return undefined for another host", () => {
    expect(
      GiteaUtils.parseUrl("https://github.com/owner/repo/issues/1", baseUrl)
    ).toBeUndefined();
  });

  it("should return undefined for unsupported paths", () => {
    expect(
      GiteaUtils.parseUrl(`${baseUrl}/owner/repo/src/branch/main`, baseUrl)
    ).toBeUndefined();
    expect(
      GiteaUtils.parseUrl(`${baseUrl}/owner/repo/issues/new`, baseUrl)
    ).toBeUndefined();
    expect(
      GiteaUtils.parseUrl(`${baseUrl}/explore/repos`, baseUrl)
    ).toBeUndefined();
    expect(GiteaUtils.parseUrl(`${baseUrl}/owner`, baseUrl)).toBeUndefined();
    expect(GiteaUtils.parseUrl("not a url", baseUrl)).toBeUndefined();
  });
});

describe("GiteaUtils.mentionType", () => {
  it("should return the mention type for supported urls", () => {
    expect(
      GiteaUtils.mentionType(new URL(`${baseUrl}/o/r/issues/1`), baseUrl)
    ).toEqual(MentionType.Issue);
    expect(
      GiteaUtils.mentionType(new URL(`${baseUrl}/o/r/pulls/1`), baseUrl)
    ).toEqual(MentionType.PullRequest);
    expect(GiteaUtils.mentionType(new URL(`${baseUrl}/o/r`), baseUrl)).toEqual(
      MentionType.Project
    );
  });
});

describe("GiteaUtils.normalizeColor", () => {
  it("should add a leading hash", () => {
    expect(GiteaUtils.normalizeColor("e11d21")).toEqual("#e11d21");
    expect(GiteaUtils.normalizeColor("#e11d21")).toEqual("#e11d21");
    expect(GiteaUtils.normalizeColor(undefined)).toEqual(
      GiteaUtils.defaultLabelColor
    );
  });
});
