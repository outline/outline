import Router from "koa-router";
import { IntegrationService, IntegrationType, UserRole } from "@shared/types";
import { MattermostIntegrationSettings } from "@shared/zod";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Collection, Event, Integration } from "@server/models";
import { authorize } from "@server/policies";
import { presentIntegration, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import {
  createWebhook,
  getChannels,
  getUser,
  getUserTeams,
} from "../mattermost/client";
import { loadChannelsFromCache, storeChannelsInCache } from "../utils/cache";
import * as T from "./schema";

const router = new Router();

router.post(
  "mattermost.user_teams",
  auth({ role: UserRole.Admin }),
  validate(T.MattermostGetUserTeamsSchema),
  async (ctx: APIContext<T.MattermostGetUserTeamsReq>) => {
    const { url, apiKey } = ctx.input.body;

    const [user, teams] = await Promise.all([
      getUser({ serverUrl: url, apiKey }),
      getUserTeams({ serverUrl: url, apiKey }),
    ]);

    ctx.body = {
      data: { user, teams },
    };
  }
);

router.post(
  "mattermost.channels",
  auth({ role: UserRole.Admin }),
  validate(T.MattermostGetChannelsSchema),
  transaction(),
  async (ctx: APIContext<T.MattermostGetChannelsReq>) => {
    const { user } = ctx.state.auth;
    const { force } = ctx.input.body;

    const integration = await Integration.scope("withAuthentication").findOne({
      where: {
        service: IntegrationService.Mattermost,
        type: IntegrationType.LinkedAccount,
        userId: user.id,
      },
    });

    authorize(user, "read", integration);

    const settings = integration.settings as MattermostIntegrationSettings;

    let channels = await loadChannelsFromCache({
      teamId: settings.team.id,
      userId: settings.user.id,
    });

    if (force || !channels) {
      channels = await getChannels({
        serverUrl: settings.url,
        apiKey: integration.authentication.token,
        teamId: settings.team.id,
      });
      await storeChannelsInCache({
        teamId: settings.team.id,
        userId: settings.user.id,
        channels,
      });
    }

    ctx.body = {
      data: channels,
    };
  }
);

router.post(
  "mattermost.webhook",
  auth({ role: UserRole.Admin }),
  validate(T.MattermostCreateWebhookSchema),
  transaction(),
  async (ctx: APIContext<T.MattermostCreateWebhookReq>) => {
    const {
      auth: { user },
      transaction,
    } = ctx.state;
    const { collectionId, channel } = ctx.input.body;

    authorize(user, "update", user.team);

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);

    authorize(user, "read", collection);

    const accountIntegration = await Integration.scope(
      "withAuthentication"
    ).findOne({
      where: {
        service: IntegrationService.Mattermost,
        type: IntegrationType.LinkedAccount,
        userId: user.id,
      },
    });

    authorize(user, "read", accountIntegration);

    const settings =
      accountIntegration.settings as MattermostIntegrationSettings;

    const webhook = await createWebhook({
      serverUrl: settings.url,
      apiKey: accountIntegration.authentication.token,
      channel,
    });

    const postIntegration = await Integration.create(
      {
        service: IntegrationService.Mattermost,
        type: IntegrationType.Post,
        userId: user.id,
        teamId: user.teamId,
        collectionId,
        events: ["documents.update", "documents.publish"],
        settings: {
          id: webhook.id,
          url: webhook.url,
          channel: channel.name,
          channelId: channel.id,
        },
      },
      { transaction }
    );

    await Event.createFromContext(
      ctx,
      {
        name: "integrations.create",
        modelId: postIntegration.id,
      },
      { transaction }
    );

    ctx.body = {
      data: presentIntegration(postIntegration),
      policies: presentPolicies(user, [postIntegration]),
    };
  }
);

export default router;
