import { IntegrationService, IntegrationType } from "@shared/types";
import type { BaseChatProvider } from "@server/chat/BaseChatProvider";
import { ChatService } from "@server/chat/ChatService";
import { Integration } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import ChatPostDocumentTask from "./ChatPostDocumentTask";

const setup = async () => {
  const provider = ChatService.getProvider(IntegrationService.Slack);
  if (!provider) {
    throw new Error("Slack provider is not registered");
  }
  const postMessage = vi.spyOn(provider as BaseChatProvider, "postMessage");
  const user = await buildUser();
  const document = await buildDocument({
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
    collectionId: document.collectionId,
    events: ["documents.publish"],
    settings: {
      url: "https://hooks.slack.com/x",
      channel: "x",
      channelId: "x",
    },
  });
  const props = {
    integrationId: integration.id,
    documentId: document.id,
    eventName: "documents.publish" as const,
  };
  return { postMessage, document, integration, props };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatPostDocumentTask", () => {
  it("should post the document to the channel", async () => {
    const { postMessage, document, integration, props } = await setup();
    postMessage.mockResolvedValue(undefined);

    await new ChatPostDocumentTask().perform(props);

    expect(postMessage).toHaveBeenCalledTimes(1);
    const [postedIntegration, message] = postMessage.mock.calls[0];
    expect(postedIntegration.id).toEqual(integration.id);
    expect(message.text).toContain("published");
    expect(message.cards[0].title).toEqual(document.displayTitle);
  });

  it("should reject when the post fails, so that the queue retries", async () => {
    const { postMessage, props } = await setup();
    postMessage.mockRejectedValue(new Error("Channel unavailable"));

    await expect(new ChatPostDocumentTask().perform(props)).rejects.toThrow(
      "Channel unavailable"
    );
  });
});
