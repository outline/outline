import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import userDestroyer from "@server/commands/userDestroyer";
import userInviter from "@server/commands/userInviter";
import userSuspender from "@server/commands/userSuspender";
import { sequelize } from "@server/database/sequelize";
import InviteEmail from "@server/emails/templates/InviteEmail";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { Event, User, Team } from "@server/models";
import { UserFlag } from "@server/models/User";
import { can, authorize } from "@server/policies";
import { presentUser, presentPolicies } from "@server/presenters";
import {
  assertIn,
  assertSort,
  assertPresent,
  assertArray,
} from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("users.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "createdAt", query, filter, ids } = ctx.body;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  assertSort(sort, User);

  if (filter) {
    assertIn(
      filter,
      ["invited", "viewers", "admins", "active", "all", "suspended"],
      "Invalid filter"
    );
  }

  const actor = ctx.state.user;
  let where: WhereOptions<User> = {
    teamId: actor.teamId,
  };

  switch (filter) {
    case "invited": {
      where = { ...where, lastActiveAt: null };
      break;
    }

    case "viewers": {
      where = { ...where, isViewer: true };
      break;
    }

    case "admins": {
      where = { ...where, isAdmin: true };
      break;
    }

    case "suspended": {
      where = {
        ...where,
        suspendedAt: {
          [Op.ne]: null,
        },
      };
      break;
    }

    case "all": {
      break;
    }

    default: {
      where = {
        ...where,
        suspendedAt: {
          [Op.is]: null,
        },
      };
      break;
    }
  }

  if (query) {
    where = {
      ...where,
      name: {
        [Op.iLike]: `%${query}%`,
      },
    };
  }

  if (ids) {
    assertArray(ids, "ids must be an array of UUIDs");
    where = {
      ...where,
      id: ids,
    };
  }

  const [users, total] = await Promise.all([
    User.findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    }),
    User.count({
      where,
    }),
  ]);

  ctx.body = {
    pagination: { ...ctx.state.pagination, total },
    data: users.map((user) =>
      presentUser(user, {
        includeDetails: can(actor, "readDetails", user),
      })
    ),
    policies: presentPolicies(actor, users),
  };
});

router.post("users.count", auth(), async (ctx) => {
  const { user } = ctx.state;
  const counts = await User.getCounts(user.teamId);

  ctx.body = {
    data: {
      counts,
    },
  };
});

router.post("users.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  const actor = ctx.state.user;
  const user = id ? await User.findByPk(id) : actor;
  authorize(actor, "read", user);
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.update", auth(), async (ctx) => {
  const { user } = ctx.state;
  const { name, avatarUrl, language } = ctx.body;
  if (name) {
    user.name = name;
  }
  if (avatarUrl) {
    user.avatarUrl = avatarUrl;
  }
  if (language) {
    user.language = language;
  }
  await user.save();
  await Event.create({
    name: "users.update",
    actorId: user.id,
    userId: user.id,
    teamId: user.teamId,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentUser(user, {
      includeDetails: true,
    }),
  };
});

// Admin specific
router.post("users.promote", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  const actor = ctx.state.user;
  assertPresent(userId, "id is required");
  const user = await User.findByPk(userId);
  authorize(actor, "promote", user);

  await user.promote();
  await Event.create({
    name: "users.promote",
    actorId: actor.id,
    userId,
    teamId,
    data: {
      name: user.name,
    },
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.demote", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  let { to } = ctx.body;
  const actor = ctx.state.user;
  assertPresent(userId, "id is required");
  to = to === "viewer" ? "viewer" : "member";
  const user = await User.findByPk(userId);
  authorize(actor, "demote", user);

  await user.demote(teamId, to);
  await Event.create({
    name: "users.demote",
    actorId: actor.id,
    userId,
    teamId,
    data: {
      name: user.name,
    },
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.suspend", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const actor = ctx.state.user;
  assertPresent(userId, "id is required");
  const user = await User.findByPk(userId);
  authorize(actor, "suspend", user);

  await userSuspender({
    user,
    actorId: actor.id,
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.activate", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  const actor = ctx.state.user;
  assertPresent(userId, "id is required");
  const user = await User.findByPk(userId);
  authorize(actor, "activate", user);

  await user.activate();
  await Event.create({
    name: "users.activate",
    actorId: actor.id,
    userId,
    teamId,
    data: {
      name: user.name,
    },
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.invite", auth(), async (ctx) => {
  const { invites } = ctx.body;
  assertArray(invites, "invites must be an array");
  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "inviteUser", team);

  const response = await userInviter({
    user,
    invites,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: {
      sent: response.sent,
      users: response.users.map((user) => presentUser(user)),
    },
  };
});

router.post("users.resendInvite", auth(), async (ctx) => {
  const { id } = ctx.body;
  const actor = ctx.state.user;

  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    authorize(actor, "resendInvite", user);

    if (user.getFlag(UserFlag.InviteSent) > 2) {
      throw ValidationError("This invite has been sent too many times");
    }

    await InviteEmail.schedule({
      to: user.email,
      name: user.name,
      actorName: actor.name,
      actorEmail: actor.email,
      teamName: actor.team.name,
      teamUrl: actor.team.url,
    });

    user.incrementFlag(UserFlag.InviteSent);
    await user.save({ transaction });

    if (env.ENVIRONMENT === "development") {
      logger.info(
        "email",
        `Sign in immediately: ${
          env.URL
        }/auth/email.callback?token=${user.getEmailSigninToken()}`
      );
    }
  });

  ctx.body = {
    success: true,
  };
});

router.post("users.delete", auth(), async (ctx) => {
  const { confirmation, id } = ctx.body;
  assertPresent(confirmation, "confirmation is required");
  const actor = ctx.state.user;
  let user = actor;

  if (id) {
    user = await User.findByPk(id);
  }

  authorize(actor, "delete", user);
  await userDestroyer({
    user,
    actor,
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
