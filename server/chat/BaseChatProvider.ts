import type { ChatIntegrationService, IntegrationType } from "@shared/types";
import type { Integration } from "@server/models";
import type { SearchQuerySource } from "@server/models/SearchQuery";
import type { APIContext } from "@server/types";
import type {
  ChatCapabilities,
  ChatEvent,
  ChatInstall,
  ChatMessage,
  ChatRequest,
  ChatResult,
} from "./types";

/**
 * Base class for chat platform adapters. A provider converts platform
 * requests to neutral events, and neutral messages to platform messages. The
 * shared logic in `ChatService` does all lookups and permission checks.
 *
 * @template TTarget the data that the provider needs to reply to an event.
 */
export abstract class BaseChatProvider<TTarget = unknown> {
  /** The integration service of the platform. */
  public abstract readonly service: ChatIntegrationService;

  /** The display name of the platform. */
  public abstract readonly name: string;

  /** The source recorded on search queries from the platform. */
  public abstract readonly searchSource: SearchQuerySource;

  /** The features that the provider supports. */
  public abstract readonly capabilities: ChatCapabilities;

  /** The paths under /api that receive requests from the platform. */
  public abstract readonly webhookPaths: string[];

  /**
   * The name of the matching authentication provider, if the platform also
   * supports sign in. Used to find users that have not linked an account.
   */
  public readonly authProviderName?: string;

  /**
   * Verifies and parses an inbound request.
   *
   * @param ctx the request context.
   * @param path the webhook path that received the request.
   * @returns the parsed request.
   * @throws {AuthenticationError} if the request is not from the platform.
   * @throws {ValidationError} if the request is not valid.
   */
  public abstract parseRequest(
    ctx: APIContext,
    path: string
  ): Promise<ChatRequest<TTarget>>;

  /**
   * Sends the result of an event to the platform, as the HTTP response or
   * with an API call.
   *
   * @param ctx the request context.
   * @param event the event.
   * @param result the result of the event.
   */
  public abstract respond(
    ctx: APIContext,
    event: ChatEvent<TTarget>,
    result: ChatResult
  ): Promise<void>;

  /**
   * Sends a message after the HTTP response. Where the platform allows it, the
   * message replaces the deferred message.
   *
   * @param target the reply target of the event.
   * @param message the message to send.
   */
  public abstract reply(target: TTarget, message: ChatMessage): Promise<void>;

  /**
   * Exchanges an OAuth code from the install flow for an access token.
   *
   * @param code the OAuth code.
   * @param redirectUri the redirect URI used in the install flow.
   * @returns the result of the install.
   */
  public abstract exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<ChatInstall>;

  /**
   * Posts a message to the channel of a post integration.
   *
   * @param integration the post integration.
   * @param message the message to post.
   */
  public abstract postMessage(
    integration: Integration<IntegrationType.Post>,
    message: ChatMessage
  ): Promise<void>;
}
