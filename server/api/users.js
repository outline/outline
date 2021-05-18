// @flow
import Router from "koa-router";
import userDestroyer from "../commands/userDestroyer";
import userInviter from "../commands/userInviter";
import userSuspender from "../commands/userSuspender";
import auth from "../middlewares/authentication";
import { Event, User, Team } from "../models";
import policy from "../policies";
import { presentUser, presentPolicies } from "../presenters";
import { Op } from "../sequelize";
import pagination from "./middlewares/pagination";

const { can, authorize } = policy;
const router = new Router();

router.post("users.list", auth(), pagination(), async (ctx) => {
  let {
    sort = "createdAt",
    query,
    direction,
    includeSuspended = false,
  } = ctx.body;
  if (direction !== "ASC") direction = "DESC";
  ctx.assertSort(sort, User);

  const actor = ctx.state.user;

  let where = {
    teamId: actor.teamId,
  };

  if (!includeSuspended) {
    where = {
      ...where,
      suspendedAt: {
        [Op.eq]: null,
      },
    };
  }

  if (query) {
    where = {
      ...where,
      name: {
        [Op.iLike]: `%${query}%`,
      },
    };
  }

  const users = await User.findAll({
    where,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: users.map((user) =>
      presentUser(user, { includeDetails: can(actor, "readDetails", user) })
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
    data: presentUser(user, { includeDetails }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.update", auth(), async (ctx) => {
  const { user } = ctx.state;
  const { name, avatarUrl, language } = ctx.body;

  if (name) user.name = name;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (language) user.language = language;

  await user.save();

  await Event.create({
    name: "users.update",
    actorId: user.id,
    userId: user.id,
    teamId: user.teamId,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

// Admin specific

router.post("users.promote", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  const actor = ctx.state.user;
  ctx.assertPresent(userId, "id is required");

  const user = await User.findByPk(userId);
  authorize(actor, "promote", user);

  await user.promote();

  await Event.create({
    name: "users.promote",
    actorId: actor.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, { includeDetails }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.demote", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  let { to } = ctx.body;

  const actor = ctx.state.user;
  ctx.assertPresent(userId, "id is required");

  to = to === "Viewer" ? "Viewer" : "Member";

  const user = await User.findByPk(userId);

  authorize(actor, "demote", user);

  await user.demote(teamId, to);

  await Event.create({
    name: "users.demote",
    actorId: actor.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, { includeDetails }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.suspend", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const actor = ctx.state.user;
  ctx.assertPresent(userId, "id is required");

  const user = await User.findByPk(userId);
  authorize(actor, "suspend", user);

  await userSuspender({
    user,
    actorId: actor.id,
    ip: ctx.request.ip,
  });

  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, { includeDetails }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.activate", auth(), async (ctx) => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  const actor = ctx.state.user;
  ctx.assertPresent(userId, "id is required");

  const user = await User.findByPk(userId);
  authorize(actor, "activate", user);

  await user.activate();

  await Event.create({
    name: "users.activate",
    actorId: actor.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, { includeDetails }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.invite", auth(), async (ctx) => {
  const { invites } = ctx.body;
  ctx.assertPresent(invites, "invites is required");

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "invite", team);

  const response = await userInviter({ user, invites, ip: ctx.request.ip });

  ctx.body = {
    data: {
      sent: response.sent,
      users: response.users.map((user) => presentUser(user)),
    },
  };
});

router.post("users.delete", auth(), async (ctx) => {
  const { confirmation, id } = ctx.body;
  ctx.assertPresent(confirmation, "confirmation is required");

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
