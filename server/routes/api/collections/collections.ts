import Router from "koa-router";
import type { WhereOptions } from "sequelize";
import { Sequelize, Op, QueryTypes } from "sequelize";
import {
  CollectionPermission,
  CollectionStatusFilter,
  FileOperationState,
  FileOperationType,
  NotificationEventType,
  UserRole,
} from "@shared/types";
import collectionExporter from "@server/commands/collectionExporter";
import collectionMerger from "@server/commands/collectionMerger";
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
  User,
  Group,
  GroupUser,
  Attachment,
  FileOperation,
  Document,
  Relationship,
  CollectionMergeRequest,
  Notification,
  Event,
  MergeRequestStatus,
} from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { DocumentConverter } from "@server/utils/DocumentConverter";
import { authorize } from "@server/policies";
import {
  presentCollection,
  presentCollectionMergeRequest,
  presentUser,
  presentPolicies,
  presentMembership,
  presentGroup,
  presentGroupMembership,
  presentFileOperation,
  presentDocument,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { collectionIndexing } from "@server/utils/indexing";
import pagination from "../middlewares/pagination";
import * as T from "./schema";
import { InvalidRequestError } from "@server/errors";
import { z } from "zod";
import { can } from "@server/policies";

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
      commenting,
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
      commenting,
    });

    if (data) {
      collection.description = await DocumentHelper.toMarkdown(collection);
    }

    await collection.saveWithCtx(ctx);

    // we must reload the collection to get memberships for policy presenter
    const reloaded = await Collection.findByPk(collection.id, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });

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
    const collection = await Collection.findByPk(id, {
      userId: user.id,
      includeArchivedBy: true,
      rejectOnEmpty: true,
    });

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
    const collection = await Collection.findByPk(id, {
      userId: user.id,
    });

    authorize(user, "readDocument", collection);

    const documentStructure = await CacheHelper.getDataOrSet(
      CacheHelper.getCollectionDocumentsKey(collection.id),
      async () =>
        (
          async () => {
            const collectionWithStructure = await Collection.findByPk(
              collection.id,
              {
                attributes: ["documentStructure"],
                includeDocumentStructure: true,
                rejectOnEmpty: true,
              }
            );
            const structure = collectionWithStructure.documentStructure ?? [];

            if (structure.length > 0) {
              return structure;
            }

            const rootCount = await Document.unscoped().count({
              where: {
                collectionId: collection.id,
                parentDocumentId: null,
                publishedAt: {
                  [Op.ne]: null,
                },
                archivedAt: {
                  [Op.is]: null,
                },
              },
            });

            if (!rootCount) {
              return structure;
            }

            const rootDocuments = await Document.unscoped().findAll({
              where: {
                collectionId: collection.id,
                parentDocumentId: null,
                publishedAt: {
                  [Op.ne]: null,
                },
                archivedAt: {
                  [Op.is]: null,
                },
              },
              order: [
                ["createdAt", "DESC"],
                ["id", "ASC"],
              ],
            });

            for (const document of rootDocuments) {
              await collectionWithStructure.addDocumentToStructure(
                document,
                undefined,
                {
                  save: false,
                  silent: true,
                  insertOrder: "append",
                }
              );
            }

            await collectionWithStructure.save({ silent: true });
            return collectionWithStructure.documentStructure ?? [];
          }
        )(),
      60
    );

    ctx.body = {
      data: documentStructure || [],
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
      Collection.findByPk(id, { userId: user.id, transaction }),
      Group.findByPk(groupId, { transaction }),
    ]);
    authorize(user, "update", collection);
    authorize(user, "read", group);

    let membership = await GroupMembership.findOne({
      where: {
        collectionId: id,
        groupId,
      },
      lock: transaction.LOCK.UPDATE,
      ...ctx.context,
    });

    if (membership) {
      membership.permission = permission;
      await membership.save(ctx.context);
    } else {
      membership = await GroupMembership.create(
        {
          collectionId: id,
          groupId,
          permission,
          createdById: user.id,
        },
        ctx.context
      );
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
      Collection.findByPk(id, {
        userId: user.id,
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
      ctx.throw(
        InvalidRequestError("This Group is not a part of the collection")
      );
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

    const collection = await Collection.findByPk(id, {
      userId: user.id,
    });
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
      Collection.findByPk(id, { userId: actor.id, transaction }),
      User.findByPk(userId, { transaction }),
    ]);
    authorize(actor, "update", collection);
    authorize(actor, "read", user);

    let membership = await UserMembership.findOne({
      where: {
        collectionId: id,
        userId,
      },
      lock: transaction.LOCK.UPDATE,
      ...ctx.context,
    });

    if (membership) {
      membership.permission = permission || user.defaultCollectionPermission;
      await membership.save(ctx.context);
    } else {
      membership = await UserMembership.create(
        {
          collectionId: id,
          userId,
          permission: permission || user.defaultCollectionPermission,
          createdById: actor.id,
        },
        ctx.context
      );
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
      Collection.findByPk(id, { userId: actor.id, transaction }),
      User.findByPk(userId, { transaction }),
    ]);
    authorize(actor, "update", collection);
    authorize(actor, "read", user);

    const [membership] = await collection.$get("memberships", {
      where: { userId },
      transaction,
    });
    if (!membership) {
      ctx.throw(InvalidRequestError("User is not a collection member"));
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

    const collection = await Collection.findByPk(id, {
      userId: user.id,
    });
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
  auth({ role: UserRole.Member }),
  validate(T.CollectionsExportSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsExportReq>) => {
    const { id, format, includeAttachments } = ctx.input.body;
    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;
    const { team } = user;

    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
    });
    authorize(user, "export", collection);

    const fileOperation = await collectionExporter({
      collection,
      team,
      user,
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
  auth({ role: UserRole.Admin }),
  validate(T.CollectionsExportAllSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsExportAllReq>) => {
    const { format, includeAttachments, includePrivate } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const team = await Team.findByPk(user.teamId, { transaction });
    authorize(user, "createExport", team);

    const fileOperation = await collectionExporter({
      user,
      team,
      format,
      includeAttachments,
      includePrivate,
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
      commenting,
    } = ctx.input.body;

    const { user } = ctx.state.auth;
    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
    });
    authorize(user, "update", collection);

    // we're making this collection have no default access, ensure that the
    // current user has an admin membership so that at least they can manage it.
    if (
      permission !== CollectionPermission.ReadWrite &&
      collection.permission === CollectionPermission.ReadWrite
    ) {
      let membership = await UserMembership.findOne({
        where: {
          collectionId: collection.id,
          userId: user.id,
        },
        transaction,
      });

      if (!membership) {
        await UserMembership.create(
          {
            collectionId: collection.id,
            userId: user.id,
            permission: CollectionPermission.Admin,
            createdById: user.id,
          },
          {
            transaction,
            hooks: false,
          }
        );
      }
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
      collection.description = await DocumentHelper.toMarkdown(collection);
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

    if (commenting !== undefined) {
      collection.commenting = commenting;
    }

    await collection.saveWithCtx(ctx);

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
        await teamUpdater(ctx, {
          params: { defaultCollectionId: null },
          user,
          team,
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

    // Administrators can see all collections, regular users only see their own
    if (!user.isAdmin && !includeListOnly) {
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

    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
    });

    authorize(user, "delete", collection);

    await collection.destroyWithCtx(ctx);

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

    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });

    authorize(user, "archive", collection);

    collection.archivedAt = new Date();
    collection.archivedById = user.id;
    collection.archivedBy = user;

    await collection.saveWithCtx(ctx, undefined, {
      name: "archive",
    });

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

    let collection = await Collection.findByPk(id, {
      userId: user.id,
      includeDocumentStructure: true,
      rejectOnEmpty: true,
      transaction,
    });

    authorize(user, "restore", collection);

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
    collection = await collection.saveWithCtx(ctx, undefined, {
      name: "restore",
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

    collection = await collection.updateWithCtx(
      ctx,
      { index },
      {
        name: "move",
      }
    );

    ctx.body = {
      success: true,
      data: {
        index: collection.index,
      },
    };
  }
);

router.post(
  "collections.networkGraph",
  auth(),
  validate(T.CollectionsNetworkGraphSchema),
  async (ctx: APIContext<T.CollectionsNetworkGraphReq>) => {
    const { user: actor } = ctx.state.auth;
    const { groupId, search } = ctx.input.body;
    const teamId = actor.teamId;

    // Get collections based on user permissions
    let collections: Collection[];
    if (actor.isAdmin) {
      // Admin sees all collections
      collections = await Collection.scope("withAllMemberships").findAll({
        where: {
          teamId,
          ...(search
            ? {
              name: {
                [Op.iLike]: `%${search}%`,
              },
            }
            : {}),
        },
        include: [
          {
            model: User,
            as: "user",
            required: false,
          },
          {
            model: Document,
            as: "documents",
            required: false,
            attributes: ["id"],
          },
        ],
      });
    } else {
      // Regular users see only collections they have access to
      const collectionIds = await actor.collectionIds();
      collections = await Collection.scope("withAllMemberships").findAll({
        where: {
          teamId,
          id: collectionIds,
          ...(search
            ? {
              name: {
                [Op.iLike]: `%${search}%`,
              },
            }
            : {}),
        },
        include: [
          {
            model: User,
            as: "user",
            required: false,
          },
          {
            model: Document,
            as: "documents",
            required: false,
            attributes: ["id"],
          },
        ],
      });
    }

    // Filter by group if specified
    if (groupId) {
      collections = collections.filter((collection) =>
        collection.groupMemberships?.some((gm) => gm.groupId === groupId)
      );
    }

    // Get all unique groups and users from collections
    const groupIds = new Set<string>();
    const userIds = new Set<string>();

    for (const collection of collections) {
      // Group memberships
      for (const groupMembership of collection.groupMemberships || []) {
        groupIds.add(groupMembership.groupId);
      }
      // User memberships (direct access to collections)
      for (const userMembership of collection.memberships || []) {
        userIds.add(userMembership.userId);
      }
      // Collection owner
      if (collection.createdById) {
        userIds.add(collection.createdById);
      }
    }

    // Fetch groups
    const groups = await Group.findAll({
      where: {
        id: Array.from(groupIds),
        teamId,
        ...(search
          ? {
            name: {
              [Op.iLike]: `%${search}%`,
            },
          }
          : {}),
      },
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
        },
      ],
    });

    // Get documents for collections with owners
    const documentIds = new Set<string>();
    const documentsByCollection = new Map<string, Document[]>();
    const documentHashtags = new Map<string, string[]>(); // documentId -> hashtags
    const hashtagDocuments = new Map<string, Set<string>>(); // hashtag -> documentIds

    for (const collection of collections) {
      const collectionDocuments = await Document.findAll({
        where: {
          collectionId: collection.id,
          publishedAt: { [Op.ne]: null },
          archivedAt: { [Op.is]: null },
        },
        attributes: ["id", "title", "collectionId", "createdById", "text", "content"],
        include: [
          {
            model: User,
            as: "createdBy",
            attributes: ["id", "name", "email"],
            required: false,
            paranoid: false,
          },
          {
            model: UserMembership,
            as: "memberships",
            attributes: ["userId", "permission"],
            required: false,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "name", "email"],
                required: false,
                paranoid: false,
              },
            ],
          },
        ],
        limit: 100, // Ограничиваем количество документов для производительности
      });

      documentsByCollection.set(collection.id, collectionDocuments);

      // Извлекаем хештеги из документов и собираем пользователей с доступом к документам
      for (const doc of collectionDocuments) {
        documentIds.add(doc.id);

        // Добавляем пользователей, которые имеют прямой доступ к документу
        if ((doc as any).memberships) {
          for (const membership of (doc as any).memberships) {
            if (membership.userId) {
              userIds.add(membership.userId);
            }
          }
        }

        // Извлекаем хештеги из текста или content
        let textToExtract = "";
        if (doc.text) {
          textToExtract = doc.text;
        } else if (doc.content) {
          // Конвертируем Prosemirror content в текст для извлечения хештегов
          try {
            textToExtract = DocumentHelper.toPlainText(doc.content);
          } catch (err) {
            // Если не удалось конвертировать, пробуем через toMarkdown
            try {
              textToExtract = await DocumentHelper.toMarkdown(doc.content, {
                includeTitle: false,
              });
            } catch (err2) {
              // Если не удалось конвертировать, пропускаем
              textToExtract = "";
            }
          }
        }

        if (textToExtract) {
          // Извлекаем хештеги используя тот же метод что и DocumentConverter
          const hashtagRegex = /(?:^|\s)#([\p{L}][\p{L}\p{N}_]*)/gu;
          const matches = textToExtract.matchAll(hashtagRegex);
          const hashtags = new Set<string>();

          for (const match of matches) {
            const tag = match[1];
            if (tag && tag.length >= 2 && tag.length <= 50 && /[\p{L}]/u.test(tag)) {
              const normalizedTag = tag.toLowerCase();
              hashtags.add(normalizedTag);

              // Добавляем документ к хештегу
              if (!hashtagDocuments.has(normalizedTag)) {
                hashtagDocuments.set(normalizedTag, new Set());
              }
              hashtagDocuments.get(normalizedTag)!.add(doc.id);
            }
          }

          if (hashtags.size > 0) {
            documentHashtags.set(doc.id, Array.from(hashtags));
          }
        }
      }
    }

    // Get relationships between documents
    const relationships: Array<{
      documentId: string;
      reverseDocumentId: string;
    }> = [];

    if (documentIds.size > 0) {
      const docRelationships = await Relationship.findAll({
        where: {
          documentId: { [Op.in]: Array.from(documentIds) },
          reverseDocumentId: { [Op.in]: Array.from(documentIds) },
        },
        attributes: ["documentId", "reverseDocumentId"],
      });

      docRelationships.forEach((rel) => {
        relationships.push({
          documentId: rel.documentId,
          reverseDocumentId: rel.reverseDocumentId,
        });
      });
    }

    // Build nodes
    const nodes: Array<{
      id: string;
      type: "group" | "collection" | "document" | "hashtag" | "owner" | "user";
      label: string;
      size: number;
      data: any;
    }> = [];

    // Fetch users who have access to collections
    const users = userIds.size > 0 ? await User.findAll({
      where: {
        id: Array.from(userIds),
        teamId,
      },
      attributes: ["id", "name", "email"],
      paranoid: false,
    }) : [];

    // Add user nodes
    for (const user of users) {
      // Подсчитываем количество коллекций, к которым у пользователя есть доступ
      const userCollectionCount = collections.filter((c) => {
        // Прямой доступ через UserMembership
        const hasDirectAccess = c.memberships?.some((m) => m.userId === user.id);
        // Доступ через владение
        const isOwner = c.createdById === user.id;
        return hasDirectAccess || isOwner;
      }).length;

      if (userCollectionCount > 0) {
        nodes.push({
          id: `user-${user.id}`,
          type: "user",
          label: user.name || user.email || "Unknown",
          size: Math.min(Math.max(userCollectionCount * 2 + 12, 12), 28),
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            collectionCount: userCollectionCount,
          },
        });
      }
    }

    // Add group nodes
    for (const group of groups) {
      nodes.push({
        id: `group-${group.id}`,
        type: "group",
        label: group.name,
        size: Math.min(Math.max((group.groupUsers?.length || 0) * 2 + 15, 15), 40),
        data: {
          id: group.id,
          name: group.name,
          memberCount: group.groupUsers?.length || 0,
        },
      });
    }

    // Get document counts for all collections in one query
    const collectionIds = collections.map((c) => c.id);
    let documentCounts: Array<{ collectionId: string; count: string }> = [];

    if (collectionIds.length > 0) {
      const countSql = `
        SELECT "collectionId", COUNT(*) as count
        FROM "documents"
        WHERE "deletedAt" IS NULL
          AND "publishedAt" IS NOT NULL
          AND ("sourceMetadata"#>>'{trial}') IS NULL
          AND "collectionId" IN (:collectionIds)
          AND "archivedAt" IS NULL
        GROUP BY "collectionId"
      `;
      documentCounts = (await Document.sequelize!.query(countSql, {
        type: QueryTypes.SELECT,
        replacements: { collectionIds },
      })) as Array<{ collectionId: string; count: string }>;
    }

    const countMap = new Map<string, number>();
    for (const count of documentCounts as Array<{ collectionId: string; count: string }>) {
      countMap.set(
        count.collectionId,
        parseInt(count.count, 10)
      );
    }

    // Add collection nodes and collect owner IDs
    const collectionOwnerIds = new Set<string>();
    for (const collection of collections) {
      const documentCount = countMap.get(collection.id) || 0;

      // Calculate node size based on document count (min 20, max 60)
      const size = Math.min(Math.max(documentCount * 2 + 20, 20), 60);

      if (collection.createdById) {
        collectionOwnerIds.add(collection.createdById);
      }

      nodes.push({
        id: `collection-${collection.id}`,
        type: "collection",
        label: collection.name,
        size,
        data: {
          id: collection.id,
          name: collection.name,
          documentCount,
          createdById: collection.createdById,
          color: collection.color,
          icon: collection.icon,
          path: collection.path,
          description: collection.description,
          createdAt: collection.createdAt?.toISOString(),
        },
      });
    }

    // Add document nodes with owner info
    const ownerIds = new Set<string>();
    for (const [collectionId, docs] of documentsByCollection.entries()) {
      for (const doc of docs) {
        if (doc.createdById) {
          ownerIds.add(doc.createdById);
        }
        nodes.push({
          id: `document-${doc.id}`,
          type: "document",
          label: doc.title || "Untitled",
          size: 8,
          data: {
            id: doc.id,
            title: doc.title,
            collectionId: doc.collectionId,
            createdById: doc.createdById,
            ownerName: (doc.createdBy as any)?.name || (doc.createdBy as any)?.email || undefined,
          },
        });
      }
    }

    // Add owner nodes (для владельцев документов и коллекций)
    const allOwnerIds = new Set<string>([...ownerIds, ...collectionOwnerIds]);
    if (allOwnerIds.size > 0) {
      const owners = await User.findAll({
        where: {
          id: Array.from(allOwnerIds),
          teamId,
        },
        attributes: ["id", "name", "email"],
        paranoid: false,
      });

      for (const owner of owners) {
        // Подсчитываем количество документов владельца
        const ownerDocCount = Array.from(documentsByCollection.values())
          .flat()
          .filter((doc) => doc.createdById === owner.id).length;

        // Подсчитываем количество коллекций владельца
        const ownerCollectionCount = collections.filter(
          (c) => c.createdById === owner.id
        ).length;

        // Добавляем узел владельца, если у него есть документы или коллекции
        if (ownerDocCount > 0 || ownerCollectionCount > 0) {
          const totalCount = ownerDocCount + ownerCollectionCount;
          nodes.push({
            id: `owner-${owner.id}`,
            type: "owner",
            label: owner.name || owner.email || "Unknown",
            size: Math.min(Math.max(totalCount * 2 + 10, 10), 30),
            data: {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              documentCount: ownerDocCount,
              collectionCount: ownerCollectionCount,
            },
          });
        }
      }
    }

    // Add hashtag nodes
    for (const [hashtag, docIds] of hashtagDocuments.entries()) {
      nodes.push({
        id: `hashtag-${hashtag}`,
        type: "hashtag",
        label: `#${hashtag}`,
        size: Math.min(Math.max(docIds.size * 2 + 8, 8), 25),
        data: {
          name: hashtag,
          documentCount: docIds.size,
        },
      });
    }

    // Build links
    const links: Array<{
      source: string;
      target: string;
      type: string;
    }> = [];

    // User -> Collection links with permission type (direct access)
    for (const collection of collections) {
      for (const userMembership of collection.memberships || []) {
        // Определяем тип доступа пользователя к коллекции на основе permission
        const permissionType =
          userMembership.permission === CollectionPermission.ReadWrite
            ? "editor"
            : userMembership.permission === CollectionPermission.Read
              ? "viewer"
              : userMembership.permission === CollectionPermission.Admin
                ? "admin"
                : "access";
        links.push({
          source: `user-${userMembership.userId}`,
          target: `collection-${collection.id}`,
          type: permissionType,
        });
      }
    }

    // Group -> Collection links with permission type
    for (const collection of collections) {
      for (const groupMembership of collection.groupMemberships || []) {
        // Определяем тип доступа группы к коллекции на основе permission
        const permissionType =
          groupMembership.permission === CollectionPermission.ReadWrite
            ? "editor"
            : groupMembership.permission === CollectionPermission.Read
              ? "viewer"
              : groupMembership.permission === CollectionPermission.Admin
                ? "admin"
                : "access";
        links.push({
          source: `group-${groupMembership.groupId}`,
          target: `collection-${collection.id}`,
          type: permissionType,
        });
      }
    }

    // Collection -> Document links
    for (const [collectionId, docs] of documentsByCollection.entries()) {
      for (const doc of docs) {
        links.push({
          source: `collection-${collectionId}`,
          target: `document-${doc.id}`,
          type: "contains",
        });
      }
    }

    // Document -> Document links (relationships)
    for (const rel of relationships) {
      links.push({
        source: `document-${rel.reverseDocumentId}`,
        target: `document-${rel.documentId}`,
        type: "reference",
      });
    }

    // Document -> Hashtag links
    for (const [docId, hashtags] of documentHashtags.entries()) {
      for (const hashtag of hashtags) {
        links.push({
          source: `document-${docId}`,
          target: `hashtag-${hashtag}`,
          type: "tagged",
        });
      }
    }

    // Document -> Owner links
    for (const [collectionId, docs] of documentsByCollection.entries()) {
      for (const doc of docs) {
        if (doc.createdById) {
          links.push({
            source: `document-${doc.id}`,
            target: `owner-${doc.createdById}`,
            type: "owned",
          });
        }
      }
    }

    // Collection -> Owner links (для владельцев коллекций)
    for (const collection of collections) {
      if (collection.createdById) {
        links.push({
          source: `collection-${collection.id}`,
          target: `owner-${collection.createdById}`,
          type: "owned",
        });
      }
    }

    // User -> Document links (прямой доступ пользователей к документам)
    for (const [collectionId, docs] of documentsByCollection.entries()) {
      for (const doc of docs) {
        if ((doc as any).memberships) {
          for (const membership of (doc as any).memberships) {
            if (membership.userId) {
              const permissionType =
                membership.permission === CollectionPermission.ReadWrite
                  ? "editor"
                  : membership.permission === CollectionPermission.Read
                    ? "viewer"
                    : membership.permission === CollectionPermission.Admin
                      ? "admin"
                      : "access";
              links.push({
                source: `user-${membership.userId}`,
                target: `document-${doc.id}`,
                type: permissionType,
              });
            }
          }
        }
      }
    }

    ctx.body = {
      data: {
        nodes,
        links,
      },
    };
  }
);

// Collection Merge Requests

router.post(
  "collections.mergeRequest",
  auth(),
  validate(T.CollectionsMergeRequestCreateSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsMergeRequestCreateReq>) => {
    const { transaction } = ctx.state;
    const { sourceCollectionIds, newCollectionName, targetCollectionId } =
      ctx.input.body;
    const { user } = ctx.state.auth;

    // Validate that user has edit access to all source collections
    const sourceCollections = await Collection.findAll({
      where: {
        id: sourceCollectionIds,
        teamId: user.teamId,
      },
      include: [
        {
          model: UserMembership,
          as: "memberships",
          where: { userId: user.id },
          required: false,
        },
        {
          model: GroupMembership,
          as: "groupMemberships",
          required: false,
          include: [
            {
              model: Group,
              as: "group",
              include: [
                {
                  model: GroupUser,
                  as: "groupUsers",
                  where: { userId: user.id },
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      transaction,
    });

    if (sourceCollections.length !== sourceCollectionIds.length) {
      throw InvalidRequestError("Some source collections not found");
    }

    // Check permissions - user must be editor or admin of all collections
    for (const collection of sourceCollections) {
      const canEdit = await can(user, "updateDocument", collection);
      if (!canEdit) {
        throw InvalidRequestError(
          `You don't have permission to merge collection: ${collection.name}`
        );
      }
    }

    // Get owners of all source collections
    const ownerIds = new Set<string>();
    for (const collection of sourceCollections) {
      if (collection.createdById) {
        ownerIds.add(collection.createdById);
      }
    }

    // Create merge request
    const mergeRequest = await CollectionMergeRequest.createWithCtx(ctx, {
      sourceCollectionIds,
      newCollectionName,
      targetCollectionId: targetCollectionId || null,
      requestedById: user.id,
      teamId: user.teamId,
      status: MergeRequestStatus.Pending,
      approvals: {},
      rejections: {},
    });

    // Determine if the user owns all source collections
    let userOwnsAllSources = true;
    for (const collection of sourceCollections) {
      if (collection.createdById !== user.id) {
        userOwnsAllSources = false;
        break;
      }
    }

    // Determine main owner (target collection owner or first source collection owner)
    let mainOwnerId = sourceCollections[0].createdById;
    if (targetCollectionId) {
      const targetCollection = await Collection.findByPk(targetCollectionId, { transaction });
      if (targetCollection && targetCollection.createdById) {
        mainOwnerId = targetCollection.createdById;
      }
    }

    if (userOwnsAllSources) {
      // Immediate merge
      await collectionMerger(ctx, {
        mergeRequest,
        user,
        transaction,
      });

      // Notify requester that the merge has been completed
      await Notification.create(
        {
          event: NotificationEventType.CollectionMergeCompleted,
          userId: user.id,
          actorId: user.id,
          teamId: user.teamId,
          collectionId: targetCollectionId || sourceCollections[0].id,
          data: {
            mergeRequestId: mergeRequest.id,
          },
        },
        { transaction }
      );
    } else {
      // Create notifications for all unique owners (excluding the requester)
      const uniqueOwnerIds = new Set<string>();
      for (const collection of sourceCollections) {
        if (collection.createdById && collection.createdById !== user.id) {
          uniqueOwnerIds.add(collection.createdById);
        }
      }

      if (targetCollectionId) {
        const targetCollection = await Collection.findByPk(targetCollectionId, { transaction });
        if (targetCollection && targetCollection.createdById && targetCollection.createdById !== user.id) {
          uniqueOwnerIds.add(targetCollection.createdById);
        }
      }

      await Promise.all(
        Array.from(uniqueOwnerIds).map((ownerId) =>
          Notification.create(
            {
              event: NotificationEventType.CollectionMergePending,
              userId: ownerId,
              actorId: user.id,
              teamId: user.teamId,
              collectionId: targetCollectionId || sourceCollections[0].id,
              data: {
                mergeRequestId: mergeRequest.id,
              },
            },
            { transaction }
          )
        )
      );

      // Notify requester that the request has been created
      await Notification.create(
        {
          event: NotificationEventType.CollectionMergePending,
          userId: user.id,
          actorId: user.id,
          teamId: user.teamId,
          collectionId: targetCollectionId || sourceCollections[0].id,
          data: {
            mergeRequestId: mergeRequest.id,
          },
        },
        { transaction }
      );
    }

    ctx.body = {
      data: await presentCollectionMergeRequest(ctx, mergeRequest),
    };
  }
);

router.post(
  "collections.mergeRequest.list",
  auth(),
  validate(T.CollectionsMergeRequestListSchema),
  pagination(),
  async (ctx: APIContext<T.CollectionsMergeRequestListReq>) => {
    const { user } = ctx.state.auth;
    const { status } = ctx.input.body;
    const { offset, limit } = ctx.state.pagination;

    const where: any = {
      teamId: user.teamId,
    };

    if (status) {
      where.status = status;
    }

    const mergeRequests = await CollectionMergeRequest.findAndCountAll({
      where,
      include: [
        {
          model: Collection,
          as: "targetCollection",
        },
        {
          model: User,
          as: "requestedBy",
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: await Promise.all(
        mergeRequests.rows.map((req) => presentCollectionMergeRequest(ctx, req))
      ),
    };
  }
);

router.post(
  "collections.mergeRequest.approve",
  auth(),
  validate(T.CollectionsMergeRequestApproveSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsMergeRequestApproveReq>) => {
    const { transaction } = ctx.state;
    const { requestId, collectionId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const mergeRequest = await CollectionMergeRequest.findByPk(requestId, {
      include: [
        {
          model: Collection,
          as: "targetCollection",
        },
      ],
      transaction,
      rejectOnEmpty: true,
    });

    if (mergeRequest.teamId !== user.teamId) {
      throw InvalidRequestError("Merge request not found");
    }

    if (mergeRequest.status !== MergeRequestStatus.Pending) {
      throw InvalidRequestError("Merge request is not pending");
    }

    // Verify user is owner of the collection
    const collection = await Collection.findByPk(collectionId, {
      transaction,
      rejectOnEmpty: true,
    });

    if (collection.createdById !== user.id && !user.isAdmin) {
      throw InvalidRequestError(
        "Only collection owner can approve merge request"
      );
    }

    if (!mergeRequest.sourceCollectionIds.includes(collectionId)) {
      throw InvalidRequestError("Collection is not part of this merge request");
    }

    // Add approval
    const approvals = { ...mergeRequest.approvals };
    approvals[collectionId] = {
      userId: user.id,
      approvedAt: new Date().toISOString(),
    };

    mergeRequest.approvals = approvals;

    // Check if all owners have approved
    const sourceCollections = await Collection.findAll({
      where: {
        id: mergeRequest.sourceCollectionIds,
      },
      transaction,
    });

    const allOwnerIds = new Set<string>();
    for (const col of sourceCollections) {
      if (col.createdById) {
        allOwnerIds.add(col.createdById);
      }
    }

    const approvedOwnerIds = new Set(
      Object.values(approvals).map((a) => a.userId)
    );

    // If all owners approved, change status to approved and execute merge
    if (
      allOwnerIds.size > 0 &&
      Array.from(allOwnerIds).every((id) => approvedOwnerIds.has(id))
    ) {
      mergeRequest.status = MergeRequestStatus.Approved;

      // Execute merge immediately
      await collectionMerger(ctx, {
        mergeRequest,
        user,
        transaction,
      });

      // Notify initiator
      await Notification.create(
        {
          event: NotificationEventType.CollectionMergeCompleted,
          userId: mergeRequest.requestedById,
          actorId: user.id,
          teamId: user.teamId,
          collectionId: mergeRequest.targetCollectionId || mergeRequest.sourceCollectionIds[0],
          data: {
            mergeRequestId: mergeRequest.id,
          },
        },
        { transaction }
      );

      // Notify all owners
      await Promise.all(
        Array.from(allOwnerIds).map((ownerId) => {
          if (ownerId === user.id) return; // Don't notify the approver themselves if they are an owner
          return Notification.create(
            {
              event: NotificationEventType.CollectionMergeCompleted,
              userId: ownerId,
              actorId: user.id,
              teamId: user.teamId,
              collectionId: mergeRequest.targetCollectionId || mergeRequest.sourceCollectionIds[0],
              data: {
                mergeRequestId: mergeRequest.id,
              },
            },
            { transaction }
          );
        })
      );
    }

    await mergeRequest.save({ transaction });

    ctx.body = {
      data: await presentCollectionMergeRequest(ctx, mergeRequest),
    };
  }
);

router.post(
  "collections.mergeRequest.reject",
  auth(),
  validate(T.CollectionsMergeRequestRejectSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsMergeRequestRejectReq>) => {
    const { transaction } = ctx.state;
    const { requestId, collectionId, reason } = ctx.input.body;
    const { user } = ctx.state.auth;

    const mergeRequest = await CollectionMergeRequest.findByPk(requestId, {
      transaction,
      rejectOnEmpty: true,
    });

    if (mergeRequest.teamId !== user.teamId) {
      throw InvalidRequestError("Merge request not found");
    }

    if (mergeRequest.status !== MergeRequestStatus.Pending) {
      throw InvalidRequestError("Merge request is not pending");
    }

    // Verify user is owner of the collection
    const collection = await Collection.findByPk(collectionId, {
      transaction,
      rejectOnEmpty: true,
    });

    if (collection.createdById !== user.id && !user.isAdmin) {
      throw InvalidRequestError(
        "Only collection owner can reject merge request"
      );
    }

    // Add rejection
    const rejections = { ...mergeRequest.rejections };
    rejections[collectionId] = {
      userId: user.id,
      rejectedAt: new Date().toISOString(),
      reason: reason || undefined,
    };

    mergeRequest.rejections = rejections;
    mergeRequest.status = MergeRequestStatus.Rejected;

    await mergeRequest.save({ transaction });

    // Notify initiator about rejection
    await Notification.create(
      {
        event: NotificationEventType.CollectionMergeRejected,
        userId: mergeRequest.requestedById,
        actorId: user.id,
        teamId: user.teamId,
        collectionId: mergeRequest.targetCollectionId || mergeRequest.sourceCollectionIds[0],
        data: {
          mergeRequestId: mergeRequest.id,
        },
      },
      { transaction }
    );

    ctx.body = {
      data: await presentCollectionMergeRequest(ctx, mergeRequest),
    };
  }
);

router.post(
  "collections.mergeRequest.execute",
  auth(),
  validate(T.CollectionsMergeRequestExecuteSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsMergeRequestExecuteReq>) => {
    const { transaction } = ctx.state;
    const { requestId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const mergeRequest = await CollectionMergeRequest.findByPk(requestId, {
      transaction,
      rejectOnEmpty: true,
    });

    if (mergeRequest.teamId !== user.teamId) {
      throw InvalidRequestError("Merge request not found");
    }

    if (mergeRequest.status !== MergeRequestStatus.Approved) {
      throw InvalidRequestError("Merge request must be approved by all owners");
    }

    // Execute merge
    const result = await collectionMerger(ctx, {
      mergeRequest,
      user,
      transaction,
    });

    ctx.body = {
      data: {
        collection: await presentCollection(ctx, result.mergedCollection),
        documents: await Promise.all(
          result.documents.map((doc) => presentDocument(ctx, doc))
        ),
      },
    };
  }
);

export default router;
