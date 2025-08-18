import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { IntegrationAuthentication, Integration } from "@server/models";
import { APIContext } from "@server/types";
import { GitLab } from "../gitlab";
import UploadGitLabProjectAvatarTask from "../tasks/UploadGitLabProjectAvatarTask";
import * as T from "./schema";
import { GitLabUtils } from "plugins/gitlab/shared/GitLabUtils";

const router = new Router();

router.get(
  "gitlab.callback",
  auth({
    optional: true,
  }),
  validate(T.GitLabCallbackSchema),
  apexAuthRedirect<T.GitLabCallbackReq>({
    getTeamId: (ctx) => GitLabUtils.parseState(ctx.input.query.state)?.teamId,
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

    // Check error after any sub-domain redirection. Otherwise, the user will be redirected to the root domain.
    if (error) {
      ctx.redirect(GitLabUtils.errorUrl(error));
      return;
    }

    try {
      // validation middleware ensures that code is non-null at this point.
      const oauth = await GitLab.oauthAccess(code!);
      const project = await GitLab.getInstalledProject(oauth.access_token);

      const authentication = await IntegrationAuthentication.create(
        {
          service: IntegrationService.GitLab,
          userId: user.id,
          teamId: user.teamId,
          token: oauth.access_token,
          scopes: oauth.scope.split(" "),
        },
        { transaction }
      );
      const integration = await Integration.create<
        Integration<IntegrationType.Embed>
      >(
        {
          service: IntegrationService.GitLab,
          type: IntegrationType.Embed,
          userId: user.id,
          teamId: user.teamId,
          authenticationId: authentication.id,
          settings: {
            gitlab: {
              project: {
                id: project.id,
                name: project.name,
                path_with_namespace: project.path_with_namespace,
                avatar_url: project.avatar_url,
              },
            },
          },
        },
        { transaction }
      );

      transaction.afterCommit(async () => {
        if (project.avatar_url) {
          await new UploadGitLabProjectAvatarTask().schedule({
            integrationId: integration.id,
            avatarUrl: project.avatar_url,
          });
        }
      });

      ctx.redirect(GitLabUtils.successUrl());
    } catch (err) {
      Logger.error("Encountered error during GitLab OAuth callback", err);
      ctx.redirect(GitLabUtils.errorUrl("unknown"));
    }
  }
);

export default router;
