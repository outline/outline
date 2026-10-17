import { IntegrationService, IntegrationType } from "@shared/types";
import * as timers from "@shared/utils/timers";
import { ChatService } from "@server/chat/ChatService";
import type { BaseChatProvider } from "@server/chat/BaseChatProvider";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { Integration } from "@server/models";
import { AuthenticationType } from "@server/types";
import ChatNotificationsProcessor from "./ChatNotificationsProcessor";

const ip = "127.0.0.1";

/** Stubs the wait for summaries and spies on the Slack provider's postMessage. */
const spyOnPostMessage = () => {
  vi.spyOn(timers, "sleep").mockResolvedValue(undefined);
  const provider = ChatService.getProvider(IntegrationService.Slack);
  if (!provider) {
    throw new Error("Slack provider is not registered");
  }
  return vi
    .spyOn(provider as BaseChatProvider, "postMessage")
    .mockResolvedValue(undefined);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatNotificationsProcessor", () => {
  it("should post to every connected channel and continue after a failure", async () => {
    const postMessage = spyOnPostMessage().mockRejectedValueOnce(
      new Error("Channel archived")
    );

    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    for (const channel of ["one", "two"]) {
      await Integration.create<Integration<IntegrationType.Post>>({
        service: IntegrationService.Slack,
        type: IntegrationType.Post,
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
        events: ["documents.publish"],
        settings: {
          url: `https://hooks.slack.com/${channel}`,
          channel,
          channelId: channel,
        },
      });
    }

    await new ChatNotificationsProcessor().perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: collection.id,
      teamId: user.teamId,
      actorId: user.id,
      data: {},
      authType: AuthenticationType.APP,
      ip,
    });

    expect(postMessage).toHaveBeenCalledTimes(2);
    const channels = postMessage.mock.calls.map(
      ([integration]) => integration.settings.channel
    );
    expect(channels.sort()).toEqual(["one", "two"]);
    expect(postMessage.mock.calls[0][1].cards[0].title).toEqual(
      document.displayTitle
    );
  });

  it("should not post drafts", async () => {
    const postMessage = spyOnPostMessage();

    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      publishedAt: null,
    });
    await Integration.create<Integration<IntegrationType.Post>>({
      service: IntegrationService.Slack,
      type: IntegrationType.Post,
      userId: user.id,
      teamId: user.teamId,
      collectionId: document.collectionId,
      events: ["documents.publish"],
      settings: {
        url: "https://hooks.slack.com/x",
        channel: "x",
        channelId: "x",
      },
    });

    await new ChatNotificationsProcessor().perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: user.teamId,
      actorId: user.id,
      data: {},
      authType: AuthenticationType.APP,
      ip,
    });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("should post a welcome message when a channel is connected", async () => {
    const postMessage = spyOnPostMessage();

    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const integration = await Integration.create<
      Integration<IntegrationType.Post>
    >({
      service: IntegrationService.Slack,
      type: IntegrationType.Post,
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
      events: ["documents.publish"],
      settings: {
        url: "https://hooks.slack.com/x",
        channel: "x",
        channelId: "x",
      },
    });

    await new ChatNotificationsProcessor().perform({
      name: "integrations.create",
      modelId: integration.id,
      teamId: user.teamId,
      actorId: user.id,
      authType: AuthenticationType.APP,
      ip,
    });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0][1].text).toContain("Hey there");
    expect(postMessage.mock.calls[0][1].cards[0].title).toEqual(
      collection.name
    );
  });
});
