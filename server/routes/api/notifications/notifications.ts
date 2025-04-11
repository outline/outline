import Router from "koa-router";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import isUndefined from "lodash/isUndefined";
import { WhereOptions, Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import { createContext } from "@server/context";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Notification, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { authorize } from "@server/policies";
import { presentPolicies } from "@server/presenters";
import presentNotification from "@server/presenters/notification";
import { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();
const pixel = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const handleUnsubscribe = async (
  ctx: APIContext<T.NotificationsUnsubscribeReq>
) => {
  const { transaction } = ctx.state;
  const eventType = (ctx.input.body.eventType ??
    ctx.input.query.eventType) as NotificationEventType;
  const userId = (ctx.input.body.userId ?? ctx.input.query.userId) as string;
  const token = (ctx.input.body.token ?? ctx.input.query.token) as string;

  const unsubscribeToken = NotificationSettingsHelper.unsubscribeToken(
    userId,
    eventType
  );

  if (unsubscribeToken !== token) {
    ctx.redirect(`${env.URL}?notice=invalid-auth`);
    return;
  }

  const user = await User.scope("withTeam").findByPk(userId, {
    rejectOnEmpty: true,
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  user.setNotificationEventType(eventType, false);
  await user.save({ transaction });
  ctx.redirect(`${user.team.url}/settings/notifications?success`);
};

router.get(
  "notifications.unsubscribe",
  validate(T.NotificationsUnsubscribeSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsUnsubscribeReq>) => {
    const { follow } = ctx.input.query;

    // The link in the email does not include the follow query param, this
    // is to help prevent anti-virus, and email clients from pre-fetching the link
    if (!follow) {
      return ctx.redirectOnClient(ctx.request.href + "&follow=true");
    }

    return handleUnsubscribe(ctx);
  }
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
  async (ctx: APIContext<T.NotificationsListReq>) => {
    const { eventType, archived } = ctx.input.body;
    const user = ctx.state.auth.user;
    let where: WhereOptions<Notification> = {
      teamId: user.teamId,
      userId: user.id,
    };
    if (eventType) {
      where = { ...where, event: eventType };
    }
    if (!isNil(archived)) {
      where = {
        ...where,
        archivedAt: archived
          ? {
              [Op.ne]: null,
            }
          : {
              [Op.eq]: null,
            },
      };
    }
    const [notifications, total, unseen] = await Promise.all([
      Notification.findAll({
        where,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Notification.count({
        where,
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

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        notifications: await Promise.all(
          notifications.map((notification) =>
            presentNotification(ctx, notification)
          )
        ),
        unseen,
      },
    };
  }
);

router.get(
  "notifications.pixel",
  validate(T.NotificationsPixelSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsPixelReq>) => {
    const { id, token } = ctx.input.query;
    const { transaction } = ctx.state;

    const notification = await Notification.unscoped().findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
      rejectOnEmpty: true,
    });

    if (!safeEqual(token, notification.pixelToken)) {
      throw AuthenticationError();
    }

    if (!notification.viewedAt) {
      const user = await notification.$get("user");
      if (user) {
        await notification.updateWithCtx(
          createContext({
            ...ctx,
            transaction,
            user,
          }),
          {
            viewedAt: new Date(),
          }
        );
      }
    }

    ctx.response.set("Content-Type", "image/gif");
    ctx.body = pixel;
  }
);

router.post(
  "notifications.update",
  auth(),
  validate(T.NotificationsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsUpdateReq>) => {
    const { id, viewedAt, archivedAt } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const notification = await Notification.findByPk(id, {
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Notification,
      },
      rejectOnEmpty: true,
      transaction,
    });
    authorize(user, "update", notification);

    if (!isUndefined(viewedAt)) {
      notification.viewedAt = viewedAt;
    }
    if (!isUndefined(archivedAt)) {
      notification.archivedAt = archivedAt;
    }
    await notification.saveWithCtx(ctx);

    ctx.body = {
      data: await presentNotification(ctx, notification),
      policies: presentPolicies(user, [notification]),
    };
  }
);

router.post(
  "notifications.update_all",
  auth(),
  validate(T.NotificationsUpdateAllSchema),
  async (ctx: APIContext<T.NotificationsUpdateAllReq>) => {
    const { viewedAt, archivedAt } = ctx.input.body;
    const { user } = ctx.state.auth;

    const values: Partial<Notification> = {};
    let where: WhereOptions<Notification> = {
      teamId: user.teamId,
      userId: user.id,
    };
    if (!isUndefined(viewedAt)) {
      values.viewedAt = viewedAt;
      where = {
        ...where,
        viewedAt: !isNull(viewedAt) ? { [Op.is]: null } : { [Op.ne]: null },
      };
    }
    if (!isUndefined(archivedAt)) {
      values.archivedAt = archivedAt;
      where = {
        ...where,
        archivedAt: !isNull(archivedAt) ? { [Op.is]: null } : { [Op.ne]: null },
      };
    }

    let total = 0;
    if (!isEmpty(values)) {
      total = await Notification.unscoped().findAllInBatches(
        { where },
        async (results) => {
          await Promise.all(
            results.map((notification) =>
              notification.updateWithCtx(ctx, values)
            )
          );
        }
      );
    }

    ctx.body = {
      success: true,
      data: { total },
    };
  }
);

export default router;
