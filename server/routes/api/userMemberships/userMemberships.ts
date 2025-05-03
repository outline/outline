import Router from "koa-router";
import { Op, Sequelize } from "sequelize";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Event, UserMembership } from "@server/models";
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

    const memberships = await UserMembership.findAll({
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

    const documentIds = memberships
      .map((p) => p.documentId)
      .filter(Boolean) as string[];
    const documents = await Document.findByIds(documentIds, {
      userId: user.id,
    });

    const policies = presentPolicies(user, [...documents, ...memberships]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        memberships: memberships.map(presentMembership),
        documents: await Promise.all(
          documents.map((document: Document) => presentDocument(ctx, document))
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
    const membership = await UserMembership.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });
    authorize(user, "update", membership);

    membership.index = index;
    await membership.save({ transaction });

    await Event.createFromContext(ctx, {
      name: "userMemberships.update",
      modelId: membership.id,
      userId: membership.userId,
      documentId: membership.documentId,
      data: {
        index: membership.index,
      },
    });

    ctx.body = {
      data: presentMembership(membership),
      policies: presentPolicies(user, [membership]),
    };
  }
);

export default router;
