import Router from "@koa/router";
import { intersection } from "es-toolkit/compat";
import type { WhereOptions } from "sequelize";
import { Op, Sequelize } from "sequelize";
import { EventHelper } from "@shared/utils/EventHelper";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Event, User, Collection, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentEvent } from "@server/presenters";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";
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
      name,
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
      actorId: { [Op.ne]: null },
    };

    if (auditLog) {
      authorize(user, "audit", user.team);
      where.name = events
        ? intersection(EventHelper.AUDIT_EVENTS, events)
        : EventHelper.AUDIT_EVENTS;
    } else {
      where.name = events
        ? intersection(EventHelper.ACTIVITY_EVENTS, events)
        : EventHelper.ACTIVITY_EVENTS;
    }

    if (name && (where.name as string[]).includes(name)) {
      where.name = name;
    }

    if (actorId) {
      const actor = await User.findByPk(actorId);
      authorize(user, "readDetails", actor);
      where = { ...where, actorId };
    }

    // Non-admins must specify either documentId or collectionId to use the read policy
    if (!documentId && !collectionId) {
      if (!user.isAdmin) {
        authorize(user, "listAllEvents", user.team);
      }

      // Exclude events in the personal collections of other users.
      const personalCollections = `SELECT "id" FROM "collections" WHERE "teamId" = ${sequelize.escape(
        user.teamId
      )} AND "ownerId" IS NOT NULL AND "ownerId" != ${sequelize.escape(user.id)}`;

      where = {
        ...where,
        [Op.and]: [
          {
            [Op.or]: [
              { collectionId: { [Op.is]: null } },
              {
                collectionId: {
                  [Op.notIn]: Sequelize.literal(`(${personalCollections})`),
                },
              },
            ],
          },
          {
            [Op.or]: [
              { documentId: { [Op.is]: null } },
              {
                documentId: {
                  [Op.notIn]: Sequelize.literal(
                    `(SELECT "id" FROM "documents" WHERE "collectionId" IN (${personalCollections}))`
                  ),
                },
              },
            ],
          },
        ],
      };
    }

    if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
        includeContent: false,
      });
      authorize(user, "read", document);
      where = { ...where, documentId };
    }

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
      authorize(user, "read", collection);
      where = { ...where, collectionId };
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
      data: loadedEvents.map((event) => presentEvent(event, auditLog)),
    };
  }
);

export default router;
