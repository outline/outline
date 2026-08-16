import Router from "koa-router";
import { uniq } from "es-toolkit/compat";
import type { WhereOptions } from "sequelize";
import { Op } from "sequelize";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import type { Filter } from "@shared/helpers/FilterHelper";
import { GroupPermission, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  User,
  Group,
  GroupUser,
  ExternalGroup,
  AuthenticationProvider,
} from "@server/models";
import {
  buildWhere,
  collectEqValues,
  combineFilters,
  legacyGroupParamsToFilter,
  replaceFieldInFilter,
} from "@server/models/helpers/Filters";
import { authorize } from "@server/policies";
import { ValidationError } from "@server/errors";
import {
  presentGroup,
  presentGroupUser,
  presentPolicies,
  presentUser,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { QueryHelper } from "@server/storage/QueryHelper";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

/** Value of the `source` filter field matching groups with no external link. */
const MANUAL_SOURCE = "manual";

/**
 * Resolve the filter fields that do not map to a column of Group — `userId`
 * and `source` — into `id` leaves the query layer can execute.
 *
 * @param filter the filter to resolve.
 * @param teamId the team the request is scoped to.
 * @returns the filter with both fields replaced.
 */
async function resolveGroupFilter(
  filter: Filter,
  teamId: string
): Promise<Filter> {
  let resolved = filter;

  const userIds = uniq(collectEqValues(resolved, "userId"));
  if (userIds.length) {
    const groupUsers = await GroupUser.findAll({
      attributes: ["groupId", "userId"],
      where: { userId: userIds },
    });

    resolved = replaceFieldInFilter(resolved, "userId", (values) => ({
      field: "id",
      operator: "in",
      value: uniq(
        groupUsers
          .filter((groupUser) => values.includes(groupUser.userId))
          .map((groupUser) => groupUser.groupId)
      ),
    }));
  }

  const sources = uniq(collectEqValues(resolved, "source"));
  if (sources.length) {
    const externalGroups = await ExternalGroup.findAll({
      attributes: ["groupId"],
      where: {
        teamId,
        groupId: { [Op.ne]: null },
      },
      include: [
        {
          model: AuthenticationProvider,
          as: "authenticationProvider",
          attributes: ["name"],
        },
      ],
    });

    const syncedIds = uniq(
      externalGroups
        .map((externalGroup) => externalGroup.groupId)
        .filter((id): id is string => id !== null)
    );
    const idsByProvider = new Map<string, string[]>();
    for (const externalGroup of externalGroups) {
      const provider = externalGroup.authenticationProvider?.name;
      if (!provider || !externalGroup.groupId) {
        continue;
      }
      idsByProvider.set(provider, [
        ...(idsByProvider.get(provider) ?? []),
        externalGroup.groupId,
      ]);
    }

    resolved = replaceFieldInFilter(resolved, "source", (values) => {
      const providerIds = uniq(
        values
          .filter((value) => value !== MANUAL_SOURCE)
          .flatMap((value) => idsByProvider.get(value) ?? [])
      );
      const synced: Filter = {
        field: "id",
        operator: "in",
        value: providerIds,
      };

      if (!values.includes(MANUAL_SOURCE)) {
        return synced;
      }

      // With nothing synced every group is manual, which `notIn []` cannot
      // express – every group has an id, so match on that instead.
      const manual: Filter = syncedIds.length
        ? { field: "id", operator: "notIn", value: syncedIds }
        : { field: "id", operator: "isNotNull" };

      return providerIds.length
        ? { operator: "OR", filters: [manual, synced] }
        : manual;
    });
  }

  return resolved;
}

/** Standard include for loading ExternalGroup with its AuthenticationProvider. */
const externalGroupInclude = {
  model: ExternalGroup,
  as: "externalGroups",
  required: false,
  include: [
    {
      model: AuthenticationProvider,
      as: "authenticationProvider",
      attributes: ["id", "name", "providerId"],
    },
  ],
};

router.post(
  "groups.list",
  auth(),
  pagination(),
  validate(T.GroupsListSchema),
  async (ctx: APIContext<T.GroupsListReq>) => {
    const {
      sort,
      direction,
      query,
      userId,
      externalId,
      name,
      source,
      filters: rawFilters,
    } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "listGroups", user.team);

    const where: WhereOptions<Group> & {
      [Op.and]: WhereOptions<Group>[];
    } = {
      teamId: user.teamId,
      [Op.and]: [],
    };

    // The schema rejects callers that combine `filters` with the deprecated
    // top-level params, so exactly one of these is set.
    const filter =
      combineFilters(rawFilters) ??
      legacyGroupParamsToFilter({ userId, externalId, name, source });

    if (filter) {
      where[Op.and].push(
        buildWhere<Group>(await resolveGroupFilter(filter, user.teamId))
      );
    }

    if (query) {
      where[Op.and].push({
        name: { [Op.iLike]: QueryHelper.likeContains(query) },
      });
    }

    const [groups, total] = await Promise.all([
      Group.findAll({
        where,
        include: [
          {
            model: GroupUser,
            as: "groupUsers",
            required: false,
            where: {
              userId: user.id,
            },
          },
          externalGroupInclude,
        ],
        order: [
          sort === "source"
            ? [
                { model: ExternalGroup, as: "externalGroups" },
                { model: AuthenticationProvider, as: "authenticationProvider" },
                "name",
                direction,
              ]
            : [sort, direction],
        ],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Group.count({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        groups: await Promise.all(groups.map(presentGroup)),
        // TODO: Deprecated, will remove in the future as language conflicts with GroupMembership
        groupMemberships: (
          await Promise.all(
            groups.map((group) =>
              GroupUser.scope("withUser").findAll({
                where: {
                  groupId: group.id,
                },
                order: [["permission", "ASC"]],
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

    const include = [
      {
        model: GroupUser,
        as: "groupUsers",
        required: false,
        where: {
          userId: user.id,
        },
      },
      externalGroupInclude,
    ];

    const group = id
      ? await Group.findByPk(id, { include })
      : externalId
        ? await Group.findOne({
            include,
            where: { teamId: user.teamId, externalId },
          })
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
    const { name, externalId, disableMentions } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "createGroup", user.team);

    const group = await Group.createWithCtx(ctx, {
      name,
      externalId,
      disableMentions,
      teamId: user.teamId,
      createdById: user.id,
    });

    group.groupUsers = [];
    group.externalGroups = [];

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
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: user.id,
          },
        },
        externalGroupInclude,
      ],
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Group,
      },
    });
    authorize(user, "update", group);

    if (
      group.externalGroups?.length &&
      ctx.input.body.name !== undefined &&
      ctx.input.body.name !== group.name
    ) {
      throw ValidationError(
        "The name of a group synced from an external provider cannot be changed"
      );
    }

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
      include: [externalGroupInclude],
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Group,
      },
    });
    authorize(user, "delete", group);

    await group.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "groups.deleteAll",
  auth({ role: UserRole.Admin }),
  validate(T.GroupsDeleteAllSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsDeleteAllReq>) => {
    const { authenticationProviderId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const authenticationProvider = await AuthenticationProvider.findByPk(
      authenticationProviderId,
      { transaction }
    );
    authorize(user, "update", authenticationProvider);

    const groupIds = await ExternalGroup.findAll({
      attributes: ["groupId"],
      where: {
        authenticationProviderId,
        teamId: user.teamId,
        groupId: { [Op.ne]: null },
      },
      transaction,
    }).then((egs) =>
      egs.map((eg) => eg.groupId).filter((id): id is string => id !== null)
    );

    if (groupIds.length) {
      await Group.destroy({
        where: { id: groupIds },
        transaction,
      });
    }

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
    const { id, query, permission } = ctx.input.body;
    const { user } = ctx.state.auth;

    const group = await Group.findByPk(id);
    authorize(user, "read", group);
    let userWhere;

    if (query) {
      userWhere = {
        name: { [Op.iLike]: QueryHelper.likeContains(query) },
      };
    }

    const groupUserWhere: Record<string, unknown> = {
      groupId: id,
    };

    if (permission) {
      groupUserWhere.permission = permission;
    }

    const options = {
      where: groupUserWhere,
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
    const { id, userId, permission } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    // Load group with group users for authorization
    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: actor.id,
          },
        },
        externalGroupInclude,
      ],
    });
    authorize(actor, "update", group);

    if (group.externalGroups?.length) {
      throw ValidationError(
        "This group is managed by an external provider and its membership cannot be modified"
      );
    }

    const userPermission = permission;

    const [groupUser] = await GroupUser.findOrCreateWithCtx(
      ctx,
      {
        where: {
          groupId: group.id,
          userId: user.id,
        },
        defaults: {
          createdById: actor.id,
          permission: userPermission || GroupPermission.Member,
        },
      },
      { name: "add_user" }
    );

    // If the user already exists in the group, update the permission if provided
    if (
      userPermission !== undefined &&
      groupUser.permission !== userPermission
    ) {
      await groupUser.updateWithCtx(ctx, { permission: userPermission });
    }

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

    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: actor.id,
          },
        },
        externalGroupInclude,
      ],
    });
    authorize(actor, "update", group);

    if (group.externalGroups?.length) {
      throw ValidationError(
        "This group is managed by an external provider and its membership cannot be modified"
      );
    }

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

router.post(
  "groups.update_user",
  auth(),
  validate(T.GroupsUpdateUserSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsUpdateUserReq>) => {
    const { id, userId, permission } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    // Load group with group users for authorization
    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: actor.id,
          },
        },
        externalGroupInclude,
      ],
    });
    authorize(actor, "update", group);

    if (group.externalGroups?.length) {
      throw ValidationError(
        "This group is managed by an external provider and its membership cannot be modified"
      );
    }

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    const groupUser = await GroupUser.unscoped().findOne({
      where: {
        groupId: group.id,
        userId: user.id,
      },
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: GroupUser,
      },
    });

    await groupUser.updateWithCtx(ctx, { permission });
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

export default router;
