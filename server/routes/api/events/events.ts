import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import { EventHelper } from "@shared/utils/EventHelper";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Event, User, Collection } from "@server/models";
import { authorize } from "@server/policies";
import { presentEvent } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "events.list",
  auth(),
  pagination(),
  validate(T.EventsListSchema),
  async (ctx: APIContext<T.EventsListReq>) => {
    const { user } = ctx.state.auth;
    const {
      events,
      auditLog,
      actorId,
      documentId,
      collectionId,
      sort,
      direction,
    } = ctx.input.body;

    let where: WhereOptions<Event> = {
      teamId: user.teamId,
    };

    if (events?.length) {
      where.name = events;
    } else {
      where.name = EventHelper.ACTIVITY_EVENTS;
    }

    if (auditLog) {
      authorize(user, "audit", user.team);

      if (!where.name) {
        where.name = EventHelper.AUDIT_EVENTS;
      }
    }

    if (actorId) {
      where = { ...where, actorId };
    }

    if (documentId) {
      where = { ...where, documentId };
    }

    if (collectionId) {
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

    const loadedEvents = await Event.findAll({
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
        loadedEvents.map((event) => presentEvent(event, auditLog))
      ),
    };
  }
);

export default router;
