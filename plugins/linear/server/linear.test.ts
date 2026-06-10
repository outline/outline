import { UnfurlResourceType } from "@shared/types";
import { Linear } from "./linear";

describe("Linear.parseUrl", () => {
  it("should parse an issue url", () => {
    expect(
      Linear.parseUrl("https://linear.app/acme/issue/ACM-123/fix-the-thing")
    ).toEqual({
      workspaceKey: "acme",
      type: UnfurlResourceType.Issue,
      id: "ACM-123",
      name: "fix-the-thing",
    });
  });

  it("should parse a project url", () => {
    expect(
      Linear.parseUrl("https://linear.app/acme/project/my-project-abc123")
    ).toEqual({
      workspaceKey: "acme",
      type: UnfurlResourceType.Project,
      id: "my-project-abc123",
      name: undefined,
    });
  });

  it("should parse a review url", () => {
    expect(
      Linear.parseUrl("https://linear.review/outline/outline/pull/1234")
    ).toEqual({
      type: UnfurlResourceType.PR,
      owner: "outline",
      repo: "outline",
      number: 1234,
    });
  });

  it("should not parse a review url with an invalid pull request number", () => {
    expect(
      Linear.parseUrl("https://linear.review/outline/outline/pull/abc")
    ).toBeUndefined();
  });

  it("should not parse a review url missing path segments", () => {
    expect(Linear.parseUrl("https://linear.review/outline")).toBeUndefined();
    expect(
      Linear.parseUrl("https://linear.review/outline/outline/issues/123")
    ).toBeUndefined();
  });

  it("should not parse an in-app review url", () => {
    expect(
      Linear.parseUrl("https://linear.app/acme/review/fix-the-thing-abc123")
    ).toBeUndefined();
  });

  it("should not parse urls from other hosts", () => {
    expect(
      Linear.parseUrl("https://github.com/outline/outline/pull/1234")
    ).toBeUndefined();
  });

  it("should not parse invalid urls", () => {
    expect(Linear.parseUrl("not a url")).toBeUndefined();
  });
});
