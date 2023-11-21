import Router from "koa-router";

import { Op, Sequelize } from "sequelize";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Event, UserPermission } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentDocument,
  presentDocumentMembership,
  presentPolicies,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { userPermissionIndexing } from "@server/utils/indexing";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "userMemberships.list",
  auth(),
  pagination(),
  validate(T.UserMembershipsListSchema),
  async (ctx: APIContext<T.UserMembershipsListReq>) => {
    const user = ctx.state.auth.user;

    const permissions = await UserPermission.findAll({
      where: {
        userId: user.id,
        documentId: {
          [Op.ne]: null,
        },
      },
      order: [
        Sequelize.literal('"user_permission"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const nullIndex = permissions.findIndex(
      (permission) => permission.index === null
    );

    if (nullIndex !== -1) {
      const indexedPermissions = await userPermissionIndexing(user.id);
      permissions.forEach((permission) => {
        permission.index = indexedPermissions[permission.id];
      });
    }

    const documentIds = permissions.map((p) => p.documentId);
    const documents = await Document.scope([
      "withDrafts",
      { method: ["withMembership", user.id] },
    ]).findAll({
      where: {
        id: documentIds,
      },
    });

    const policies = presentPolicies(user, [...documents, ...permissions]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        memberships: permissions.map(presentDocumentMembership),
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
    const membership = await UserPermission.findByPk(id, { transaction });
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
      },
      { transaction }
    );

    ctx.body = {
      data: presentDocumentMembership(membership),
      policies: presentPolicies(user, [membership]),
    };
  }
);

export default router;
