// @flow
import Router from "koa-router";
import Sequelize from "sequelize";
import auth from "../middlewares/authentication";
import { Event, Team, User, Collection } from "../models";
import policy from "../policies";
import { presentEvent } from "../presenters";
import pagination from "./middlewares/pagination";

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();

router.post("events.list", auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;
  let {
    sort = "createdAt",
    actorId,
    collectionId,
    direction,
    name,
    auditLog = false,
  } = ctx.body;
  if (direction !== "ASC") direction = "DESC";

  let where = {
    name: Event.ACTIVITY_EVENTS,
    teamId: user.teamId,
  };

  if (actorId) {
    ctx.assertUuid(actorId, "actorId must be a UUID");
    where = {
      ...where,
      actorId,
    };
  }

  if (collectionId) {
    ctx.assertUuid(collectionId, "collection must be a UUID");

    where = { ...where, collectionId };
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "read", collection);
  } else {
    const collectionIds = await user.collectionIds({ paranoid: false });
    where = {
      ...where,
      [Op.or]: [
        { collectionId: collectionIds },
        {
          collectionId: {
            [Op.eq]: null,
          },
        },
      ],
    };
  }

  if (auditLog) {
    authorize(user, "auditLog", Team);
    where.name = Event.AUDIT_EVENTS;
  }

  if (name && where.name.includes(name)) {
    where.name = name;
  }

  const events = await Event.findAll({
    where,
    order: [[sort, direction]],
    include: [
      {
        model: User,
        as: "actor",
        paranoid: false,
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: events.map((event) => presentEvent(event, auditLog)),
  };
});

export default router;
