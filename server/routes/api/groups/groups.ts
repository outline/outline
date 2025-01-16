import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { User, Group, GroupUser } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentGroup,
  presentGroupUser,
  presentPolicies,
  presentUser,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "groups.list",
  auth(),
  pagination(),
  validate(T.GroupsListSchema),
  async (ctx: APIContext<T.GroupsListReq>) => {
    const { sort, direction, query, userId, externalId, name } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "listGroups", user.team);

    let where: WhereOptions<Group> = {
      teamId: user.teamId,
    };

    if (name) {
      where = {
        ...where,
        name: {
          [Op.eq]: name,
        },
      };
    } else if (query) {
      where = {
        ...where,
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    if (externalId) {
      where = {
        ...where,
        externalId,
      };
    }

    const groups = await Group.filterByMember(userId).findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        groups: await Promise.all(groups.map(presentGroup)),
        // TODO: Deprecated, will remove in the future as language conflicts with GroupMembership
        groupMemberships: (
          await Promise.all(
            groups.map((group) =>
              GroupUser.findAll({
                where: {
                  groupId: group.id,
                },
                limit: MAX_AVATAR_DISPLAY,
              })
            )
          )
        )
          .flat()
          .filter((groupUser) => groupUser.user)
          .map((groupUser) =>
            presentGroupUser(groupUser, { includeUser: true })
          ),
      },
      policies: presentPolicies(user, groups),
    };
  }
);

router.post(
  "groups.info",
  auth(),
  validate(T.GroupsInfoSchema),
  async (ctx: APIContext<T.GroupsInfoReq>) => {
    const { id, externalId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const group = id
      ? await Group.findByPk(id)
      : externalId
      ? await Group.findOne({ where: { externalId } })
      : null;
    authorize(user, "read", group);

    ctx.body = {
      data: await presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.GroupsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsCreateReq>) => {
    const { name, externalId } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "createGroup", user.team);

    const group = await Group.createWithCtx(ctx, {
      name,
      externalId,
      teamId: user.teamId,
      createdById: user.id,
    });

    ctx.body = {
      data: await presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.update",
  auth(),
  validate(T.GroupsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsUpdateReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "update", group);

    await group.updateWithCtx(ctx, ctx.input.body);

    ctx.body = {
      data: await presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.delete",
  auth(),
  validate(T.GroupsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", group);

    await group.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "groups.memberships",
  auth(),
  pagination(),
  validate(T.GroupsMembershipsSchema),
  async (ctx: APIContext<T.GroupsMembershipsReq>) => {
    const { id, query } = ctx.input.body;
    const { user } = ctx.state.auth;

    const group = await Group.findByPk(id);
    authorize(user, "read", group);
    let userWhere;

    if (query) {
      userWhere = {
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    const options = {
      where: {
        groupId: id,
      },
      include: [
        {
          model: User,
          as: "user",
          where: userWhere,
          required: true,
        },
      ],
    };

    const [total, groupUsers] = await Promise.all([
      GroupUser.count(options),
      GroupUser.findAll({
        ...options,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        groupMemberships: groupUsers.map((groupUser) =>
          presentGroupUser(groupUser, { includeUser: true })
        ),
        users: groupUsers.map((groupUser) => presentUser(groupUser.user)),
      },
    };
  }
);

router.post(
  "groups.add_user",
  auth(),
  validate(T.GroupsAddUserSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsAddUserReq>) => {
    const { id, userId } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    const group = await Group.findByPk(id, { transaction });
    authorize(actor, "update", group);

    const [groupUser] = await GroupUser.findOrCreateWithCtx(
      ctx,
      {
        where: {
          groupId: group.id,
          userId: user.id,
        },
        defaults: {
          createdById: actor.id,
        },
      },
      { name: "add_user" }
    );

    groupUser.user = user;

    ctx.body = {
      data: {
        users: [presentUser(user)],
        groupMemberships: [presentGroupUser(groupUser, { includeUser: true })],
        groups: [await presentGroup(group)],
      },
    };
  }
);

router.post(
  "groups.remove_user",
  auth(),
  validate(T.GroupsRemoveUserSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsRemoveUserReq>) => {
    const { id, userId } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, { transaction });
    authorize(actor, "update", group);

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    const groupUser = await GroupUser.unscoped().findOne({
      where: {
        groupId: group.id,
        userId: user.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    await groupUser?.destroyWithCtx(ctx, { name: "remove_user" });

    ctx.body = {
      data: {
        groups: [await presentGroup(group)],
      },
    };
  }
);

export default router;
