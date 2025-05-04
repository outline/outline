import Router from "koa-router";
import uniqBy from "lodash/uniqBy";
import { Op } from "sequelize";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, GroupMembership } from "@server/models";
import {
  presentDocument,
  presentGroup,
  presentGroupMembership,
  presentPolicies,
} from "@server/presenters";
import { APIContext } from "@server/types";
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

    const memberships = await GroupMembership.findAll({
      where: {
        documentId: {
          [Op.ne]: null,
        },
        sourceId: {
          [Op.eq]: null,
        },
      },
      include: [
        {
          association: "group",
          required: true,
          where: groupId ? { id: groupId } : undefined,
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
      pagination: ctx.state.pagination,
      data: {
        groups: await Promise.all(groups.map(presentGroup)),
        groupMemberships: memberships.map(presentGroupMembership),
        documents: await Promise.all(
          documents.map((document: Document) => presentDocument(ctx, document))
        ),
      },
      policies,
    };
  }
);

export default router;
