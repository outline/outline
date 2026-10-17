import { t } from "i18next";
import httpErrors from "http-errors";
import { escapeRegExp } from "es-toolkit/compat";
import queryString from "query-string";
import type { IntegrationService } from "@shared/types";
import { toError } from "@shared/utils/error";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { ChatUtils } from "@shared/utils/ChatUtils";
import env from "@server/env";
import documentLoader from "@server/commands/documentLoader";
import { InvalidRequestError, NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { Comment, Document, SearchQuery } from "@server/models";
import type { IntegrationAuthentication, Team, User } from "@server/models";
import type { APIContext } from "@server/types";
import { opts } from "@server/utils/i18n";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import SearchProviderManager from "@server/utils/SearchProviderManager";
import type { BaseChatProvider } from "./BaseChatProvider";
import { type ChatAccounts, ChatAccountHelper } from "./ChatAccountHelper";
import type { ChatAnswerProvider } from "./ChatAnswerProvider";
import { ChatMessageHelper } from "./ChatMessageHelper";
import type { ChatCard, ChatEvent, ChatMessage, ChatResult } from "./types";

/** The command that users type to use Outline from a chat platform. */
const command = "/outline";

/**
 * Handles events from chat platforms. All lookups and permission checks for
 * chat providers are done here. One chat workspace can be connected to
 * several Outline teams, so each lookup uses a context for one team.
 */
export class ChatService {
  /**
   * Returns all registered chat providers.
   *
   * @returns the chat providers.
   */
  public static getProviders(): BaseChatProvider[] {
    return PluginManager.getHooks(Hook.ChatProvider).map((hook) => hook.value);
  }

  /**
   * Returns the chat provider for a service.
   *
   * @param service the integration service.
   * @returns the chat provider, if registered.
   */
  public static getProvider(
    service: IntegrationService
  ): BaseChatProvider | undefined {
    return this.getProviders().find((provider) => provider.service === service);
  }

  /**
   * Handles an event from a chat platform.
   *
   * @param ctx the context of the inbound request.
   * @param provider the chat provider that received the event.
   * @param event the event.
   * @returns the result to send to the platform.
   */
  public static async handle<TTarget>(
    ctx: APIContext,
    provider: BaseChatProvider<TTarget>,
    event: ChatEvent<TTarget>
  ): Promise<ChatResult> {
    const accounts = await ChatAccountHelper.findAccounts(
      ctx,
      provider,
      event.installation,
      event.actor
    );

    switch (event.type) {
      case "command":
        return this.handleCommand(provider, event, accounts);
      case "linksShared":
        return this.handleLinksShared(provider, event, accounts);
      case "action":
        return this.handleAction(provider, event, accounts);
      default:
        return { type: "none" };
    }
  }

  private static getAnswerProvider(): ChatAnswerProvider | undefined {
    return PluginManager.getHooks(Hook.ChatAnswerProvider)[0]?.value;
  }

  private static userOf(ctx: APIContext): User {
    return ctx.context.auth.user;
  }

  private static async handleCommand<TTarget>(
    provider: BaseChatProvider<TTarget>,
    event: Extract<ChatEvent<TTarget>, { type: "command" }>,
    { teams, contexts }: ChatAccounts
  ): Promise<ChatResult> {
    const user = contexts.length ? this.userOf(contexts[0]) : undefined;
    const query = event.text;

    if (query.trim() === "help" || !query.trim()) {
      return {
        type: "message",
        message: {
          text: [
            t("How to use {{ command }}", { command, ...opts(user) }),
            t(
              "To search your workspace use {{ command }}.\nType {{ command2 }} help to display this help text.",
              {
                command: `${command} keyword`,
                command2: command,
                ...opts(user),
              }
            ),
          ].join("\n"),
          visibility: "ephemeral",
          cards: [],
        },
      };
    }

    if (!user) {
      return {
        type: "message",
        message: this.notLinkedMessage(provider, teams),
      };
    }

    // An answer needs one team, so it is only used when there is no choice.
    const answerProvider = this.getAnswerProvider();
    if (
      contexts.length === 1 &&
      answerProvider?.canAnswer(contexts[0], query)
    ) {
      void this.replyWithAnswer(
        contexts[0],
        provider,
        event.replyTarget,
        answerProvider,
        query
      );

      return {
        type: "deferred",
        message: {
          text: "",
          context: t("Looking for answers", opts(user)) + "…",
          visibility: "ephemeral",
          cards: [],
        },
      };
    }

    return {
      type: "message",
      message: await this.search(provider, contexts, query),
    };
  }

  private static async handleLinksShared<TTarget>(
    provider: BaseChatProvider<TTarget>,
    event: Extract<ChatEvent<TTarget>, { type: "linksShared" }>,
    { contexts }: ChatAccounts
  ): Promise<ChatResult> {
    if (!contexts.length) {
      Logger.debug("plugins", "No user found for chat user ID", {
        service: provider.service,
        providerId: event.actor.serviceUserId,
      });
      return { type: "none" };
    }

    const cards = new Map<string, ChatCard>();
    let authentication: IntegrationAuthentication | undefined;

    for (const url of event.urls) {
      const documentId = parseDocumentSlug(url);
      if (!documentId) {
        continue;
      }

      const found = await this.tryLoadDocument(contexts, documentId);
      if (!found) {
        continue;
      }
      const { ctx, document } = found;
      const user = this.userOf(ctx);
      authentication ??= ctx.state.integration?.authentication;

      const commentId = queryString.parse(url.split("?")[1])?.commentId;
      if (commentId) {
        if (typeof commentId !== "string") {
          continue;
        }

        const comment = await Comment.findByPk(commentId);
        if (!comment || comment.documentId !== document.id) {
          continue;
        }

        cards.set(url, {
          title: t("Comment by {{ author }} on “{{ title }}”", {
            author: comment.createdBy.name,
            title: document.title,
            ...opts(user),
          }),
          url,
          text: ChatMessageHelper.escape(comment.toPlainText()),
        });
      } else {
        cards.set(url, {
          title: document.title,
          url,
          text: ChatMessageHelper.escape(document.getSummary()),
          color: document.collection?.color ?? undefined,
        });
      }
    }

    // Tokens of one app in one workspace are interchangeable, so any
    // installed team can send previews for the others.
    authentication ??= contexts
      .map((ctx) => ctx.state.integration?.authentication)
      .find(Boolean);
    if (!authentication) {
      Logger.debug("plugins", "No chat integration authentication found", {
        service: provider.service,
        serviceTeamId: event.installation.serviceTeamId,
      });
      return { type: "none" };
    }

    return { type: "linkPreviews", cards, authentication };
  }

  private static async handleAction<TTarget>(
    provider: BaseChatProvider<TTarget>,
    event: Extract<ChatEvent<TTarget>, { type: "action" }>,
    { teams, contexts }: ChatAccounts
  ): Promise<ChatResult> {
    switch (event.action) {
      case "postDocument": {
        if (!contexts.length) {
          return {
            type: "message",
            message: this.notLinkedMessage(provider, teams),
          };
        }

        const found = await this.tryLoadDocument(contexts, event.value);
        if (!found) {
          return {
            type: "message",
            message: {
              text: ChatMessageHelper.escape(
                t(
                  "You do not have access to this document",
                  opts(this.userOf(contexts[0]))
                )
              ),
              visibility: "ephemeral",
              cards: [],
            },
          };
        }
        const user = this.userOf(found.ctx);

        return {
          type: "message",
          message: {
            text: "",
            visibility: "conversation",
            cards: [
              ChatMessageHelper.documentCard(
                found.document,
                user.team,
                found.document.collection
              ),
            ],
          },
        };
      }

      case "postAnswer": {
        const searchQuery = await SearchQuery.findByPk(event.value);
        const ctx = contexts.find(
          (context) => this.userOf(context).id === searchQuery?.userId
        );
        if (!searchQuery || !ctx) {
          throw InvalidRequestError("Invalid search query");
        }

        return {
          type: "message",
          message: {
            context: t("Answer to “{{ query }}”", {
              query: searchQuery.query,
              ...opts(this.userOf(ctx)),
            }),
            text: searchQuery.answer,
            visibility: "conversation",
            cards: [],
          },
        };
      }

      default:
        return { type: "none" };
    }
  }

  /**
   * Loads a document for the actor. The document decides the team, and the
   * actor's user in that team must be able to read it.
   *
   * @param contexts the actor's contexts.
   * @param documentId the ID or URL ID of the document.
   * @returns the document and the context of the user that loaded it.
   * @throws {NotFoundError} if the actor has no account in the team.
   * @throws {AuthorizationError} if the user cannot read the document.
   */
  private static async loadDocument(
    contexts: APIContext[],
    documentId: string
  ): Promise<{ ctx: APIContext; document: Document }> {
    // This lookup excludes deleted documents, which documentLoader returns to
    // users that can restore them.
    const found = await Document.findByPk(documentId);
    const ctx = contexts.find(
      (context) => this.userOf(context).teamId === found?.teamId
    );
    if (!found || !ctx) {
      throw NotFoundError();
    }

    const document = await documentLoader({
      id: found.id,
      user: this.userOf(ctx),
    });
    return { ctx, document };
  }

  /**
   * Loads a document for the actor, or returns undefined if the document is
   * missing or the actor cannot read it.
   *
   * @param contexts the actor's contexts.
   * @param documentId the ID or URL ID of the document.
   * @returns the document and the context of the user that loaded it, if any.
   */
  private static async tryLoadDocument(
    contexts: APIContext[],
    documentId: string
  ): Promise<{ ctx: APIContext; document: Document } | undefined> {
    try {
      return await this.loadDocument(contexts, documentId);
    } catch (err) {
      if (httpErrors.isHttpError(err) && err.status < 500) {
        return undefined;
      }
      throw err;
    }
  }

  private static notLinkedMessage(
    provider: BaseChatProvider,
    teams: Team[]
  ): ChatMessage {
    const appName = env.APP_NAME;
    const prefix = ChatMessageHelper.escape(
      t(
        "It looks like you haven’t linked your {{ appName }} account to {{ serviceName }} yet",
        { appName, serviceName: provider.name, ...opts() }
      ) + ". "
    );
    const settingsPath = ChatUtils.settingsPath(provider.service);
    const linkLabel = ChatMessageHelper.escape(t("Link your account", opts()));

    let suffix: string;
    if (teams.length === 1) {
      suffix = `[${linkLabel}](${teams[0].url}${settingsPath})`;
    } else if (teams.length > 1) {
      suffix = `${linkLabel}: ${teams
        .map(
          (team) =>
            `[${ChatMessageHelper.escape(team.name)}](${team.url}${settingsPath})`
        )
        .join(" · ")}`;
    } else {
      suffix = ChatMessageHelper.escape(
        t(
          "Link your account in {{ appName }} settings to search from {{ serviceName }}",
          { appName, serviceName: provider.name, ...opts() }
        )
      );
    }

    return {
      text: prefix + suffix,
      visibility: "ephemeral",
      cards: [],
    };
  }

  private static async search(
    provider: BaseChatProvider,
    contexts: APIContext[],
    query: string
  ): Promise<ChatMessage> {
    const user = this.userOf(contexts[0]);
    const cards: ChatCard[] = [];

    for (const ctx of contexts) {
      cards.push(
        ...(await this.searchTeam(ctx, provider, query, contexts.length > 1))
      );
    }

    if (!cards.length) {
      return {
        text: ChatMessageHelper.escape(
          t("No results for “{{ term }}”", { term: query, ...opts(user) })
        ),
        visibility: "ephemeral",
        cards: [],
      };
    }

    return {
      text: ChatMessageHelper.escape(
        t("This is what we found for “{{ term }}”", {
          term: query,
          ...opts(user),
        })
      ),
      visibility: "ephemeral",
      cards,
    };
  }

  private static async searchTeam(
    ctx: APIContext,
    provider: BaseChatProvider,
    query: string,
    showTeam: boolean
  ): Promise<ChatCard[]> {
    const user = this.userOf(ctx);
    const { results, total } =
      await SearchProviderManager.getProvider().searchForUser(user, {
        query,
        limit: 5,
      });

    await SearchQuery.create({
      userId: user.id,
      teamId: user.teamId,
      source: provider.searchSource,
      query,
      results: total,
    });

    return results.map((result) => {
      const queryIsInTitle = !!result.document.title
        .toLowerCase()
        .match(escapeRegExp(query.toLowerCase()));

      const card = ChatMessageHelper.documentCard(
        result.document,
        user.team,
        result.document.collection,
        queryIsInTitle || !result.context
          ? undefined
          : ChatMessageHelper.fromSearchContext(result.context),
        provider.capabilities.messageActions
          ? [
              {
                id: "postDocument",
                label: t("Post to Channel", opts(user)),
                value: result.document.id,
              },
            ]
          : undefined
      );

      return showTeam
        ? {
            ...card,
            footer: [user.team.name, card.footer].filter(Boolean).join(" · "),
          }
        : card;
    });
  }

  private static async replyWithAnswer<TTarget>(
    ctx: APIContext,
    provider: BaseChatProvider<TTarget>,
    target: TTarget,
    answerProvider: ChatAnswerProvider,
    query: string
  ) {
    const user = this.userOf(ctx);

    try {
      const { answer, documents } = await answerProvider.answer(ctx, query);
      if (!answer) {
        await provider.reply(target, await this.search(provider, [ctx], query));
        return;
      }

      const searchQuery = await SearchQuery.create({
        userId: user.id,
        teamId: user.teamId,
        source: provider.searchSource,
        query,
        answer,
        results: documents.length,
      });

      await provider.reply(target, {
        context: t("Answer to “{{ query }}”", { query, ...opts(user) }),
        text: answer,
        visibility: "ephemeral",
        cards: documents
          .slice(0, 1)
          .map((document) =>
            ChatMessageHelper.documentCard(
              document,
              user.team,
              document.collection
            )
          ),
        actions: provider.capabilities.messageActions
          ? [
              {
                id: "postAnswer",
                label: t("Post to channel", opts(user)),
                value: searchQuery.id,
              },
            ]
          : undefined,
      });
    } catch (err) {
      Logger.error("Failed to answer chat question", toError(err), {
        service: provider.service,
        userId: user.id,
      });
    }
  }
}
