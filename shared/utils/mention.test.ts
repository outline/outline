import { IntegrationService, MentionType } from "../types";
import {
  determineMentionType,
  determineMentionTypeFromURL,
  isURLMentionable,
} from "./mention";

describe("determineMentionTypeFromURL", () => {
  it("should detect GitHub issues, pull requests and projects", () => {
    expect(
      determineMentionTypeFromURL(
        new URL("https://github.com/acme/infra/issues/2")
      )
    ).toBe(MentionType.Issue);
    expect(
      determineMentionTypeFromURL(
        new URL("https://github.com/acme/infra/pull/5")
      )
    ).toBe(MentionType.PullRequest);
    expect(
      determineMentionTypeFromURL(
        new URL("https://github.com/orgs/acme/projects/1")
      )
    ).toBe(MentionType.Project);
  });

  it("should detect Linear issues and projects", () => {
    expect(
      determineMentionTypeFromURL(
        new URL("https://linear.app/outline/issue/OLN-1/fix-parser")
      )
    ).toBe(MentionType.Issue);
    expect(
      determineMentionTypeFromURL(
        new URL("https://linear.app/outline/project/roadmap")
      )
    ).toBe(MentionType.Project);
  });

  it("should detect GitLab issues and merge requests", () => {
    expect(
      determineMentionTypeFromURL(
        new URL("https://gitlab.com/acme/infra/-/issues/2")
      )
    ).toBe(MentionType.Issue);
    expect(
      determineMentionTypeFromURL(
        new URL("https://gitlab.com/acme/infra/-/merge_requests/5")
      )
    ).toBe(MentionType.PullRequest);
  });

  it("should fall back to a URL mention for unrecognized links", () => {
    expect(
      determineMentionTypeFromURL(new URL("https://example.com/page"))
    ).toBe(MentionType.URL);
    expect(
      determineMentionTypeFromURL(new URL("https://github.com/acme/infra"))
    ).toBe(MentionType.URL);
  });
});

describe("determineMentionType", () => {
  it("should use the service of the given integration", () => {
    expect(
      determineMentionType({
        url: new URL("https://self-hosted.example.com/acme/infra/-/issues/2"),
        integration: { service: IntegrationService.GitLab },
      })
    ).toBe(MentionType.Issue);
  });

  it("should return undefined for an unrecognized path", () => {
    expect(
      determineMentionType({
        url: new URL("https://github.com/acme/infra/wiki"),
        integration: { service: IntegrationService.GitHub },
      })
    ).toBeUndefined();
  });
});

describe("isURLMentionable", () => {
  it("should match a Linear URL only for the installed workspace", () => {
    const integration = {
      service: IntegrationService.Linear,
      settings: {
        linear: { workspace: { id: "1", name: "Outline", key: "outline" } },
      },
    };

    expect(
      isURLMentionable({
        url: new URL("https://linear.app/outline/issue/OLN-1"),
        integration,
      })
    ).toBe(true);
    expect(
      isURLMentionable({
        url: new URL("https://linear.app/other/issue/OTH-1"),
        integration,
      })
    ).toBe(false);
  });

  it("should match a self-hosted GitLab URL", () => {
    const integration = {
      service: IntegrationService.GitLab,
      settings: { gitlab: { url: "https://git.example.com" } },
    };

    expect(
      isURLMentionable({
        url: new URL("https://git.example.com/acme/infra/-/issues/2"),
        integration,
      })
    ).toBe(true);
  });

  it("should not match when the integration has no settings", () => {
    expect(
      isURLMentionable({
        url: new URL("https://linear.app/outline/issue/OLN-1"),
        integration: { service: IntegrationService.Linear },
      })
    ).toBe(false);
  });
});
