import Router from "koa-router";

import { Op, Sequelize } from "sequelize";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Event, UserPermission } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentDocument,
  presentMembership,
  presentPolicies,
} from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "userMemberships.list",
  auth(),
  pagination(),
  validate(T.UserMembershipsListSchema),
  async (ctx: APIContext<T.UserMembershipsListReq>) => {
    const { user } = ctx.state.auth;

    const permissions = await UserPermission.findAll({
      where: {
        userId: user.id,
        documentId: {
          [Op.ne]: null,
        },
        sourceId: {
          [Op.eq]: null,
        },
      },
      order: [
        Sequelize.literal('"user_permission"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const documentIds = permissions.map((p) => p.documentId);
    const documents = await Document.scope([
      "withDrafts",
      { method: ["withMembership", user.id] },
      { method: ["withCollectionPermissions", user.id] },
    ]).findAll({
      where: {
        id: documentIds,
      },
    });

    const policies = presentPolicies(user, [...documents, ...permissions]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        memberships: permissions.map(presentMembership),
        documents: await Promise.all(
          documents.map((document: Document) => presentDocument(document))
        ),
      },
      policies,
    };
  }
);

router.post(
  "userMemberships.update",
  auth(),
  validate(T.UserMembershipsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.UserMembershipsUpdateReq>) => {
    const { id, index } = ctx.input.body;
    const { transaction } = ctx.state;

    const { user } = ctx.state.auth;
    const membership = await UserPermission.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
    });
    authorize(user, "update", membership);

    membership.index = index;
    await membership.save({ transaction });

    await Event.create(
      {
        name: "userMemberships.update",
        modelId: membership.id,
        userId: membership.userId,
        teamId: user.teamId,
        actorId: user.id,
        documentId: membership.documentId,
        ip: ctx.request.ip,
        data: {
          index: membership.index,
        },
      },
      { transaction }
    );

    ctx.body = {
      data: presentMembership(membership),
      policies: presentPolicies(user, [membership]),
    };
  }
);

export default router;
