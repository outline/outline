import Router from "koa-router";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { Team, NotificationSetting } from "@server/models";
import { authorize } from "@server/policies";
import { presentNotificationSetting } from "@server/presenters";
import { APIContext } from "@server/types";
import { assertPresent, assertUuid } from "@server/validation";

const router = new Router();

router.post("notificationSettings.create", auth(), async (ctx: APIContext) => {
  const { event } = ctx.request.body;
  assertPresent(event, "event is required");

  const { user } = ctx.state.auth;
  authorize(user, "createNotificationSetting", user.team);
  const [setting] = await NotificationSetting.findOrCreate({
    where: {
      userId: user.id,
      teamId: user.teamId,
      event,
    },
  });

  ctx.body = {
    data: presentNotificationSetting(setting),
  };
});

router.post("notificationSettings.list", auth(), async (ctx: APIContext) => {
  const { user } = ctx.state.auth;
  const settings = await NotificationSetting.findAll({
    where: {
      userId: user.id,
    },
  });

  ctx.body = {
    data: settings.map(presentNotificationSetting),
  };
});

router.post("notificationSettings.delete", auth(), async (ctx: APIContext) => {
  const { id } = ctx.request.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state.auth;
  const setting = await NotificationSetting.findByPk(id);
  authorize(user, "delete", setting);

  await setting.destroy();

  ctx.body = {
    success: true,
  };
});

const handleUnsubscribe = async (ctx: APIContext) => {
  const { id, token } = (ctx.method === "POST"
    ? ctx.request.body
    : ctx.request.query) as {
    id?: string;
    token?: string;
  };
  assertUuid(id, "id is required");
  assertPresent(token, "token is required");

  const setting = await NotificationSetting.findByPk(id, {
    include: [
      {
        model: Team,
        required: true,
        as: "team",
      },
    ],
  });

  if (setting && setting.unsubscribeToken === token) {
    await setting.destroy();
    ctx.redirect(`${setting.team.url}/settings/notifications?success`);
    return;
  }

  ctx.redirect(`${env.URL}?notice=invalid-auth`);
};

router.get("notificationSettings.unsubscribe", handleUnsubscribe);
router.post("notificationSettings.unsubscribe", handleUnsubscribe);

export default router;
