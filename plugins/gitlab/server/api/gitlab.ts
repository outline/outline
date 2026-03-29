import Router from "koa-router";
import { Op } from "sequelize";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import validateWebhook from "@server/middlewares/validateWebhook";
import { IntegrationAuthentication, Integration } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import { validateUrlNotPrivate } from "@server/utils/url";
import { addSeconds } from "date-fns";
import Logger from "@server/logging/Logger";
import { GitLabUtils } from "../../shared/GitLabUtils";
import { GitLab } from "../gitlab";
import env from "../env";
import GitLabWebhookTask from "../tasks/GitLabWebhookTask";
import * as T from "../schema";

const router = new Router();

router.post(
  "gitlab.connect",
  auth(),
  validate(T.GitLabConnectSchema),
  transaction(),
  async (ctx: APIContext<T.GitLabConnectReq>) => {
    const { url: rawUrl, clientId, clientSecret } = ctx.input.body;
    const url = rawUrl?.replace(/\/+$/, "");
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    authorize(user, "createIntegration", user.team);

    if (url) {
      await validateUrlNotPrivate(url);
    }

    if (url && clientId && clientSecret) {
      // Clean up any stale pending auth records for this user/team/service
      await IntegrationAuthentication.destroy({
        where: {
          service: IntegrationService.GitLab,
          userId: user.id,
          teamId: user.teamId,
          token: { [Op.is]: null } as never,
        },
        transaction,
      });

      // Check if an integration already exists for this GitLab URL
      const existing = await Integration.findOne({
        where: {
          service: IntegrationService.GitLab,
          teamId: user.teamId,
          settings: { gitlab: { url } },
        },
        include: [
          {
            model: IntegrationAuthentication,
            as: "authentication",
            required: false,
          },
        ],
        transaction,
      });

      if (existing?.authentication) {
        // Update the existing authentication with new credentials and
        // clear tokens so the callback treats it as pending
        existing.authentication.clientId = clientId;
        existing.authentication.clientSecret = clientSecret;
        existing.authentication.setDataValue("token", null as never);
        existing.authentication.setDataValue("refreshToken", null as never);
        await existing.authentication.save({ transaction });
      } else {
        // Create a pending IntegrationAuthentication with credentials
        const pendingAuth = await IntegrationAuthentication.create(
          {
            service: IntegrationService.GitLab,
            userId: user.id,
            teamId: user.teamId,
            clientId,
            clientSecret,
          },
          { transaction }
        );

        if (existing) {
          // Link existing integration to the new authentication
          await existing.update(
            { authenticationId: pendingAuth.id },
            { transaction }
          );
        } else {
          // Create a new integration with the URL and link it
          await Integration.create(
            {
              service: IntegrationService.GitLab,
              type: IntegrationType.Embed,
              userId: user.id,
              teamId: user.teamId,
              authenticationId: pendingAuth.id,
              settings: { gitlab: { url } },
            } as Partial<Integration>,
            { transaction }
          );
        }
      }
    }

    const redirectUrl = GitLabUtils.authUrl(user.teamId, url, clientId);
    ctx.body = {
      data: { redirectUrl },
    };
  }
);

router.get(
  "gitlab.callback",
  auth({ optional: true }),
  validate(T.GitLabCallbackSchema),
  apexAuthRedirect<T.GitLabCallbackReq>({
    getTeamId: (ctx) => ctx.input.query.state,
    getRedirectPath: (ctx, team) =>
      GitLabUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => GitLabUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.GitLabCallbackReq>) => {
    const { code, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(GitLabUtils.errorUrl(error));
      return;
    }

    try {
      // Check for a pending IntegrationAuthentication with custom credentials
      const pendingAuth = await IntegrationAuthentication.findOne({
        where: {
          service: IntegrationService.GitLab,
          userId: user.id,
          teamId: user.teamId,
          token: { [Op.is]: null } as never,
        },
        transaction,
      });

      // Resolve the custom URL from the linked Integration (if any)
      let customUrl: string | undefined;
      let existingIntegration: Integration | null = null;

      if (pendingAuth) {
        existingIntegration = await Integration.findOne({
          where: {
            service: IntegrationService.GitLab,
            teamId: user.teamId,
            authenticationId: pendingAuth.id,
          },
          transaction,
        });
        customUrl = (
          existingIntegration?.settings as { gitlab?: { url?: string } }
        )?.gitlab?.url;
      }

      const oauth = await GitLab.oauthAccess({
        code,
        customUrl,
        clientId: pendingAuth?.clientId ?? undefined,
        clientSecret: pendingAuth?.clientSecret ?? undefined,
      });

      const userInfo = await GitLab.getCurrentUser({
        accessToken: oauth.access_token,
        customUrl,
      });

      // Check if another integration already exists with the same installation
      const duplicateIntegration = await Integration.findOne({
        where: {
          service: IntegrationService.GitLab,
          teamId: user.teamId,
          settings: { gitlab: { installation: { id: userInfo.id } } },
          ...(existingIntegration
            ? { id: { [Op.ne]: existingIntegration.id } }
            : {}),
        },
        transaction,
      });

      if (duplicateIntegration) {
        ctx.redirect(GitLabUtils.errorUrl("duplicate_account"));
        return;
      }

      let authentication: IntegrationAuthentication;

      if (pendingAuth) {
        // Update the pending record with OAuth tokens
        await pendingAuth.update(
          {
            token: oauth.access_token,
            refreshToken: oauth.refresh_token,
            expiresAt: oauth.expires_in
              ? addSeconds(Date.now(), oauth.expires_in)
              : undefined,
            scopes: oauth.scope.split(" "),
          },
          { transaction }
        );
        authentication = pendingAuth;
      } else {
        authentication = await IntegrationAuthentication.create(
          {
            service: IntegrationService.GitLab,
            userId: user.id,
            teamId: user.teamId,
            token: oauth.access_token,
            refreshToken: oauth.refresh_token,
            expiresAt: oauth.expires_in
              ? addSeconds(Date.now(), oauth.expires_in)
              : undefined,
            scopes: oauth.scope.split(" "),
          },
          { transaction }
        );
      }

      const installationSettings = {
        gitlab: {
          ...(customUrl ? { url: customUrl } : {}),
          installation: {
            id: userInfo.id,
            account: {
              id: userInfo.id,
              name: userInfo.username,
              avatarUrl: userInfo.avatar_url,
            },
          },
        },
      };

      if (existingIntegration) {
        // Update the existing Integration created during gitlab.connect
        existingIntegration.settings =
          installationSettings as Integration["settings"];
        await existingIntegration.save({ transaction });
      } else {
        await Integration.createWithCtx(createContext({ user, transaction }), {
          service: IntegrationService.GitLab,
          type: IntegrationType.Embed,
          userId: user.id,
          teamId: user.teamId,
          authenticationId: authentication.id,
          settings: installationSettings,
        });
      }

      ctx.redirect(GitLabUtils.url);
    } catch (err) {
      Logger.error("Encountered error during Gitlab OAuth callback", err);
      ctx.redirect(GitLabUtils.errorUrl("unauthenticated"));
    }
  }
);

router.post(
  "gitlab.webhooks",
  validateWebhook({
    hmacSign: false,
    secretKey: async (ctx) => {
      const instanceHeader = ctx.request.headers["x-gitlab-instance"];
      const instanceUrl = (
        Array.isArray(instanceHeader) ? instanceHeader[0] : instanceHeader
      )?.replace(/\/+$/, "");

      // Self-hosted instances store their client secret in the database,
      // use the X-Gitlab-Instance header to find the matching integration.
      if (instanceUrl && instanceUrl !== "https://gitlab.com") {
        const integration = await Integration.findOne({
          where: {
            service: IntegrationService.GitLab,
            settings: { gitlab: { url: instanceUrl } },
          },
          include: [
            {
              model: IntegrationAuthentication,
              as: "authentication",
              required: true,
            },
          ],
        });
        if (integration) {
          return integration.authentication.clientSecret ?? undefined;
        }
      }

      // Default GitLab.com instance uses the env secret
      return env.GITLAB_CLIENT_SECRET;
    },
    getSignatureFromHeader: (ctx) => {
      const { headers } = ctx.request;
      const signatureHeader = headers["x-gitlab-token"];
      return Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader;
    },
  }),
  async (ctx: APIContext) => {
    const { headers, body } = ctx.request;

    await new GitLabWebhookTask().schedule({
      payload: body,
      headers,
    });

    ctx.status = 202;
  }
);

export default router;
