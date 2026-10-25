import { IntegrationService, MentionType } from "@shared/types";
import stores from "~/stores";
import { determineMentionType, isURLMentionable } from "./mention";

const installation = {
  id: 1,
  account: { id: 1, name: "octo", avatarUrl: "" },
};

describe("Gitea mentions", () => {
  const integration = stores.integrations.add({
    id: "gitea-subpath",
    service: IntegrationService.Gitea,
    settings: { gitea: { url: "https://example.com/gitea", installation } },
  });

  it("should only match urls on the connected instance", () => {
    expect(
      isURLMentionable({
        url: new URL("https://example.com/gitea/owner/repo/issues/1"),
        integration,
      })
    ).toBe(true);
    expect(
      isURLMentionable({
        url: new URL("https://example.com/owner/repo/issues/1"),
        integration,
      })
    ).toBe(false);
    expect(
      isURLMentionable({
        url: new URL("https://other.example.com/gitea/owner/repo"),
        integration,
      })
    ).toBe(false);
  });

  it("should not match urls for a connection that is not authorized", () => {
    const pending = stores.integrations.add({
      id: "gitea-pending",
      service: IntegrationService.Gitea,
      settings: { gitea: { url: "https://pending.example.com" } },
    });

    expect(
      isURLMentionable({
        url: new URL("https://pending.example.com/owner/repo/issues/1"),
        integration: pending,
      })
    ).toBe(false);
  });

  it.each([
    ["owner/repo/issues/12", MentionType.Issue],
    ["owner/repo/pulls/3", MentionType.PullRequest],
    ["owner/repo/pulls/3/files", MentionType.PullRequest],
    ["owner/repo", MentionType.Project],
    ["owner/repo/issues/new", undefined],
    ["owner/repo/src/branch/main", undefined],
    ["explore/repos", undefined],
  ])("should determine the mention type of %s", (path, expected) => {
    expect(
      determineMentionType({
        url: new URL(`https://example.com/gitea/${path}`),
        integration,
      })
    ).toBe(expected);
  });
});
