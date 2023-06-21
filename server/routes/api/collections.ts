import fractionalIndex from "fractional-index";
import invariant from "invariant";
import Router from "koa-router";
import { Sequelize, Op, WhereOptions } from "sequelize";
import { randomElement } from "@shared/random";
import {
  CollectionPermission,
  FileOperationFormat,
  FileOperationState,
  FileOperationType,
} from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
import collectionExporter from "@server/commands/collectionExporter";
import teamUpdater from "@server/commands/teamUpdater";
import { sequelize } from "@server/database/sequelize";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import {
  Collection,
  CollectionUser,
  CollectionGroup,
  Team,
  Event,
  User,
  Group,
  Attachment,
  FileOperation,
} from "@server/models";
import { authorize } from "@server/policies";
import {
  presentCollection,
  presentUser,
  presentPolicies,
  presentMembership,
  presentGroup,
  presentCollectionGroupMembership,
  presentFileOperation,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { collectionIndexing } from "@server/utils/indexing";
import removeIndexCollision from "@server/utils/removeIndexCollision";
import {
  assertUuid,
  assertIn,
  assertPresent,
  assertHexColor,
  assertIndexCharacters,
  assertCollectionPermission,
  assertBoolean,
} from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("collections.create", auth(), async (ctx: APIContext) => {
  const {
    name,
    color = randomElement(colorPalette),
    description,
    permission,
    sharing,
    icon,
    sort = Collection.DEFAULT_SORT,
  } = ctx.request.body;
  let { index } = ctx.request.body;
  assertPresent(name, "name is required");

  if (color) {
    assertHexColor(color, "Invalid hex value (please use format #FFFFFF)");
  }

  const { user } = ctx.state.auth;
  authorize(user, "createCollection", user.team);

  if (index) {
    assertIndexCharacters(index);
  } else {
    const collections = await Collection.findAll({
      where: {
        teamId: user.teamId,
        deletedAt: null,
      },
      attributes: ["id", "index", "updatedAt"],
      limit: 1,
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        Sequelize.literal('"collection"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
    });

    index = fractionalIndex(
      null,
      collections.length ? collections[0].index : null
    );
  }

  index = await removeIndexCollision(user.teamId, index);
  const collection = await Collection.create({
    name,
    description,
    icon,
    color,
    teamId: user.teamId,
    createdById: user.id,
    permission: permission ? permission : null,
    sharing,
    sort,
    index,
  });
  await Event.create({
    name: "collections.create",
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
    data: {
      name,
    },
    ip: ctx.request.ip,
  });
  // we must reload the collection to get memberships for policy presenter
  const reloaded = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(collection.id);
  invariant(reloaded, "collection not found");

  ctx.body = {
    data: presentCollection(reloaded),
    policies: presentPolicies(user, [reloaded]),
  };
});

router.post("collections.info", auth(), async (ctx: APIContext) => {
  const { id } = ctx.request.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state.auth;
  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(id);

  authorize(user, "read", collection);

  ctx.body = {
    data: presentCollection(collection),
    policies: presentPolicies(user, [collection]),
  };
});

router.post("collections.documents", auth(), async (ctx: APIContext) => {
  const { id } = ctx.request.body;
  assertPresent(id, "id is required");
  const { user } = ctx.state.auth;
  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(id);

  authorize(user, "readDocument", collection);

  ctx.body = {
    data: collection.documentStructure || [],
  };
});

router.post(
  "collections.import",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  async (ctx: APIContext) => {
    const { attachmentId, format = FileOperationFormat.MarkdownZip } =
      ctx.request.body;
    assertUuid(attachmentId, "attachmentId is required");

    const { user } = ctx.state.auth;
    authorize(user, "importCollection", user.team);

    const attachment = await Attachment.findByPk(attachmentId);
    authorize(user, "read", attachment);

    assertIn(format, Object.values(FileOperationFormat), "Invalid format");

    await sequelize.transaction(async (transaction) => {
      const fileOperation = await FileOperation.create(
        {
          type: FileOperationType.Import,
          state: FileOperationState.Creating,
          format,
          size: attachment.size,
          key: attachment.key,
          userId: user.id,
          teamId: user.teamId,
        },
        {
          transaction,
        }
      );

      await Event.create(
        {
          name: "fileOperations.create",
          teamId: user.teamId,
          actorId: user.id,
          modelId: fileOperation.id,
          data: {
            type: FileOperationType.Import,
          },
        },
        {
          transaction,
        }
      );
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post("collections.add_group", auth(), async (ctx: APIContext) => {
  const {
    id,
    groupId,
    permission = CollectionPermission.ReadWrite,
  } = ctx.request.body;
  assertUuid(id, "id is required");
  assertUuid(groupId, "groupId is required");
  assertCollectionPermission(permission);

  const { user } = ctx.state.auth;

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(id);
  authorize(user, "update", collection);

  const group = await Group.findByPk(groupId);
  authorize(user, "read", group);

  let membership = await CollectionGroup.findOne({
    where: {
      collectionId: id,
      groupId,
    },
  });

  if (!membership) {
    membership = await CollectionGroup.create({
      collectionId: id,
      groupId,
      permission,
      createdById: user.id,
    });
  } else if (permission) {
    membership.permission = permission;
    await membership.save();
  }

  await Event.create({
    name: "collections.add_group",
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
    modelId: groupId,
    data: {
      name: group.name,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: {
      collectionGroupMemberships: [
        presentCollectionGroupMembership(membership),
      ],
    },
  };
});

router.post("collections.remove_group", auth(), async (ctx: APIContext) => {
  const { id, groupId } = ctx.request.body;
  assertUuid(id, "id is required");
  assertUuid(groupId, "groupId is required");

  const { user } = ctx.state.auth;

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(id);
  authorize(user, "update", collection);

  const group = await Group.findByPk(groupId);
  authorize(user, "read", group);

  await collection.$remove("group", group);
  await Event.create({
    name: "collections.remove_group",
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
    modelId: groupId,
    data: {
      name: group.name,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

router.post(
  "collections.group_memberships",
  auth(),
  pagination(),
  async (ctx: APIContext) => {
    const { id, query, permission } = ctx.request.body;
    assertUuid(id, "id is required");
    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id);
    authorize(user, "read", collection);

    let where: WhereOptions<CollectionGroup> = {
      collectionId: id,
    };
    let groupWhere;

    if (query) {
      groupWhere = {
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    if (permission) {
      where = { ...where, permission };
    }

    const options = {
      where,
      include: [
        {
          model: Group,
          as: "group",
          where: groupWhere,
          required: true,
        },
      ],
    };

    const [total, memberships] = await Promise.all([
      CollectionGroup.count(options),
      CollectionGroup.findAll({
        ...options,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        collectionGroupMemberships: memberships.map(
          presentCollectionGroupMembership
        ),
        groups: memberships.map((membership) => presentGroup(membership.group)),
      },
    };
  }
);

router.post(
  "collections.add_user",
  auth(),
  transaction(),
  async (ctx: APIContext) => {
    const { auth, transaction } = ctx.state;
    const actor = auth.user;
    const { id, userId, permission } = ctx.request.body;
    assertUuid(id, "id is required");
    assertUuid(userId, "userId is required");

    const collection = await Collection.scope({
      method: ["withMembership", actor.id],
    }).findByPk(id);
    authorize(actor, "update", collection);

    const user = await User.findByPk(userId);
    authorize(actor, "read", user);

    let membership = await CollectionUser.findOne({
      where: {
        collectionId: id,
        userId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (permission) {
      assertCollectionPermission(permission);
    }

    if (!membership) {
      membership = await CollectionUser.create(
        {
          collectionId: id,
          userId,
          permission: permission || user.defaultCollectionPermission,
          createdById: actor.id,
        },
        {
          transaction,
        }
      );
    } else if (permission) {
      membership.permission = permission;
      await membership.save({ transaction });
    }

    await Event.create(
      {
        name: "collections.add_user",
        userId,
        collectionId: collection.id,
        teamId: collection.teamId,
        actorId: actor.id,
        data: {
          name: user.name,
        },
        ip: ctx.request.ip,
      },
      {
        transaction,
      }
    );

    ctx.body = {
      data: {
        users: [presentUser(user)],
        memberships: [presentMembership(membership)],
      },
    };
  }
);

router.post(
  "collections.remove_user",
  auth(),
  transaction(),
  async (ctx: APIContext) => {
    const { auth, transaction } = ctx.state;
    const actor = auth.user;
    const { id, userId } = ctx.request.body;
    assertUuid(id, "id is required");
    assertUuid(userId, "userId is required");

    const collection = await Collection.scope({
      method: ["withMembership", actor.id],
    }).findByPk(id);
    authorize(actor, "update", collection);

    const user = await User.findByPk(userId);
    authorize(actor, "read", user);

    await collection.$remove("user", user, { transaction });
    await Event.create(
      {
        name: "collections.remove_user",
        userId,
        collectionId: collection.id,
        teamId: collection.teamId,
        actorId: actor.id,
        data: {
          name: user.name,
        },
        ip: ctx.request.ip,
      },
      { transaction }
    );

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "collections.memberships",
  auth(),
  pagination(),
  async (ctx: APIContext) => {
    const { id, query, permission } = ctx.request.body;
    assertUuid(id, "id is required");
    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id);
    authorize(user, "read", collection);

    let where: WhereOptions<CollectionUser> = {
      collectionId: id,
    };
    let userWhere;

    if (query) {
      userWhere = {
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    if (permission) {
      assertCollectionPermission(permission);
      where = { ...where, permission };
    }

    const options = {
      where,
      include: [
        {
          model: User,
          as: "user",
          where: userWhere,
          required: true,
        },
      ],
    };

    const [total, memberships] = await Promise.all([
      CollectionUser.count(options),
      CollectionUser.findAll({
        ...options,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        memberships: memberships.map(presentMembership),
        users: memberships.map((membership) => presentUser(membership.user)),
      },
    };
  }
);

router.post(
  "collections.export",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    const {
      format = FileOperationFormat.MarkdownZip,
      includeAttachments = true,
    } = ctx.request.body;

    assertUuid(id, "id is required");
    assertIn(format, Object.values(FileOperationFormat), "Invalid format");
    assertBoolean(includeAttachments, "includeAttachments must be a boolean");

    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId);
    authorize(user, "createExport", team);

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id);
    authorize(user, "export", collection);

    const fileOperation = await sequelize.transaction(async (transaction) =>
      collectionExporter({
        collection,
        user,
        team,
        format,
        includeAttachments,
        ip: ctx.request.ip,
        transaction,
      })
    );

    ctx.body = {
      success: true,
      data: {
        fileOperation: presentFileOperation(fileOperation),
      },
    };
  }
);

router.post(
  "collections.export_all",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth(),
  async (ctx: APIContext) => {
    const {
      format = FileOperationFormat.MarkdownZip,
      includeAttachments = true,
    } = ctx.request.body;
    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId);
    authorize(user, "createExport", team);

    assertIn(format, Object.values(FileOperationFormat), "Invalid format");
    assertBoolean(includeAttachments, "includeAttachments must be a boolean");

    const fileOperation = await sequelize.transaction(async (transaction) =>
      collectionExporter({
        user,
        team,
        format,
        includeAttachments,
        ip: ctx.request.ip,
        transaction,
      })
    );

    ctx.body = {
      success: true,
      data: {
        fileOperation: presentFileOperation(fileOperation),
      },
    };
  }
);

router.post("collections.update", auth(), async (ctx: APIContext) => {
  const { id, name, description, icon, permission, color, sort, sharing } =
    ctx.request.body;

  if (color) {
    assertHexColor(color, "Invalid hex value (please use format #FFFFFF)");
  }

  const { user } = ctx.state.auth;
  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(id);
  authorize(user, "update", collection);

  // we're making this collection have no default access, ensure that the
  // current user has an admin membership so that at least they can manage it.
  if (
    permission !== CollectionPermission.ReadWrite &&
    collection.permission === CollectionPermission.ReadWrite
  ) {
    await CollectionUser.findOrCreate({
      where: {
        collectionId: collection.id,
        userId: user.id,
      },
      defaults: {
        permission: CollectionPermission.Admin,
        createdById: user.id,
      },
    });
  }

  let privacyChanged = false;
  let sharingChanged = false;

  if (name !== undefined) {
    collection.name = name.trim();
  }

  if (description !== undefined) {
    collection.description = description;
  }

  if (icon !== undefined) {
    collection.icon = icon;
  }

  if (color !== undefined) {
    collection.color = color;
  }

  if (permission !== undefined) {
    if (permission) {
      assertCollectionPermission(permission);
    }
    privacyChanged = permission !== collection.permission;
    collection.permission = permission ? permission : null;
  }

  if (sharing !== undefined) {
    sharingChanged = sharing !== collection.sharing;
    collection.sharing = sharing;
  }

  if (sort !== undefined) {
    collection.sort = sort;
  }

  await collection.save();
  await Event.create({
    name: "collections.update",
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
    data: {
      name,
    },
    ip: ctx.request.ip,
  });

  if (privacyChanged || sharingChanged) {
    await Event.create({
      name: "collections.permission_changed",
      collectionId: collection.id,
      teamId: collection.teamId,
      actorId: user.id,
      data: {
        privacyChanged,
        sharingChanged,
      },
      ip: ctx.request.ip,
    });
  }

  // must reload to update collection membership for correct policy calculation
  // if the privacy level has changed. Otherwise skip this query for speed.
  if (privacyChanged || sharingChanged) {
    await collection.reload();
    const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });

    if (
      collection.permission === null &&
      team?.defaultCollectionId === collection.id
    ) {
      await teamUpdater({
        params: { defaultCollectionId: null },
        ip: ctx.request.ip,
        user,
        team,
      });
    }
  }

  ctx.body = {
    data: presentCollection(collection),
    policies: presentPolicies(user, [collection]),
  };
});

router.post(
  "collections.list",
  auth(),
  pagination(),
  async (ctx: APIContext) => {
    const { includeListOnly } = ctx.request.body;
    const { user } = ctx.state.auth;
    const collectionIds = await user.collectionIds();
    const where: WhereOptions<Collection> =
      includeListOnly && user.isAdmin
        ? {
            teamId: user.teamId,
          }
        : {
            teamId: user.teamId,
            id: collectionIds,
          };
    const collections = await Collection.scope({
      method: ["withMembership", user.id],
    }).findAll({
      where,
      order: [
        Sequelize.literal('"collection"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const nullIndex = collections.findIndex(
      (collection) => collection.index === null
    );

    if (nullIndex !== -1) {
      const indexedCollections = await collectionIndexing(user.teamId);
      collections.forEach((collection) => {
        collection.index = indexedCollections[collection.id];
      });
    }

    ctx.body = {
      pagination: ctx.state.pagination,
      data: collections.map(presentCollection),
      policies: presentPolicies(user, collections),
    };
  }
);

router.post("collections.delete", auth(), async (ctx: APIContext) => {
  const { id } = ctx.request.body;
  const { user } = ctx.state.auth;
  assertUuid(id, "id is required");

  const collection = await Collection.scope({
    method: ["withMembership", user.id],
  }).findByPk(id);
  const team = await Team.findByPk(user.teamId);

  authorize(user, "delete", collection);

  const total = await Collection.count();
  if (total === 1) {
    throw ValidationError("Cannot delete last collection");
  }

  await collection.destroy();

  if (team && team.defaultCollectionId === collection.id) {
    await teamUpdater({
      params: { defaultCollectionId: null },
      ip: ctx.request.ip,
      user,
      team,
    });
  }

  await Event.create({
    name: "collections.delete",
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
    data: {
      name: collection.name,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

router.post("collections.move", auth(), async (ctx: APIContext) => {
  const id = ctx.request.body.id;
  let index = ctx.request.body.index;
  assertPresent(index, "index is required");
  assertIndexCharacters(index);
  assertUuid(id, "id must be a uuid");
  const { user } = ctx.state.auth;

  const collection = await Collection.findByPk(id);
  authorize(user, "move", collection);

  index = await removeIndexCollision(user.teamId, index);
  await collection.update({
    index,
  });
  await Event.create({
    name: "collections.move",
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
    data: {
      index,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
    data: {
      index,
    },
  };
});

export default router;
