import { IntegrationService, IntegrationType } from "@shared/types";
import * as timers from "@shared/utils/timers";
import type { BaseChatProvider } from "@server/chat/BaseChatProvider";
import { ChatService } from "@server/chat/ChatService";
import { Integration } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { AuthenticationType } from "@server/types";
import ChatPostDocumentTask from "../tasks/ChatPostDocumentTask";
import ChatNotificationsProcessor from "./ChatNotificationsProcessor";

const ip = "127.0.0.1";

const buildPostIntegration = (
  user: { id: string; teamId: string },
  collectionId: string | null | undefined,
  channel = "general"
) =>
  Integration.create<Integration<IntegrationType.Post>>({
    service: IntegrationService.Slack,
    type: IntegrationType.Post,
    userId: user.id,
    teamId: user.teamId,
    collectionId,
    events: ["documents.publish"],
    settings: {
      url: `https://hooks.slack.com/${channel}`,
      channel,
      channelId: channel,
    },
  });

const publish = (
  user: { id: string; teamId: string },
  documentId: string,
  collectionId: string
) =>
  new ChatNotificationsProcessor().perform({
    name: "documents.publish",
    documentId,
    collectionId,
    teamId: user.teamId,
    actorId: user.id,
    data: {},
    authType: AuthenticationType.APP,
    ip,
  });

beforeEach(() => {
  vi.spyOn(timers, "sleep").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatNotificationsProcessor", () => {
  it("should schedule one post for each connected channel", async () => {
    const schedule = vi.spyOn(ChatPostDocumentTask.prototype, "schedule");
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
    const integrations = [
      await buildPostIntegration(user, collection.id, "one"),
      await buildPostIntegration(user, collection.id, "two"),
    ];

    await publish(user, document.id, collection.id);

    expect(schedule.mock.calls.map(([props]) => props)).toEqual(
      expect.arrayContaining(
        integrations.map((integration) => ({
          integrationId: integration.id,
          documentId: document.id,
          eventName: "documents.publish",
        }))
      )
    );
    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it("should not schedule posts for drafts", async () => {
    const schedule = vi.spyOn(ChatPostDocumentTask.prototype, "schedule");
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      publishedAt: null,
    });
    await buildPostIntegration(user, document.collectionId);

    await publish(user, document.id, document.collectionId!);

    expect(schedule).not.toHaveBeenCalled();
  });

  it("should post a welcome message when a channel is connected", async () => {
    const provider = ChatService.getProvider(IntegrationService.Slack);
    if (!provider) {
      throw new Error("Slack provider is not registered");
    }
    const postMessage = vi
      .spyOn(provider as BaseChatProvider, "postMessage")
      .mockResolvedValue(undefined);
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const integration = await buildPostIntegration(user, collection.id);

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
