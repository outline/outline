import { UnfurlResourceType } from "@shared/types";
import { GitLabUtils } from "./GitLabUtils";

describe("GitLabUtils.sanitizeGitLabMarkdown", () => {
  it("should return null for null/undefined/empty input", () => {
    expect(GitLabUtils.sanitizeGitLabMarkdown(null)).toBeNull();
    expect(GitLabUtils.sanitizeGitLabMarkdown(undefined)).toBeNull();
    expect(GitLabUtils.sanitizeGitLabMarkdown("")).toBeNull();
  });

  it("should return null when only unsupported syntax remains", () => {
    expect(
      GitLabUtils.sanitizeGitLabMarkdown("<!-- only a comment -->")
    ).toBeNull();
  });

  it("should pass through standard markdown unchanged", () => {
    const md = "# Hello\n\nSome **bold** and *italic* text.";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe(md);
  });

  it("should strip YAML front matter", () => {
    const md = "---\ntitle: Test\nauthor: Name\n---\n# Real content";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("# Real content");
  });

  it("should strip YAML front matter with CRLF line endings", () => {
    const md = "---\r\ntitle: Test\r\nauthor: Name\r\n---\r\n# Real content";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("# Real content");
  });

  it("should not strip --- that is not front matter", () => {
    const md = "Some text\n---\nMore text";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe(md);
  });

  it("should strip single-line HTML comments", () => {
    const md = "Before <!-- comment --> After";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("Before  After");
  });

  it("should strip multi-line HTML comments", () => {
    const md = "Before\n<!-- \nthis is\na comment\n-->\nAfter";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("Before\n\nAfter");
  });

  it("should strip overlapping HTML comment patterns", () => {
    const md = "Before <!<!-- inner -->-- outer --> After";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("Before  After");
  });

  it("should convert collapsible sections to bold heading + content", () => {
    const md =
      "<details>\n<summary>Click me</summary>\nHidden content\n</details>";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe(
      "**Click me**\n\nHidden content"
    );
  });

  it("should strip [[_TOC_]] markers", () => {
    const md = "[[_TOC_]]\n\n# Heading";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("# Heading");
  });

  it("should strip [TOC] markers", () => {
    const md = "[TOC]\n\n# Heading";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("# Heading");
  });

  it("should convert inline diff additions to plain text", () => {
    expect(GitLabUtils.sanitizeGitLabMarkdown("This is {+added+} text")).toBe(
      "This is added text"
    );
  });

  it("should convert inline diff additions containing + characters", () => {
    expect(GitLabUtils.sanitizeGitLabMarkdown("Formula: {+a+b+c+}")).toBe(
      "Formula: a+b+c"
    );
  });

  it("should convert inline diff deletions to strikethrough", () => {
    expect(GitLabUtils.sanitizeGitLabMarkdown("This is [-removed-] text")).toBe(
      "This is ~~removed~~ text"
    );
  });

  it("should strip multiline blockquote markers", () => {
    const md = ">>>\nQuoted line 1\nQuoted line 2\n>>>";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe(
      "Quoted line 1\nQuoted line 2"
    );
  });

  it("should strip footnote definitions", () => {
    const md = "Some text[^1]\n\n[^1]: This is a footnote";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("Some text");
  });

  it("should strip footnote references", () => {
    const md = "Some text[^note] and more[^1] text";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe(
      "Some text and more text"
    );
  });

  it("should strip include directives", () => {
    const md = "# Title\n\n::include{file=chapter1.md}\n\nMore text";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("# Title\n\nMore text");
  });

  it("should collapse excessive blank lines", () => {
    const md = "Line 1\n\n\n\n\nLine 2";
    expect(GitLabUtils.sanitizeGitLabMarkdown(md)).toBe("Line 1\n\nLine 2");
  });

  it("should handle a realistic GitLab template with multiple features", () => {
    const md = [
      "---",
      "title: Bug Report",
      "---",
      "<!-- Please fill out this template -->",
      "[[_TOC_]]",
      "",
      "## Description",
      "",
      "This feature was {+added+} in v2 and [-removed-] in v3.",
      "",
      "<details>",
      "<summary>Steps to reproduce</summary>",
      "1. Go to page",
      "2. Click button",
      "</details>",
      "",
      "See also[^1].",
      "",
      "[^1]: Some reference",
    ].join("\n");

    const result = GitLabUtils.sanitizeGitLabMarkdown(md);
    expect(result).toBe(
      [
        "## Description",
        "",
        "This feature was added in v2 and ~~removed~~ in v3.",
        "",
        "**Steps to reproduce**",
        "",
        "1. Go to page",
        "2. Click button",
        "",
        "See also.",
      ].join("\n")
    );
  });
});

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

    it("should parse a work_items URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/work_items/39"
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.Issue,
        id: 39,
        url: "https://gitlab.com/speak/purser/-/work_items/39",
      });
    });

    it("should parse a nested group work_items URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/group/subgroup/repo/-/work_items/5"
      );
      expect(result).toEqual({
        owner: "group/subgroup",
        repo: "repo",
        type: UnfurlResourceType.Issue,
        id: 5,
        url: "https://gitlab.com/group/subgroup/repo/-/work_items/5",
      });
    });

    it("should return undefined for unsupported resource type", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/pipelines/100"
      );
      expect(result).toBeUndefined();
    });

    it("should parse a project URL", () => {
      const result = GitLabUtils.parseUrl("https://gitlab.com/speak/purser");
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.Project,
        url: "https://gitlab.com/speak/purser",
      });
    });

    it("should return undefined for a URL with too few path segments", () => {
      const result = GitLabUtils.parseUrl("https://gitlab.com/speak");
      expect(result).toBeUndefined();
    });

    it("should return undefined for a mismatched hostname", () => {
      const result = GitLabUtils.parseUrl(
        "https://github.com/speak/purser/-/issues/1"
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined for an issues list URL without an ID", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/speak/purser/-/issues"
      );
      expect(result).toBeUndefined();
    });

    it("should parse a nested group project URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.com/group/subgroup/repo"
      );
      expect(result).toEqual({
        owner: "group/subgroup",
        repo: "repo",
        type: UnfurlResourceType.Project,
        url: "https://gitlab.com/group/subgroup/repo",
      });
    });

    it("should return undefined for an invalid custom URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://gitlab.example.com/team/project/-/issues/10",
        "not-a-valid-url"
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined for system paths", () => {
      expect(
        GitLabUtils.parseUrl("https://gitlab.com/explore/projects")
      ).toBeUndefined();
      expect(
        GitLabUtils.parseUrl("https://gitlab.com/help/topics")
      ).toBeUndefined();
      expect(
        GitLabUtils.parseUrl("https://gitlab.com/admin/users")
      ).toBeUndefined();
      expect(
        GitLabUtils.parseUrl("https://gitlab.com/dashboard/projects")
      ).toBeUndefined();
      expect(
        GitLabUtils.parseUrl("https://gitlab.com/users/someone")
      ).toBeUndefined();
      expect(
        GitLabUtils.parseUrl("https://gitlab.com/groups/mygroup")
      ).toBeUndefined();
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

    it("should parse a work_items URL with show parameter", () => {
      const show = btoa(
        JSON.stringify({ iid: "39", full_path: "speak/purser", id: 1215135 })
      );
      const result = GitLabUtils.parseUrl(
        `https://gitlab.com/speak/purser/-/work_items?show=${show}`
      );
      expect(result).toEqual({
        owner: "speak",
        repo: "purser",
        type: UnfurlResourceType.Issue,
        id: 39,
        url: `https://gitlab.com/speak/purser/-/work_items?show=${show}`,
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

    it("should parse a project URL with a custom URL", () => {
      const result = GitLabUtils.parseUrl(
        "https://git.example.com/team/project",
        "https://git.example.com"
      );
      expect(result).toEqual({
        owner: "team",
        repo: "project",
        type: UnfurlResourceType.Project,
        url: "https://git.example.com/team/project",
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
