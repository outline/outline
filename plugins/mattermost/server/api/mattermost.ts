import Router from "koa-router";
import { IntegrationService, IntegrationType, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Integration, IntegrationAuthentication } from "@server/models";
import { presentIntegration, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "mattermost.connect",
  auth({ role: UserRole.Member }),
  validate(T.MattermostConnectSchema),
  transaction(),
  async (ctx: APIContext<T.MattermostConnectReq>) => {
    const {
      auth: { user },
      transaction,
    } = ctx.state;
    const {
      url,
      apiKey,
      user: { id, email, displayName },
    } = ctx.input.body;

    const authentication = await IntegrationAuthentication.create(
      {
        service: IntegrationService.Mattermost,
        userId: user.id,
        teamId: user.teamId,
        token: apiKey,
      },
      { transaction }
    );
    const integration = await Integration.create(
      {
        service: IntegrationService.Mattermost,
        type: IntegrationType.LinkedAccount,
        userId: user.id,
        teamId: user.teamId,
        authenticationId: authentication.id,
        settings: {
          url,
          user: {
            id,
            email,
            displayName,
          },
        },
      },
      { transaction }
    );

    ctx.body = {
      data: presentIntegration(integration),
      policies: presentPolicies(user, [integration]),
    };
  }
);

export default router;
