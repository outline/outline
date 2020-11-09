// @flow
import Router from "koa-router";
import Sequelize from "sequelize";
import auth from "../middlewares/authentication";
import { Event, Team, User } from "../models";
import policy from "../policies";
import { presentEvent } from "../presenters";
import pagination from "./middlewares/pagination";

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();

router.post("events.list", auth(), pagination(), async (ctx) => {
  let { sort = "createdAt", direction, auditLog = false } = ctx.body;
  if (direction !== "ASC") direction = "DESC";

  const user = ctx.state.user;
  const collectionIds = await user.collectionIds({ paranoid: false });

  let where = {
    name: Event.ACTIVITY_EVENTS,
    teamId: user.teamId,
    [Op.or]: [
      { collectionId: collectionIds },
      {
        collectionId: {
          [Op.eq]: null,
        },
      },
    ],
  };

  if (auditLog) {
    authorize(user, "auditLog", Team);
    where.name = Event.AUDIT_EVENTS;
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
