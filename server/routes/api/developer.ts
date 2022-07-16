import { Context, Next } from "koa";
import Router from "koa-router";
import randomstring from "randomstring";
import userInviter, { Invite } from "@server/commands/userInviter";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { presentUser } from "@server/presenters";

const router = new Router();

function dev() {
  return async function checkDevelopmentMiddleware(ctx: Context, next: Next) {
    if (env.ENVIRONMENT !== "development") {
      throw new Error("Attempted to access development route in production");
    }

    return next();
  };
}

router.post("developer.create_test_users", dev(), auth(), async (ctx) => {
  const { count = 10 } = ctx.body;
  const { user } = ctx.state;
  const invites = Array(count)
    .fill(0)
    .map(() => {
      const rando = randomstring.generate(10);

      return {
        email: `${rando}@example.com`,
        name: `${rando.slice(0, 5)} Tester`,
        role: "member",
      } as Invite;
    });

  Logger.info("utils", `Creating ${count} test users`, invites);

  // Generate a bunch of invites
  const response = await userInviter({
    user,
    invites,
    ip: ctx.request.ip,
  });

  // Convert from invites to active users by marking as active
  await Promise.all(
    response.users.map((user) => user.updateActiveAt(ctx.request.ip, true))
  );

  ctx.body = {
    data: {
      users: response.users.map((user) => presentUser(user)),
    },
  };
});

export default router;
