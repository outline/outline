import type { Context, Next } from "koa";
import Router from "koa-router";
import { Op } from "sequelize";
import { randomString, randomElement } from "@shared/random";
import { NotificationEventType } from "@shared/types";
import type { Invite } from "@server/commands/userInviter";
import userInviter from "@server/commands/userInviter";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, Notification, User } from "@server/models";
import presentNotification from "@server/presenters/notification";
import { presentUser } from "@server/presenters";
import type { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

function dev() {
  return async function checkDevelopmentMiddleware(ctx: Context, next: Next) {
    if (env.ENVIRONMENT !== "development") {
      throw new Error("Attempted to access development route in production");
    }

    return next();
  };
}

router.post(
  "developer.create_test_users",
  dev(),
  auth(),
  validate(T.CreateTestUsersSchema),
  async (ctx: APIContext<T.CreateTestUsersReq>) => {
    const { count } = ctx.input.body;
    const invites = Array(Math.min(count, 100))
      .fill(0)
      .map(() => {
        const rando = randomString(10);

        return {
          email: `${rando}@example.com`,
          name: `${rando.slice(0, 5)} Tester`,
          role: "member",
        } as Invite;
      });

    Logger.info("utils", `Creating ${count} test users`, invites);

    // Generate a bunch of invites
    const response = await userInviter(ctx, { invites });

    // Convert from invites to active users by marking as active
    await Promise.all(
      response.users.map((user) => user.updateActiveAt(ctx, true))
    );

    ctx.body = {
      data: {
        users: response.users.map((user) => presentUser(user)),
      },
    };
  }
);

router.post(
  "developer.create_test_notifications",
  dev(),
  auth(),
  validate(T.CreateTestNotificationsSchema),
  async (ctx: APIContext<T.CreateTestNotificationsReq>) => {
    const { count } = ctx.input.body;
    const { user } = ctx.state.auth;

    const events = [
      NotificationEventType.UpdateDocument,
      NotificationEventType.CreateComment,
      NotificationEventType.MentionedInDocument,
      NotificationEventType.MentionedInComment,
      NotificationEventType.AddUserToDocument,
    ];

    const [documents, actors] = await Promise.all([
      Document.findAll({
        where: { teamId: user.teamId },
        limit: 25,
      }),
      User.findAll({
        where: { teamId: user.teamId, id: { [Op.ne]: user.id } },
        limit: 25,
      }),
    ]);

    const notifications = await Promise.all(
      Array(Math.min(count, 100))
        .fill(0)
        .map(() => {
          const document = documents.length
            ? randomElement(documents)
            : undefined;

          return Notification.create({
            event: randomElement(events),
            userId: user.id,
            actorId: actors.length ? randomElement(actors).id : user.id,
            teamId: user.teamId,
            documentId: document?.id,
          });
        })
    );

    Logger.info("utils", `Creating ${count} test notifications`);

    ctx.body = {
      data: {
        notifications: await Promise.all(
          notifications.map((notification) =>
            presentNotification(ctx, notification)
          )
        ),
      },
    };
  }
);

export default router;
