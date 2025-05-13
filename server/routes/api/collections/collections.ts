import invariant from "invariant";
import Router from "koa-router";
import { Sequelize, Op, WhereOptions } from "sequelize";
import {
  CollectionPermission,
  CollectionStatusFilter,
  FileOperationState,
  FileOperationType,
} from "@shared/types";
import collectionDestroyer from "@server/commands/collectionDestroyer";
import collectionExporter from "@server/commands/collectionExporter";
import teamUpdater from "@server/commands/teamUpdater";
import { parser } from "@server/editor";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  Collection,
  UserMembership,
  GroupMembership,
  Team,
  Event,
  User,
  Group,
  Attachment,
  FileOperation,
  Document,
} from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { authorize } from "@server/policies";
import {
  presentCollection,
  presentUser,
  presentPolicies,
  presentMembership,
  presentGroup,
  presentGroupMembership,
  presentFileOperation,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { collectionIndexing } from "@server/utils/indexing";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "collections.create",
  auth(),
  validate(T.CollectionsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsCreateReq>) => {
    const { transaction } = ctx.state;
    const {
      name,
      color,
      description,
      data,
      permission,
      sharing,
      icon,
      sort,
      index,
    } = ctx.input.body;

    const { user } = ctx.state.auth;
    authorize(user, "createCollection", user.team);

    const collection = Collection.build({
      name,
      content: data,
      description: data ? undefined : description,
      icon,
      color,
      teamId: user.teamId,
      createdById: user.id,
      permission,
      sharing,
      sort,
      index,
    });

    if (data) {
      collection.description = DocumentHelper.toMarkdown(collection);
    }

    await collection.save({ transaction });

    await Event.createFromContext(ctx, {
      name: "collections.create",
      collectionId: collection.id,
      data: {
        name,
      },
    });
    // we must reload the collection to get memberships for policy presenter
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id, {
      transaction,
    });
    invariant(reloaded, "collection not found");

    ctx.body = {
      data: await presentCollection(ctx, reloaded),
      policies: presentPolicies(user, [reloaded]),
    };
  }
);

router.post(
  "collections.info",
  auth(),
  validate(T.CollectionsInfoSchema),
  async (ctx: APIContext<T.CollectionsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const collection = await Collection.scope([
      {
        method: ["withMembership", user.id],
      },
      "withArchivedBy",
    ]).findByPk(id);

    authorize(user, "read", collection);

    ctx.body = {
      data: await presentCollection(ctx, collection),
      policies: presentPolicies(user, [collection]),
    };
  }
);

router.post(
  "collections.documents",
  auth(),
  validate(T.CollectionsDocumentsSchema),
  async (ctx: APIContext<T.CollectionsDocumentsReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const collection = await Collection.scope([
      {
        method: ["withMembership", user.id],
      },
    ]).findByPk(id);

    authorize(user, "readDocument", collection);

    ctx.body = {
      data: collection.documentStructure || [],
    };
  }
);

router.post(
  "collections.import",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.CollectionsImportSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsImportReq>) => {
    const { transaction } = ctx.state;
    const { attachmentId, permission, format } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "importCollection", user.team);

    const attachment = await Attachment.findByPk(attachmentId, {
      transaction,
    });
    authorize(user, "read", attachment);

    await FileOperation.createWithCtx(ctx, {
      type: FileOperationType.Import,
      state: FileOperationState.Creating,
      format,
      size: attachment.size,
      key: attachment.key,
      userId: user.id,
      teamId: user.teamId,
      options: {
        permission,
      },
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "collections.add_group",
  auth(),
  validate(T.CollectionsAddGroupSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsAddGroupsReq>) => {
    const { id, groupId, permission } = ctx.input.body;
    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;

    const [collection, group] = await Promise.all([
      Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(id, { transaction }),
      Group.findByPk(groupId, { transaction }),
    ]);
    authorize(user, "update", collection);
    authorize(user, "read", group);

    const [membership, created] = await GroupMembership.findOrCreate({
      where: {
        collectionId: id,
        groupId,
      },
      defaults: {
        permission,
        createdById: user.id,
      },
      lock: transaction.LOCK.UPDATE,
      ...ctx.context,
    });

    if (!created) {
      membership.permission = permission;
      await membership.save(ctx.context);
    }

    const groupMemberships = [presentGroupMembership(membership)];

    ctx.body = {
      data: {
        groupMemberships,
      },
    };
  }
);

router.post(
  "collections.remove_group",
  auth(),
  validate(T.CollectionsRemoveGroupSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsRemoveGroupReq>) => {
    const { id, groupId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const [collection, group] = await Promise.all([
      Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(id, {
        transaction,
      }),
      Group.findByPk(groupId, {
        transaction,
      }),
    ]);
    authorize(user, "update", collection);
    authorize(user, "read", group);

    const [membership] = await collection.$get("groupMemberships", {
      where: { groupId },
      transaction,
    });

    if (!membership) {
      ctx.throw(400, "This Group is not a part of the collection");
    }

    await membership.destroy(ctx.context);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "collections.group_memberships",
  auth(),
  pagination(),
  validate(T.CollectionsMembershipsSchema),
  async (ctx: APIContext<T.CollectionsMembershipsReq>) => {
    const { id, query, permission } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id);
    authorize(user, "read", collection);

    let where: WhereOptions<GroupMembership> = {
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
      GroupMembership.count(options),
      GroupMembership.findAll({
        ...options,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
    ]);

    const groupMemberships = memberships.map(presentGroupMembership);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        groupMemberships,
        groups: await Promise.all(
          memberships.map((membership) => presentGroup(membership.group))
        ),
      },
    };
  }
);

router.post(
  "collections.add_user",
  auth(),
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  validate(T.CollectionsAddUserSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsAddUserReq>) => {
    const { transaction } = ctx.state;
    const { user: actor } = ctx.state.auth;
    const { id, userId, permission } = ctx.input.body;

    const [collection, user] = await Promise.all([
      Collection.scope({
        method: ["withMembership", actor.id],
      }).findByPk(id, { transaction }),
      User.findByPk(userId, { transaction }),
    ]);
    authorize(actor, "update", collection);
    authorize(actor, "read", user);

    const [membership, isNew] = await UserMembership.findOrCreate({
      where: {
        collectionId: id,
        userId,
      },
      defaults: {
        permission: permission || user.defaultCollectionPermission,
        createdById: actor.id,
      },
      lock: transaction.LOCK.UPDATE,
      ...ctx.context,
    });

    if (!isNew && permission) {
      membership.permission = permission;
      await membership.save(ctx.context);
    }

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
  validate(T.CollectionsRemoveUserSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsRemoveUserReq>) => {
    const { transaction } = ctx.state;
    const { user: actor } = ctx.state.auth;
    const { id, userId } = ctx.input.body;

    const [collection, user] = await Promise.all([
      Collection.scope({
        method: ["withMembership", actor.id],
      }).findByPk(id, { transaction }),
      User.findByPk(userId, { transaction }),
    ]);
    authorize(actor, "update", collection);
    authorize(actor, "read", user);

    const [membership] = await collection.$get("memberships", {
      where: { userId },
      transaction,
    });
    if (!membership) {
      ctx.throw(400, "User is not a collection member");
    }

    await membership.destroy(ctx.context);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "collections.memberships",
  auth(),
  pagination(),
  validate(T.CollectionsMembershipsSchema),
  async (ctx: APIContext<T.CollectionsMembershipsReq>) => {
    const { id, query, permission } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id);
    authorize(user, "read", collection);

    let where: WhereOptions<UserMembership> = {
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
      UserMembership.count(options),
      UserMembership.findAll({
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
  rateLimiter(RateLimiterStrategy.FiftyPerHour),
  auth(),
  validate(T.CollectionsExportSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsExportReq>) => {
    const { id, format, includeAttachments } = ctx.input.body;
    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;

    const team = await Team.findByPk(user.teamId, { transaction });
    authorize(user, "createExport", team);

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id, { transaction });
    authorize(user, "export", collection);

    const fileOperation = await collectionExporter({
      collection,
      user,
      team,
      format,
      includeAttachments,
      ctx,
    });

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
  validate(T.CollectionsExportAllSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsExportAllReq>) => {
    const { format, includeAttachments } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const team = await Team.findByPk(user.teamId, { transaction });
    authorize(user, "createExport", team);

    const fileOperation = await collectionExporter({
      user,
      team,
      format,
      includeAttachments,
      ctx,
    });

    ctx.body = {
      success: true,
      data: {
        fileOperation: presentFileOperation(fileOperation),
      },
    };
  }
);

router.post(
  "collections.update",
  auth(),
  validate(T.CollectionsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsUpdateReq>) => {
    const { transaction } = ctx.state;
    const {
      id,
      name,
      description,
      data,
      icon,
      permission,
      color,
      sort,
      sharing,
    } = ctx.input.body;

    const { user } = ctx.state.auth;
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id, {
      transaction,
    });
    authorize(user, "update", collection);

    // we're making this collection have no default access, ensure that the
    // current user has an admin membership so that at least they can manage it.
    if (
      permission !== CollectionPermission.ReadWrite &&
      collection.permission === CollectionPermission.ReadWrite
    ) {
      await UserMembership.findOrCreate({
        where: {
          collectionId: collection.id,
          userId: user.id,
        },
        defaults: {
          permission: CollectionPermission.Admin,
          createdById: user.id,
        },
        transaction,
        hooks: false,
      });
    }

    let privacyChanged = false;
    let sharingChanged = false;

    if (name !== undefined) {
      collection.name = name.trim();
    }

    if (description !== undefined) {
      collection.description = description;
      collection.content = description
        ? parser.parse(description)?.toJSON()
        : null;
    }

    if (data !== undefined) {
      collection.content = data;
      collection.description = DocumentHelper.toMarkdown(collection);
    }

    if (icon !== undefined) {
      collection.icon = icon;
    }

    if (color !== undefined) {
      collection.color = color;
    }

    if (permission !== undefined) {
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

    await collection.save({ transaction });
    await Event.createFromContext(ctx, {
      name: "collections.update",
      collectionId: collection.id,
      data: {
        name,
      },
    });

    if (privacyChanged || sharingChanged) {
      await Event.createFromContext(ctx, {
        name: "collections.permission_changed",
        collectionId: collection.id,
        data: {
          privacyChanged,
          sharingChanged,
        },
      });
    }

    // must reload to update collection membership for correct policy calculation
    // if the privacy level has changed. Otherwise skip this query for speed.
    if (privacyChanged || sharingChanged) {
      await collection.reload({ transaction });
      const team = await Team.findByPk(user.teamId, {
        transaction,
        rejectOnEmpty: true,
      });

      if (
        collection.permission === null &&
        team?.defaultCollectionId === collection.id
      ) {
        await teamUpdater({
          params: { defaultCollectionId: null },
          ip: ctx.request.ip,
          user,
          team,
          transaction,
        });
      }
    }

    ctx.body = {
      data: await presentCollection(ctx, collection),
      policies: presentPolicies(user, [collection]),
    };
  }
);

router.post(
  "collections.list",
  auth(),
  validate(T.CollectionsListSchema),
  pagination(),
  transaction(),
  async (ctx: APIContext<T.CollectionsListReq>) => {
    const { includeListOnly, query, statusFilter } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const collectionIds = await user.collectionIds({ transaction });

    const where: WhereOptions<Collection> & {
      [Op.and]: WhereOptions<Collection>[];
    } = {
      teamId: user.teamId,
      [Op.and]: [
        {
          deletedAt: {
            [Op.eq]: null,
          },
        },
      ],
    };

    if (!statusFilter) {
      where[Op.and].push({ archivedAt: { [Op.eq]: null } });
    }

    if (!includeListOnly || !user.isAdmin) {
      where[Op.and].push({ id: collectionIds });
    }

    if (query) {
      where[Op.and].push(
        Sequelize.literal(`unaccent(LOWER(name)) like unaccent(LOWER(:query))`)
      );
    }

    const statusQuery = [];
    if (statusFilter?.includes(CollectionStatusFilter.Archived)) {
      statusQuery.push({
        archivedAt: {
          [Op.ne]: null,
        },
      });
    }

    if (statusQuery.length) {
      where[Op.and].push({
        [Op.or]: statusQuery,
      });
    }

    const replacements = { query: `%${query}%` };

    const [collections, total] = await Promise.all([
      Collection.scope(
        statusFilter?.includes(CollectionStatusFilter.Archived)
          ? [
              {
                method: ["withMembership", user.id],
              },
              "withArchivedBy",
            ]
          : {
              method: ["withMembership", user.id],
            }
      ).findAll({
        where,
        replacements,
        order: [
          Sequelize.literal('"collection"."index" collate "C"'),
          ["updatedAt", "DESC"],
        ],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
        transaction,
      }),
      Collection.count({
        where,
        // @ts-expect-error Types are incorrect for count
        replacements,
        transaction,
      }),
    ]);

    const nullIndex = collections.findIndex(
      (collection) => collection.index === null
    );

    if (nullIndex !== -1) {
      const indexedCollections = await collectionIndexing(user.teamId, {
        transaction,
      });
      collections.forEach((collection) => {
        collection.index = indexedCollections[collection.id];
      });
    }

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: await Promise.all(
        collections.map((collection) => presentCollection(ctx, collection))
      ),
      policies: presentPolicies(user, collections),
    };
  }
);

router.post(
  "collections.delete",
  auth(),
  validate(T.CollectionsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsDeleteReq>) => {
    const { transaction } = ctx.state;
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id, {
      transaction,
    });

    authorize(user, "delete", collection);

    await collectionDestroyer({
      collection,
      transaction,
      user,
      ip: ctx.request.ip,
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "collections.archive",
  auth(),
  validate(T.CollectionsArchiveSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsArchiveReq>) => {
    const { transaction } = ctx.state;
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.scope([
      {
        method: ["withMembership", user.id],
      },
    ]).findByPk(id, {
      transaction,
      rejectOnEmpty: true,
    });

    authorize(user, "archive", collection);

    collection.archivedAt = new Date();
    collection.archivedById = user.id;
    await collection.save({ transaction });
    collection.archivedBy = user;

    // Archive all documents within the collection
    await Document.update(
      {
        lastModifiedById: user.id,
        archivedAt: collection.archivedAt,
      },
      {
        where: {
          teamId: collection.teamId,
          collectionId: collection.id,
          archivedAt: {
            [Op.is]: null,
          },
        },
        transaction,
      }
    );

    await Event.createFromContext(ctx, {
      name: "collections.archive",
      collectionId: collection.id,
      data: {
        name: collection.name,
        archivedAt: collection.archivedAt,
      },
    });

    ctx.body = {
      data: await presentCollection(ctx, collection),
      policies: presentPolicies(user, [collection]),
    };
  }
);

router.post(
  "collections.restore",
  auth(),
  validate(T.CollectionsRestoreSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsRestoreReq>) => {
    const { transaction } = ctx.state;
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(id, {
      transaction,
      rejectOnEmpty: true,
    });

    authorize(user, "restore", collection);

    const collectionArchivedAt = collection.archivedAt;

    await Document.update(
      {
        lastModifiedById: user.id,
        archivedAt: null,
      },
      {
        where: {
          collectionId: collection.id,
          teamId: user.teamId,
          archivedAt: collection.archivedAt,
        },
        transaction,
      }
    );

    collection.archivedAt = null;
    collection.archivedById = null;
    await collection.save({ transaction });

    await Event.createFromContext(ctx, {
      name: "collections.restore",
      collectionId: collection.id,
      data: {
        name: collection.name,
        archivedAt: collectionArchivedAt,
      },
    });

    ctx.body = {
      data: await presentCollection(ctx, collection!),
      policies: presentPolicies(user, [collection]),
    };
  }
);

router.post(
  "collections.move",
  auth(),
  validate(T.CollectionsMoveSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsMoveReq>) => {
    const { transaction } = ctx.state;
    const { id, index } = ctx.input.body;
    const { user } = ctx.state.auth;

    let collection = await Collection.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "move", collection);

    collection = await collection.update(
      {
        index,
      },
      {
        transaction,
      }
    );
    await Event.createFromContext(ctx, {
      name: "collections.move",
      collectionId: collection.id,
      data: {
        index: collection.index,
      },
    });

    ctx.body = {
      success: true,
      data: {
        index: collection.index,
      },
    };
  }
);

export default router;
