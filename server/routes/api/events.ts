import Router from "koa-router";
import Sequelize from "sequelize";
import auth from "../../middlewares/authentication";
import { Event, User, Collection } from "../../models";
import policy from "../../policies";
import { presentEvent } from "../../presenters";
import pagination from "./middlewares/pagination";

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();
router.post("events.list", auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;
  let { direction } = ctx.body;
  const {
    sort = "createdAt",
    actorId,
    documentId,
    collectionId,
    name,
    auditLog = false,
  } = ctx.body;
  if (direction !== "ASC") direction = "DESC";
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'assertSort' does not exist on type 'Para... Remove this comment to see the full error message
  ctx.assertSort(sort, Event);
  let where = {
    name: Event.ACTIVITY_EVENTS,
    teamId: user.teamId,
  };

  if (actorId) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'assertUuid' does not exist on type 'Para... Remove this comment to see the full error message
    ctx.assertUuid(actorId, "actorId must be a UUID");
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ actorId: any; name: any; teamId: any; }' i... Remove this comment to see the full error message
    where = { ...where, actorId };
  }

  if (documentId) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'assertUuid' does not exist on type 'Para... Remove this comment to see the full error message
    ctx.assertUuid(documentId, "documentId must be a UUID");
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ documentId: any; name: any; teamId: any; }... Remove this comment to see the full error message
    where = { ...where, documentId };
  }

  if (collectionId) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'assertUuid' does not exist on type 'Para... Remove this comment to see the full error message
    ctx.assertUuid(collectionId, "collection must be a UUID");
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ collectionId: any; name: any; teamId: any;... Remove this comment to see the full error message
    where = { ...where, collectionId };
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "read", collection);
  } else {
    const collectionIds = await user.collectionIds({
      paranoid: false,
    });
    where = {
      ...where,
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ [Sequelize.Op.or]: { collectionId: any; }[... Remove this comment to see the full error message
      [Op.or]: [
        {
          collectionId: collectionIds,
        },
        {
          collectionId: {
            [Op.eq]: null,
          },
        },
      ],
    };
  }

  if (auditLog) {
    authorize(user, "manage", user.team);
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
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'event' implicitly has an 'any' type.
    data: events.map((event) => presentEvent(event, auditLog)),
  };
});

export default router;
