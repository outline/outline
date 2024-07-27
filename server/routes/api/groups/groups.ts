import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { User, Event, Group, GroupUser } from "@server/models";
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
    const { sort, direction, query, userId, name } = ctx.input.body;
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

    const groups = await Group.filterByMember(userId).findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        groups: groups.map(presentGroup),
        groupMemberships: groups
          .map((group) =>
            group.groupUsers
              .filter((groupUser) => !!groupUser.user)
              .slice(0, MAX_AVATAR_DISPLAY)
          )
          .flat()
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
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const group = await Group.findByPk(id);
    authorize(user, "read", group);

    ctx.body = {
      data: presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.create",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.GroupsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsCreateReq>) => {
    const { name } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    authorize(user, "createGroup", user.team);
    const g = await Group.create(
      {
        name,
        teamId: user.teamId,
        createdById: user.id,
      },
      { transaction }
    );

    // reload to get default scope
    const group = await Group.findByPk(g.id, {
      transaction,
      rejectOnEmpty: true,
    });

    await Event.createFromContext(
      ctx,
      {
        name: "groups.create",
        modelId: group.id,
        data: {
          name: group.name,
        },
      },
      { transaction }
    );

    ctx.body = {
      data: presentGroup(group),
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
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, { transaction });
    authorize(user, "update", group);

    group.name = name;

    if (group.changed()) {
      await group.save({ transaction });
      await Event.createFromContext(
        ctx,
        {
          name: "groups.update",
          modelId: group.id,
          data: {
            name,
          },
        },
        { transaction }
      );
    }

    ctx.body = {
      data: presentGroup(group),
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

    const group = await Group.findByPk(id, { transaction });
    authorize(user, "delete", group);

    await group.destroy({ transaction });
    await Event.createFromContext(
      ctx,
      {
        name: "groups.delete",
        modelId: group.id,
        data: {
          name: group.name,
        },
      },
      { transaction }
    );

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

    const groupUsers = await GroupUser.findAll({
      where: {
        groupId: id,
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
      include: [
        {
          model: User,
          as: "user",
          where: userWhere,
          required: true,
        },
      ],
    });

    ctx.body = {
      pagination: ctx.state.pagination,
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

    let group = await Group.findByPk(id, { transaction });
    authorize(actor, "update", group);

    let groupUser = await GroupUser.findOne({
      where: {
        groupId: id,
        userId,
      },
      transaction,
    });

    if (!groupUser) {
      await group.$add("user", user, {
        through: {
          createdById: actor.id,
        },
        transaction,
      });
      // reload to get default scope
      groupUser = await GroupUser.findOne({
        where: {
          groupId: id,
          userId,
        },
        rejectOnEmpty: true,
        transaction,
      });

      // reload to get default scope
      group = await Group.findByPk(id, { transaction, rejectOnEmpty: true });

      await Event.createFromContext(
        ctx,
        {
          name: "groups.add_user",
          userId,
          modelId: group.id,
          data: {
            name: user.name,
          },
        },
        { transaction }
      );
    }

    ctx.body = {
      data: {
        users: [presentUser(user)],
        groupMemberships: [presentGroupUser(groupUser, { includeUser: true })],
        groups: [presentGroup(group)],
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

    let group = await Group.findByPk(id, { transaction });
    authorize(actor, "update", group);

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    await group.$remove("user", user, { transaction });
    await Event.createFromContext(
      ctx,
      {
        name: "groups.remove_user",
        userId,
        modelId: group.id,
        data: {
          name: user.name,
        },
      },
      { transaction }
    );

    // reload to get default scope
    group = await Group.findByPk(id, { transaction, rejectOnEmpty: true });

    ctx.body = {
      data: {
        groups: [presentGroup(group)],
      },
    };
  }
);

export default router;
