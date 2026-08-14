import Router from "koa-router";
import { Op, Sequelize } from "sequelize";
import { UserMembershipSection } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Event, UserMembership } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentDocuments,
  presentMembership,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "userMemberships.list",
  auth(),
  pagination(),
  validate(T.UserMembershipsListSchema),
  async (ctx: APIContext<T.UserMembershipsListReq>) => {
    const { section } = ctx.input.body;
    const { user } = ctx.state.auth;

    const sectionWhere =
      section === UserMembershipSection.Private
        ? {
            collectionId: {
              [Op.eq]: null,
            },
            parentDocumentId: {
              [Op.eq]: null,
            },
            createdById: user.id,
          }
        : section === UserMembershipSection.SharedWithMe
          ? {
              [Op.or]: [
                { collectionId: { [Op.ne]: null } },
                { createdById: { [Op.ne]: user.id } },
              ],
            }
          : {};

    const memberships = await UserMembership.scope("withUser").findAll({
      where: {
        userId: user.id,
        documentId: {
          [Op.ne]: null,
        },
        sourceId: {
          [Op.eq]: null,
        },
      },
      include: [
        {
          model: Document.unscoped(),
          as: "document",
          required: true,
          attributes: [],
          where: {
            archivedAt: {
              [Op.eq]: null,
            },
            ...sectionWhere,
          },
        },
      ],
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
        documents: await presentDocuments(ctx, documents),
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
    const membership = await UserMembership.scope("withUser").findByPk(id, {
      transaction,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: UserMembership,
      },
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
