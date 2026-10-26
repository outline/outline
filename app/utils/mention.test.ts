import { IntegrationService, MentionType } from "@shared/types";
import type Integration from "~/models/Integration";
import { determineMentionType, isURLMentionable } from "./mention";
import { Hook, PluginManager } from "./PluginManager";

const buildIntegration = (service: IntegrationService) =>
  ({ service, settings: {} }) as unknown as Integration;

describe("mention", () => {
  beforeAll(() => {
    PluginManager.add({
      id: "test-mention-provider",
      name: "Test mention provider",
      type: Hook.MentionProvider,
      value: {
        service: IntegrationService.GitHub,
        isMentionable: (url) => url.hostname === "example.com",
        mentionType: (url) =>
          url.pathname.startsWith("/issues/") ? MentionType.Issue : undefined,
      },
    });
  });

  it("uses the provider registered for the integration service", () => {
    const integration = buildIntegration(IntegrationService.GitHub);
    const url = new URL("https://example.com/issues/1");

    expect(isURLMentionable({ url, integration })).toBe(true);
    expect(determineMentionType({ url, integration })).toBe(MentionType.Issue);
  });

  it("returns the provider result for URLs it does not recognize", () => {
    const integration = buildIntegration(IntegrationService.GitHub);

    expect(
      isURLMentionable({ url: new URL("https://other.com/"), integration })
    ).toBe(false);
    expect(
      determineMentionType({
        url: new URL("https://example.com/about"),
        integration,
      })
    ).toBeUndefined();
  });

  it("does not mention URLs for services without a provider", () => {
    const integration = buildIntegration(IntegrationService.Slack);
    const url = new URL("https://example.com/issues/1");

    expect(isURLMentionable({ url, integration })).toBe(false);
    expect(determineMentionType({ url, integration })).toBeUndefined();
  });
});
