import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import type { APIContext } from "@server/types";
import { Bitrix24Utils } from "../../shared/Bitrix24Utils";
import { getBitrix24Config, isBitrix24Configured } from "../config";
import * as T from "./schema";

const router = new Router();

router.get(
  "bitrix24.redirect",
  auth(),
  validate(T.Bitrix24CallbackSchema),
  async (ctx: APIContext<T.Bitrix24CallbackReq>) => {
    const { state: stateString } = ctx.input.query;
    const { user } = ctx.state.auth;

    let parsedState;
    try {
      parsedState = Bitrix24Utils.parseState<{
        collectionId?: string;
      }>(stateString);
    } catch (_err) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
      return;
    }

    const { teamId } = parsedState;

    if (!teamId || teamId !== user.teamId) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
      return;
    }

    const configured = await isBitrix24Configured(user.teamId);

    if (!configured) {
      ctx.redirect(Bitrix24Utils.errorUrl("not_configured"));
      return;
    }

    const config = await getBitrix24Config(user.teamId);

    if (
      !config.BITRIX24_CLIENT_ID ||
      !config.BITRIX24_CLIENT_SECRET ||
      !config.BITRIX24_DOMAIN
    ) {
      ctx.redirect(Bitrix24Utils.errorUrl("not_configured"));
      return;
    }

    // Determine scopes based on integration type
    const scopes = parsedState.type === IntegrationType.Command 
      ? ["tasks", "im"] 
      : ["tasks"];

    const authUrl = Bitrix24Utils.authUrl(
      stateString,
      config.BITRIX24_DOMAIN,
      scopes
    );

    ctx.redirect(authUrl);
  }
);

router.get(
  "bitrix24.callback",
  auth({ optional: true }),
  validate(T.Bitrix24CallbackSchema),
  apexAuthRedirect<T.Bitrix24CallbackReq>({
    getTeamId: (ctx) => {
      try {
        const parsedState = Bitrix24Utils.parseState(ctx.input.query.state);
        return parsedState.teamId;
      } catch {
        return undefined;
      }
    },
    getRedirectPath: (ctx, team) =>
      Bitrix24Utils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => Bitrix24Utils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.Bitrix24CallbackReq>) => {
    const { code, state: stateString, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(Bitrix24Utils.errorUrl(error));
      return;
    }

    if (!code) {
      return ctx.redirect(Bitrix24Utils.errorUrl("no_code"));
    }

    let parsedState;
    try {
      parsedState = Bitrix24Utils.parseState<{
        collectionId?: string;
      }>(stateString);
    } catch (_err) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
      return;
    }

    const { teamId } = parsedState;

    if (!teamId || teamId !== user.teamId) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
      return;
    }

    const config = await getBitrix24Config(user.teamId);

    if (
      !config.BITRIX24_CLIENT_ID ||
      !config.BITRIX24_CLIENT_SECRET ||
      !config.BITRIX24_DOMAIN
    ) {
      ctx.redirect(Bitrix24Utils.errorUrl("not_configured"));
      return;
    }

    const domain = config.BITRIX24_DOMAIN;

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(`https://${domain}/oauth/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.BITRIX24_CLIENT_ID,
          client_secret: config.BITRIX24_CLIENT_SECRET,
          code,
          redirect_uri: Bitrix24Utils.callbackUrl({ baseUrl: user.team.url }),
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info
      const userResponse = await fetch(
        `https://${domain}/rest/user.current.json?auth=${accessToken}`
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await userResponse.json();
      const bitrixUser = userData.result;

      const scopes = tokenData.scope?.split(" ") || [];

      // Handle different integration types
      const { type, collectionId } = parsedState;

      switch (type) {
        case IntegrationType.LinkedAccount: {
          await Integration.create({
            service: IntegrationService.Bitrix24,
            type: IntegrationType.LinkedAccount,
            userId: user.id,
            teamId: user.teamId,
            settings: {
              bitrix24: {
                domain,
                account: {
                  id: bitrixUser.ID,
                  name: bitrixUser.NAME || bitrixUser.LOGIN,
                  avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                },
              },
            },
          });
          break;
        }

        case IntegrationType.Command: {
          const authentication = await IntegrationAuthentication.create(
            {
              service: IntegrationService.Bitrix24,
              userId: user.id,
              teamId: user.teamId,
              token: accessToken,
              scopes,
            },
            { transaction }
          );

          await Integration.create(
            {
              service: IntegrationService.Bitrix24,
              type: IntegrationType.Command,
              userId: user.id,
              teamId: user.teamId,
              authenticationId: authentication.id,
              settings: {
                bitrix24: {
                  domain,
                  account: {
                    id: bitrixUser.ID,
                    name: bitrixUser.NAME || bitrixUser.LOGIN,
                    avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                  },
                },
              },
            },
            { transaction }
          );
          break;
        }

        case IntegrationType.Post: {
          const { Collection } = await import("@server/models");
          const collection = await Collection.findByPk(collectionId, {
            userId: user.id,
          });
          
          if (!collection) {
            throw new Error("Collection not found");
          }

          const authentication = await IntegrationAuthentication.create(
            {
              service: IntegrationService.Bitrix24,
              userId: user.id,
              teamId: user.teamId,
              token: accessToken,
              scopes,
            },
            { transaction }
          );

          await Integration.create(
            {
              service: IntegrationService.Bitrix24,
              type: IntegrationType.Post,
              userId: user.id,
              teamId: user.teamId,
              collectionId,
              authenticationId: authentication.id,
              events: ["documents.update", "documents.publish"],
              settings: {
                bitrix24: {
                  domain,
                  account: {
                    id: bitrixUser.ID,
                    name: bitrixUser.NAME || bitrixUser.LOGIN,
                    avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                  },
                },
              },
            },
            { transaction }
          );
          break;
        }

        default: {
          // Default to Embed for backward compatibility
          const authentication = await IntegrationAuthentication.create(
            {
              service: IntegrationService.Bitrix24,
              userId: user.id,
              teamId: user.teamId,
              token: accessToken,
              scopes,
            },
            { transaction }
          );

          await Integration.createWithCtx(
            createContext({ user, transaction }),
            {
              service: IntegrationService.Bitrix24,
              type: IntegrationType.Embed,
              userId: user.id,
              teamId: user.teamId,
              authenticationId: authentication.id,
              settings: {
                bitrix24: {
                  domain,
                  account: {
                    id: bitrixUser.ID,
                    name: bitrixUser.NAME || bitrixUser.LOGIN,
                    avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                  },
                },
              },
            }
          );
        }
      }

      ctx.redirect(Bitrix24Utils.url);
    } catch (err) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
    }
  }
);

router.get(
  "bitrix24.post",
  auth({ optional: true }),
  validate(T.Bitrix24CallbackSchema),
  apexAuthRedirect<T.Bitrix24CallbackReq>({
    getTeamId: (ctx) => {
      try {
        const parsedState = Bitrix24Utils.parseState(ctx.input.query.state);
        return parsedState.teamId;
      } catch {
        return undefined;
      }
    },
    getRedirectPath: (ctx, team) =>
      Bitrix24Utils.connectUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => Bitrix24Utils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.Bitrix24CallbackReq>) => {
    const { code, state: stateString, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(Bitrix24Utils.errorUrl(error));
      return;
    }

    if (!code) {
      return ctx.redirect(Bitrix24Utils.errorUrl("no_code"));
    }

    let parsedState;
    try {
      parsedState = Bitrix24Utils.parseState<{
        collectionId?: string;
      }>(stateString);
    } catch (_err) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
      return;
    }

    const { teamId, type, collectionId } = parsedState;

    if (!teamId || teamId !== user.teamId) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
      return;
    }

    const config = await getBitrix24Config(user.teamId);

    if (
      !config.BITRIX24_CLIENT_ID ||
      !config.BITRIX24_CLIENT_SECRET ||
      !config.BITRIX24_DOMAIN
    ) {
      ctx.redirect(Bitrix24Utils.errorUrl("not_configured"));
      return;
    }

    const domain = config.BITRIX24_DOMAIN;

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(`https://${domain}/oauth/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.BITRIX24_CLIENT_ID,
          client_secret: config.BITRIX24_CLIENT_SECRET,
          code,
          redirect_uri: Bitrix24Utils.connectUrl({ baseUrl: user.team.url }),
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info
      const userResponse = await fetch(
        `https://${domain}/rest/user.current.json?auth=${accessToken}`
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await userResponse.json();
      const bitrixUser = userData.result;

      const scopes = tokenData.scope?.split(" ") || [];

      switch (type) {
        case IntegrationType.Post: {
          const { Collection } = await import("@server/models");
          const { authorize } = await import("@server/policies");
          const collection = await Collection.findByPk(collectionId, {
            userId: user.id,
          });
          
          if (!collection) {
            throw new Error("Collection not found");
          }

          authorize(user, "read", collection);
          authorize(user, "update", user.team);

          const authentication = await IntegrationAuthentication.create(
            {
              service: IntegrationService.Bitrix24,
              userId: user.id,
              teamId: user.teamId,
              token: accessToken,
              scopes,
            },
            { transaction }
          );

          await Integration.create(
            {
              service: IntegrationService.Bitrix24,
              type: IntegrationType.Post,
              userId: user.id,
              teamId: user.teamId,
              collectionId,
              authenticationId: authentication.id,
              events: ["documents.update", "documents.publish"],
              settings: {
                bitrix24: {
                  domain,
                  account: {
                    id: bitrixUser.ID,
                    name: bitrixUser.NAME || bitrixUser.LOGIN,
                    avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                  },
                },
              },
            },
            { transaction }
          );
          break;
        }

        case IntegrationType.Command: {
          const { authorize } = await import("@server/policies");
          authorize(user, "update", user.team);

          const authentication = await IntegrationAuthentication.create(
            {
              service: IntegrationService.Bitrix24,
              userId: user.id,
              teamId: user.teamId,
              token: accessToken,
              scopes,
            },
            { transaction }
          );

          await Integration.create(
            {
              service: IntegrationService.Bitrix24,
              type: IntegrationType.Command,
              userId: user.id,
              teamId: user.teamId,
              authenticationId: authentication.id,
              settings: {
                bitrix24: {
                  domain,
                  account: {
                    id: bitrixUser.ID,
                    name: bitrixUser.NAME || bitrixUser.LOGIN,
                    avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                  },
                },
              },
            },
            { transaction }
          );
          break;
        }

        case IntegrationType.LinkedAccount: {
          await Integration.create({
            service: IntegrationService.Bitrix24,
            type: IntegrationType.LinkedAccount,
            userId: user.id,
            teamId: user.teamId,
            settings: {
              bitrix24: {
                domain,
                account: {
                  id: bitrixUser.ID,
                  name: bitrixUser.NAME || bitrixUser.LOGIN,
                  avatarUrl: bitrixUser.PERSONAL_PHOTO || undefined,
                },
              },
            },
          });
          break;
        }

        default:
          throw new Error("Invalid integration type");
      }

      ctx.redirect(Bitrix24Utils.url);
    } catch (err) {
      ctx.redirect(Bitrix24Utils.errorUrl("unauthenticated"));
    }
  }
);

export default router;
