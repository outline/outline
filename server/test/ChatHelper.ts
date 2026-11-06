import { IntegrationService } from "@shared/types";
import { BaseChatProvider } from "@server/chat/BaseChatProvider";
import type { ChatInstall, ChatMessage, ChatRequest } from "@server/chat/types";
import { SearchQuerySource } from "@server/models/SearchQuery";

/** The reply target of the test provider. */
export interface TestChatTarget {
  id: string;
}

/**
 * A chat provider for tests. It records replies and returns a fixed install.
 */
export class TestChatProvider extends BaseChatProvider<TestChatTarget> {
  public readonly service = IntegrationService.Slack;
  public readonly name = "Test";
  public readonly searchSource = SearchQuerySource.Slack;
  public readonly authProviderName = "slack";
  public readonly webhookPaths = [];
  public readonly capabilities = { messageActions: true };

  /** The messages sent with `reply`. */
  public replies: ChatMessage[] = [];

  /** The result of `exchangeCode`. */
  public install: ChatInstall = {
    token: "token",
    scopes: ["incoming-webhook"],
    serviceTeamId: "T1",
    serviceUserId: "U1",
    channel: { id: "C1", name: "general", webhookUrl: "https://a.com/hook" },
  };

  public async parseRequest(): Promise<ChatRequest<TestChatTarget>> {
    throw new Error("Not implemented");
  }

  public async respond() {}

  public async reply(_target: TestChatTarget, message: ChatMessage) {
    this.replies.push(message);
  }

  public async exchangeCode(): Promise<ChatInstall> {
    return this.install;
  }

  public async postMessage() {}
}
