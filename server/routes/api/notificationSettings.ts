import Router from "koa-router";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { Team, NotificationSetting } from "@server/models";
import { authorize } from "@server/policies";
import { presentNotificationSetting } from "@server/presenters";
import { assertPresent, assertUuid } from "@server/validation";

const router = new Router();

router.post("notificationSettings.create", auth(), async (ctx) => {
  const { event } = ctx.body;
  assertPresent(event, "event is required");

  const { user } = ctx.state;
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

router.post("notificationSettings.list", auth(), async (ctx) => {
  const { user } = ctx.state;
  const settings = await NotificationSetting.findAll({
    where: {
      userId: user.id,
    },
  });

  ctx.body = {
    data: settings.map(presentNotificationSetting),
  };
});

router.post("notificationSettings.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const setting = await NotificationSetting.findByPk(id);
  authorize(user, "delete", setting);

  await setting.destroy();

  ctx.body = {
    success: true,
  };
});

router.post("notificationSettings.unsubscribe", async (ctx) => {
  const { id, token } = ctx.body;
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
});

export default router;
