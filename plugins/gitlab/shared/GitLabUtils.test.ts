import { UnfurlResourceType } from "@shared/types";
import { GitLabUtils } from "./GitLabUtils";

describe("GitLabUtils.parseUrl", () => {
  describe("direct URLs", () => {
    it("should parse an issue URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/issues/39"
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.Issue,
        id: 39,
        url: "https://gitlab.com/speak/purser/-/issues/39",
      });
    });

    it("should parse a merge request URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/merge_requests/12"
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.PR,
        id: 12,
        url: "https://gitlab.com/speak/purser/-/merge_requests/12",
      });
    });

    it("should parse a nested group URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/group/subgroup/repo/-/issues/5"
      );
      expect(result).toEqual({
        owner: "group/subgroup",
        repo: "repo",
        type: UnfurlResourceType.Issue,
        id: 5,
        url: "https://gitlab.com/group/subgroup/repo/-/issues/5",
      });
    });

    it("should return undefined for unsupported resource type", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/pipelines/100"
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined for a URL with too few path segments", () => {
      const result = GitLabUtils.parseUrl("https://gitlab.com/speak/purser");
      expect(result).toBeUndefined();
    });

    it("should return undefined for a mismatched hostname", () => {
      const result = GitLabUtils.parseUrl(
        "https://github.com/speak/purser/-/issues/1"
      );
      expect(result).toBeUndefined();
    });
  });

  describe("base64 show parameter URLs", () => {
    it("should parse an issue URL with show parameter", () => {
      const show = btoa(
        JSON.stringify({ iid: "39", full_path: "speak/purser", id: 1215135 })
      );
      const result = GitLabUtils.parseUrl(
        `https://gitlab.com/speak/purser/-/issues?show=${show}`
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.Issue,
        id: 39,
        url: `https://gitlab.com/speak/purser/-/issues?show=${show}`,
      });
    });

    it("should parse a URL-encoded show parameter", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/issues?show=eyJpaWQiOiIzOSIsImZ1bGxfcGF0aCI6InNwZWFrL3B1cnNlciIsImlkIjoxMjE1MTM1fQ%3D%3D"
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.Issue,
        id: 39,
        url: "https://gitlab.com/speak/purser/-/issues?show=eyJpaWQiOiIzOSIsImZ1bGxfcGF0aCI6InNwZWFrL3B1cnNlciIsImlkIjoxMjE1MTM1fQ%3D%3D",
      });
    });

    it("should parse a merge request URL with show parameter", () => {
      const show = btoa(
        JSON.stringify({ iid: "7", full_path: "speak/purser", id: 999 })
      );
      const result = GitLabUtils.parseUrl(
        `https://gitlab.com/speak/purser/-/merge_requests?show=${show}`
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.PR,
        id: 7,
        url: `https://gitlab.com/speak/purser/-/merge_requests?show=${show}`,
      });
    });

    it("should parse a nested group URL with show parameter", () => {
      const show = btoa(
        JSON.stringify({ iid: "2", full_path: "a/b/repo", id: 500 })
      );
      const result = GitLabUtils.parseUrl(
        `https://gitlab.com/a/b/repo/-/issues?show=${show}`
      );
      expect(result).toEqual({
        owner: "a/b",
        repo: "repo",
        type: UnfurlResourceType.Issue,
        id: 2,
        url: `https://gitlab.com/a/b/repo/-/issues?show=${show}`,
      });
    });

    it("should return undefined for invalid base64 in show parameter", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/issues?show=not-valid-base64!!!"
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined when show parameter has no iid", () => {
      const show = btoa(JSON.stringify({ full_path: "speak/purser", id: 1 }));
      const result = GitLabUtils.parseUrl(
        `https://gitlab.com/speak/purser/-/issues?show=${show}`
      );
      expect(result).toBeUndefined();
    });
  });

  describe("custom GitLab URL", () => {
    it("should parse with a custom URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://git.example.com/team/project/-/issues/10",
        "https://git.example.com"
      );
      expect(result).toEqual({
        owner: "team",
        repo: "project",
        type: UnfurlResourceType.Issue,
        id: 10,
        url: "https://git.example.com/team/project/-/issues/10",
      });
    });

    it("should not match default gitlab.com when custom URL is set", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/issues/1",
        "https://git.example.com"
      );
      expect(result).toBeUndefined();
    });
  });
});
