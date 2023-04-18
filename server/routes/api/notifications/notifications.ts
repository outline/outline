import Router from "koa-router";
import { WhereOptions, Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Notification, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import presentNotification from "@server/presenters/notification";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

const handleUnsubscribe = async (
  ctx: APIContext<T.NotificationsUnsubscribeReq>
) => {
  const eventType = (ctx.input.body.eventType ??
    ctx.input.query.eventType) as NotificationEventType;
  const userId = (ctx.input.body.userId ?? ctx.input.query.userId) as string;
  const token = (ctx.input.body.token ?? ctx.input.query.token) as string;

  const user = await User.scope("withTeam").findByPk(userId, {
    rejectOnEmpty: true,
  });
  const unsubscribeToken = NotificationSettingsHelper.unsubscribeToken(
    user,
    eventType
  );

  if (unsubscribeToken !== token) {
    ctx.redirect(`${env.URL}?notice=invalid-auth`);
    return;
  }

  user.setNotificationEventType(eventType, false);
  await user.save();
  ctx.redirect(`${user.team.url}/settings/notifications?success`);
};

router.get(
  "notifications.unsubscribe",
  validate(T.NotificationsUnsubscribeSchema),
  transaction(),
  handleUnsubscribe
);
router.post(
  "notifications.unsubscribe",
  validate(T.NotificationsUnsubscribeSchema),
  transaction(),
  handleUnsubscribe
);

router.post(
  "notifications.list",
  auth(),
  pagination(),
  validate(T.NotificationsListSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsListReq>) => {
    const eventType = ctx.input.body.eventType ?? ctx.input.query.eventType;
    const user = ctx.state.auth.user;
    let where: WhereOptions<Notification> = {
      userId: user.id,
    };
    if (eventType) {
      where = { ...where, event: eventType };
    }
    const [notifications, unseenCount] = await Promise.all([
      Notification.scope(["withUser", "withActor"]).findAll({
        where,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Notification.count({
        where: {
          ...where,
          viewedAt: {
            [Op.is]: null,
          },
        },
      }),
    ]);

    const data = notifications.map((notification) =>
      presentNotification(notification)
    );

    ctx.body = {
      pagination: ctx.state.pagination,
      data,
      unseenCount,
    };
  }
);

export default router;
