import Router from "@koa/router";
import { ChatUtils } from "@shared/utils/ChatUtils";
import { createContext } from "@server/context";
import { ValidationError } from "@server/errors";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import type { APIContext } from "@server/types";
import { verifyOAuthStateNonce } from "@server/utils/oauth";
import type { BaseChatProvider } from "./BaseChatProvider";
import { ChatInstallHelper } from "./ChatInstallHelper";
import { ChatService } from "./ChatService";
import * as T from "./schema";

/**
 * Creates the routes for chat providers.
 */
export class ChatRouter {
  /**
   * Creates the routes, mounted under /api, that receive requests from the
   * chat platform.
   *
   * @param provider the chat provider.
   * @returns the router.
   */
  public static createWebhookRouter<TTarget>(
    provider: BaseChatProvider<TTarget>
  ): Router {
    const router = new Router();

    for (const path of provider.webhookPaths) {
      router.post(path, async (ctx: APIContext) => {
        const request = await provider.parseRequest(ctx, path);

        if (request.type === "handshake") {
          ctx.body = request.body;
          return;
        }

        const result = await ChatService.handle(ctx, provider, request);
        await provider.respond(ctx, request, result);
      });
    }

    return router;
  }

  /**
   * Creates the route, mounted under /auth, that completes the install flow.
   *
   * @param provider the chat provider.
   * @returns the router.
   */
  public static createInstallRouter(provider: BaseChatProvider): Router {
    const router = new Router();
    const { service } = provider;

    router.get(
      `${service}.post`,
      auth({ optional: true }),
      validate(T.ChatInstallSchema),
      apexAuthRedirect<T.ChatInstallReq>({
        getTeamId: (ctx) => ChatUtils.parseState(ctx.input.query.state)?.teamId,
        getRedirectPath: (ctx, team) =>
          ChatUtils.connectUrl(service, {
            baseUrl: team.url,
            params: ctx.request.querystring,
          }),
        getErrorPath: () => ChatUtils.errorPath(service, "unauthenticated"),
      }),
      async (ctx: APIContext<T.ChatInstallReq>) => {
        const { code, error, state } = ctx.input.query;

        if (error) {
          ctx.redirect(ChatUtils.errorPath(service, error));
          return;
        }

        const parsedState = ChatUtils.parseState(state);
        if (!parsedState) {
          throw ValidationError("Invalid state");
        }

        verifyOAuthStateNonce(
          ctx,
          ChatUtils.nonceCookie(service),
          parsedState.nonce
        );

        if (!code) {
          throw ValidationError("code is required");
        }

        // The auth app has no apiContext middleware, so build the context here.
        const { user, type } = ctx.state.auth;
        await ChatInstallHelper.install(
          createContext({ user, authType: type, ip: ctx.request.ip }),
          provider,
          parsedState,
          code
        );
        ctx.redirect(ChatUtils.settingsPath(service));
      }
    );

    return router;
  }
}
