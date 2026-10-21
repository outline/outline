import Router from "@koa/router";
import { uniqBy } from "es-toolkit/compat";
import { Op } from "sequelize";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, GroupMembership, GroupUser } from "@server/models";
import {
  presentDocuments,
  presentGroup,
  presentGroupMembership,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "groupMemberships.list",
  auth(),
  pagination(),
  validate(T.GroupMembershipsListSchema),
  async (ctx: APIContext<T.GroupMembershipsListReq>) => {
    const { groupId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const userId = user.id;

    // Filtering on the user's groups up front lets the query use the groupId
    // index rather than scanning every document membership.
    const groupUsers = await GroupUser.findAll({
      attributes: ["groupId"],
      where: groupId ? { userId, groupId } : { userId },
    });

    const { count, rows: memberships } = await GroupMembership.findAndCountAll({
      distinct: true,
      col: "id",
      where: {
        groupId: groupUsers.map((groupUser) => groupUser.groupId),
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
          },
        },
        {
          association: "group",
          required: true,
          include: [
            {
              association: "groupUsers",
              required: true,
              where: {
                userId,
              },
            },
          ],
        },
      ],
      order: [
        ["createdAt", "DESC"],
        ["id", "ASC"],
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const documentIds = memberships
      .map((p) => p.documentId)
      .filter(Boolean) as string[];
    const documents = await Document.withMembershipScope(userId, {
      includeDrafts: true,
    }).findAll({
      where: {
        id: documentIds,
      },
    });

    const groups = uniqBy(
      memberships.map((membership) => membership.group),
      "id"
    );
    const policies = presentPolicies(user, [
      ...documents,
      ...memberships,
      ...groups,
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total: count },
      data: {
        groups: await Promise.all(groups.map(presentGroup)),
        groupMemberships: memberships.map(presentGroupMembership),
        documents: await presentDocuments(ctx, documents),
      },
      policies,
    };
  }
);

export default router;
