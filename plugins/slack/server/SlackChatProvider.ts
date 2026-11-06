import { IntegrationService, type IntegrationType } from "@shared/types";
import { toError } from "@shared/utils/error";
import { BaseChatProvider } from "@server/chat/BaseChatProvider";
import type {
  ChatCapabilities,
  ChatEvent,
  ChatInstall,
  ChatMessage,
  ChatRequest,
  ChatResult,
  ChatVisibility,
} from "@server/chat/types";
import {
  AuthenticationError,
  InvalidRequestError,
  ValidationError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import { validateRequest } from "@server/middlewares/validate";
import type { Integration } from "@server/models";
import { SearchQuerySource } from "@server/models/SearchQuery";
import type { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import fetch from "@server/utils/fetch";
import env from "./env";
import * as T from "./schema";
import { SlackMessageHelper } from "./SlackMessageHelper";
import * as Slack from "./slack";

/** The data needed to reply to a Slack event. */
export interface SlackReplyTarget {
  /** The response URL sent with commands and interactions. */
  responseUrl?: string;
  /** True for Block Kit actions, which ignore the HTTP response body. */
  isBlockAction?: boolean;
}

/**
 * Connects Slack to the shared chat logic.
 */
export class SlackChatProvider extends BaseChatProvider<SlackReplyTarget> {
  public readonly service = IntegrationService.Slack;

  public readonly name = "Slack";

  public readonly searchSource = SearchQuerySource.Slack;

  public readonly authProviderName = "slack";

  public readonly capabilities: ChatCapabilities = {
    messageActions: env.SLACK_MESSAGE_ACTIONS,
  };

  public readonly webhookPaths = [
    "hooks.unfurl",
    "hooks.interactive",
    "hooks.slack",
  ];

  public async parseRequest(
    ctx: APIContext,
    path: string
  ): Promise<ChatRequest<SlackReplyTarget>> {
    switch (path) {
      case "hooks.unfurl":
        return this.parseUnfurl(ctx);
      case "hooks.interactive":
        return this.parseInteractive(ctx);
      case "hooks.slack":
        return this.parseCommand(ctx);
      default:
        throw InvalidRequestError(`Unknown webhook path ${path}`);
    }
  }

  public async respond(
    ctx: APIContext,
    event: ChatEvent<SlackReplyTarget>,
    result: ChatResult
  ): Promise<void> {
    switch (result.type) {
      case "message":
      case "deferred":
        if (event.type === "action" && event.replyTarget.isBlockAction) {
          await this.respondToBlockAction(event.replyTarget, result.message);
          ctx.body = { ok: true };
          return;
        }

        ctx.body = {
          response_type: this.responseType(result.message.visibility),
          ...(event.type === "action" ? { replace_original: false } : {}),
          ...SlackMessageHelper.toPayload(result.message),
        };
        return;

      case "linkPreviews": {
        if (event.type !== "linksShared") {
          return;
        }

        await Slack.post("chat.unfurl", {
          token: result.authentication.token,
          channel: event.conversation.channelId,
          ts: event.messageId,
          unfurls: Object.fromEntries(
            Array.from(result.cards, ([url, card]) => [
              url,
              SlackMessageHelper.toUnfurl(card),
            ])
          ),
        });
        ctx.body = { success: true };
        return;
      }

      default:
    }
  }

  public async reply(
    target: SlackReplyTarget,
    message: ChatMessage
  ): Promise<void> {
    if (!target.responseUrl) {
      throw InvalidRequestError("Missing response_url");
    }

    await this.send(target.responseUrl, {
      replace_original: true,
      response_type: this.responseType(message.visibility),
      ...SlackMessageHelper.toPayload(message),
    });
  }

  public async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<ChatInstall> {
    const data = T.OAuthAccessSchema.parse(
      await Slack.oauthAccess(code, redirectUri)
    );

    return {
      token: data.access_token,
      scopes: data.scope.split(","),
      serviceTeamId: data.team_id,
      serviceUserId: data.user_id,
      channel: data.incoming_webhook
        ? {
            id: data.incoming_webhook.channel_id,
            name: data.incoming_webhook.channel,
            webhookUrl: data.incoming_webhook.url,
          }
        : undefined,
    };
  }

  public async postMessage(
    integration: Integration<IntegrationType.Post>,
    message: ChatMessage
  ): Promise<void> {
    await this.send(
      integration.settings.url,
      SlackMessageHelper.toPayload(message)
    );
  }

  private async respondToBlockAction(
    target: SlackReplyTarget,
    message: ChatMessage
  ) {
    if (!target.responseUrl) {
      throw InvalidRequestError("Missing response_url");
    }

    await this.send(target.responseUrl, {
      replace_original: false,
      response_type: this.responseType(message.visibility),
      ...SlackMessageHelper.toPayload(message),
    });

    // Remove the ephemeral message so that the button cannot be used again.
    await this.send(target.responseUrl, { delete_original: true });
  }

  private parseUnfurl(ctx: APIContext): ChatRequest<SlackReplyTarget> {
    const { body } = validateRequest(T.HooksUnfurlSchema, ctx);

    // See URL verification handshake documentation on this page:
    // https://api.slack.com/apis/connections/events-api
    if ("challenge" in body) {
      return { type: "handshake", body: { challenge: body.challenge } };
    }

    this.verifyToken(body.token);

    return {
      type: "linksShared",
      installation: { serviceTeamId: body.team_id },
      actor: { serviceTeamId: body.team_id, serviceUserId: body.event.user },
      conversation: { channelId: body.event.channel },
      messageId: body.event.message_ts,
      urls: body.event.links.map((link) => link.url),
      replyTarget: {},
    };
  }

  private parseInteractive(ctx: APIContext): ChatRequest<SlackReplyTarget> {
    const { body } = validateRequest(T.HooksInteractiveSchema, ctx);

    // https://api.slack.com/interactivity/handling#payloads
    let parsed;
    try {
      parsed = T.InteractivePayloadSchema.parse(JSON.parse(body.payload));
    } catch (err) {
      Logger.error("Failed to parse Slack interactive payload", toError(err), {
        payload: body.payload,
      });
      throw ValidationError("Invalid payload");
    }

    this.verifyToken(parsed.token);

    const { user, team } = parsed;
    if (!user || !team) {
      throw ValidationError("Invalid payload");
    }

    const blockAction = parsed.actions?.[0];
    const action =
      parsed.type === "block_actions" && blockAction?.action_id
        ? SlackMessageHelper.actionFromId(blockAction.action_id)
        : "postDocument";
    const value =
      parsed.type === "block_actions" ? blockAction?.value : parsed.callback_id;

    if (!action || !value) {
      throw InvalidRequestError("Invalid callback_id");
    }

    return {
      type: "action",
      installation: { serviceTeamId: team.id },
      actor: { serviceTeamId: user.team_id ?? team.id, serviceUserId: user.id },
      action,
      value,
      replyTarget: {
        responseUrl: parsed.response_url,
        isBlockAction: parsed.type === "block_actions",
      },
    };
  }

  private parseCommand(ctx: APIContext): ChatRequest<SlackReplyTarget> {
    const { body } = validateRequest(T.HooksSlackCommandSchema, ctx);
    this.verifyToken(body.token);

    return {
      type: "command",
      installation: { serviceTeamId: body.team_id },
      actor: { serviceTeamId: body.team_id, serviceUserId: body.user_id },
      text: body.text,
      replyTarget: { responseUrl: body.response_url },
    };
  }

  private verifyToken(token: string) {
    if (!env.SLACK_VERIFICATION_TOKEN) {
      throw AuthenticationError(
        "SLACK_VERIFICATION_TOKEN is not present in environment"
      );
    }

    if (!safeEqual(env.SLACK_VERIFICATION_TOKEN, token)) {
      throw AuthenticationError("Invalid token");
    }
  }

  private responseType(visibility: ChatVisibility) {
    return visibility === "conversation" ? "in_channel" : "ephemeral";
  }

  private async send(url: string, payload: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw InvalidRequestError(
        `Slack responded with status ${response.status}`
      );
    }
  }
}
