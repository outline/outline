import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import auth from "@server/middlewares/authentication";
import { Event, User, Collection } from "@server/models";
import { authorize } from "@server/policies";
import { presentEvent } from "@server/presenters";
import { assertSort, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("events.list", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;
  let { direction } = ctx.body;
  const {
    sort = "createdAt",
    actorId,
    documentId,
    collectionId,
    name,
    auditLog = false,
  } = ctx.body;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  assertSort(sort, Event);

  let where: WhereOptions<Event> = {
    name: Event.ACTIVITY_EVENTS,
    teamId: user.teamId,
  };

  if (actorId) {
    assertUuid(actorId, "actorId must be a UUID");
    where = { ...where, actorId };
  }

  if (documentId) {
    assertUuid(documentId, "documentId must be a UUID");
    where = { ...where, documentId };
  }

  if (auditLog) {
    authorize(user, "manage", user.team);
    where.name = Event.AUDIT_EVENTS;
  }

  if (name && (where.name as string[]).includes(name)) {
    where.name = name;
  }

  if (collectionId) {
    assertUuid(collectionId, "collection must be a UUID");
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
      [Op.or]: [
        {
          collectionId: collectionIds,
        },
        {
          collectionId: {
            [Op.is]: null,
          },
        },
      ],
    };
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
    data: await Promise.all(
      events.map((event) => presentEvent(event, auditLog))
    ),
  };
});

export default router;
