import Router from "@koa/router";
import { randomUUID } from "node:crypto";
import { truncate } from "es-toolkit/compat";
import type { WhereOptions } from "sequelize";
import { Sequelize, Op } from "sequelize";
import type { Filter } from "@shared/helpers/FilterHelper";
import {
  CollectionPermission,
  CollectionStatusFilter,
  FileOperationFormat,
  ImportState,
  IntegrationService,
  NavigationNodeType,
  type NavigationNode,
  UserRole,
} from "@shared/types";
import { ImportValidation } from "@shared/validations";
import collectionDuplicator from "@server/commands/collectionDuplicator";
import { authorizeDocumentCreate } from "@server/commands/documentCreator";
import teamUpdater from "@server/commands/teamUpdater";
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
  Attachment,
  Document,
  Event,
  Import,
  FileOperation,
} from "@server/models";
import {
  buildWhere,
  combineFilters,
  hasFieldInFilter,
} from "@server/models/helpers/Filters";
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
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { collectionIndexing } from "@server/utils/indexing";
import { QueryHelper } from "@server/storage/QueryHelper";
import pagination from "../middlewares/pagination";
import * as T from "./schema";
import { InvalidRequestError, NotFoundError } from "@server/errors";

const router = new Router();

router.post(
  "collections.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
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
      templateManagement,
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
      templateManagement,
    });

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
  "collections.duplicate",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.CollectionsDuplicateSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsDuplicateReq>) => {
    const { transaction } = ctx.state;
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });
    authorize(user, "duplicate", collection);

    const duplicated = await collectionDuplicator(ctx, {
      collection,
      name,
    });

    ctx.body = {
      data: await presentCollection(ctx, duplicated),
      policies: presentPolicies(user, [duplicated]),
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

    const documentStructure = await collection.getCachedDocumentStructure();

    ctx.body = {
      data: documentStructure || [],
    };
  }
);

router.post(
  "collections.add_link",
  auth(),
  validate(T.CollectionsAddLinkSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsAddLinkReq>) => {
    const { transaction } = ctx.state;
    const { id, parentDocumentId, title, url } = ctx.input.body;

    const collection = await loadCollectionForLink(ctx, id, parentDocumentId);
    const node: NavigationNode = {
      id: randomUUID(),
      type: NavigationNodeType.Link,
      title,
      url,
      children: [],
    };

    await collection.addLinkToStructure(node, parentDocumentId ?? undefined, {
      transaction,
    });
    await Event.createFromContext(ctx, {
      name: "collections.add_link",
      collectionId: collection.id,
      modelId: node.id,
      data: { title, url },
    });

    ctx.body = {
      data: node,
    };
  }
);

router.post(
  "collections.update_link",
  auth(),
  validate(T.CollectionsUpdateLinkSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsUpdateLinkReq>) => {
    const { transaction } = ctx.state;
    const { id, linkId, title, url } = ctx.input.body;

    const collection = await loadCollectionForExistingLink(ctx, id, linkId);
    await collection.updateLinkInStructure(
      linkId,
      { title, url },
      { transaction }
    );
    await Event.createFromContext(ctx, {
      name: "collections.update_link",
      collectionId: collection.id,
      modelId: linkId,
      data: { title, url },
    });

    ctx.body = {
      data: collection.findLinkInStructure(linkId)?.node,
    };
  }
);

router.post(
  "collections.move_link",
  auth(),
  validate(T.CollectionsMoveLinkSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsMoveLinkReq>) => {
    const { transaction } = ctx.state;
    const { id, linkId, parentDocumentId, index } = ctx.input.body;

    // The user must be able to change links at both the old and new location.
    await loadCollectionForExistingLink(ctx, id, linkId);
    const collection = await loadCollectionForLink(ctx, id, parentDocumentId);

    await collection.moveLinkInStructure(
      linkId,
      parentDocumentId ?? undefined,
      index,
      { transaction }
    );
    await Event.createFromContext(ctx, {
      name: "collections.move_link",
      collectionId: collection.id,
      modelId: linkId,
      data: { parentDocumentId, index },
    });

    ctx.body = {
      data: collection.findLinkInStructure(linkId)?.node,
    };
  }
);

router.post(
  "collections.remove_link",
  auth(),
  validate(T.CollectionsRemoveLinkSchema),
  transaction(),
  async (ctx: APIContext<T.CollectionsRemoveLinkReq>) => {
    const { transaction } = ctx.state;
    const { id, linkId } = ctx.input.body;

    const collection = await loadCollectionForExistingLink(ctx, id, linkId);
    await collection.removeLinkFromStructure(linkId, { transaction });
    await Event.createFromContext(ctx, {
      name: "collections.remove_link",
      collectionId: collection.id,
      modelId: linkId,
    });

    ctx.body = {
      success: true,
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

    const service =
      format === FileOperationFormat.MarkdownZip
        ? IntegrationService.Markdown
        : IntegrationService.JSON;

    await Import.createWithCtx(ctx, {
      name: truncate(attachment.name, {
        length: ImportValidation.maxNameLength,
      }),
      service,
      state: ImportState.Created,
      input: [
        {
          externalId: randomUUID(),
          permission: permission ?? undefined,
        },
      ],
      scratch: { storageKey: attachment.key },
      integrationId: null,
      createdById: user.id,
      teamId: user.teamId,
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
    authorize(user, "manageUsers", collection);
    authorize(user, "read", group);

    let membership = await GroupMembership.findOneForUpdate(
      { collectionId: id, groupId },
      { transaction }
    );

    if (membership) {
      if (permission !== undefined) {
        membership.permission = permission;
        await membership.save(ctx.context);
      }
    } else {
      membership = await GroupMembership.create(
        {
          collectionId: id,
          groupId,
          permission: permission ?? CollectionPermission.ReadWrite,
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
    authorize(user, "manageUsers", collection);
    authorize(user, "read", group);

    const [membership] = await collection.$get("groupMemberships", {
      where: { groupId },
      transaction,
    });

    if (!membership) {
      ctx.throw(
        InvalidRequestError("This group is not a part of the collection")
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
        name: { [Op.iLike]: QueryHelper.likeContains(query) },
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
    authorize(actor, "manageUsers", collection);
    authorize(actor, "read", user);

    let membership = await UserMembership.findOneForUpdate(
      { collectionId: id, userId },
      { transaction }
    );

    if (membership) {
      if (permission !== undefined) {
        membership.permission = permission;
        await membership.save(ctx.context);
      }
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
    authorize(actor, "manageUsers", collection);
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
        name: { [Op.iLike]: QueryHelper.likeContains(query) },
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

    const fileOperation = await FileOperation.createExport(ctx, {
      collection,
      team,
      format,
      includeAttachments,
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

    const fileOperation = await FileOperation.createExport(ctx, {
      team,
      format,
      includeAttachments,
      includePrivate,
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
      templateManagement,
      deprecatedReason,
    } = ctx.input.body;

    const updatingDeprecatedReason =
      deprecatedReason !== undefined &&
      Object.keys(ctx.input.body).every(
        (key) => key === "id" || key === "deprecatedReason"
      );

    const { user } = ctx.state.auth;
    const collection = await Collection.findByPk(id, {
      userId: user.id,
      includeArchivedBy: updatingDeprecatedReason,
      transaction,
    });
    authorize(
      user,
      updatingDeprecatedReason ? "updateDeprecatedReason" : "update",
      collection
    );

    if (deprecatedReason !== undefined) {
      authorize(user, "updateDeprecatedReason", collection);
      await collection.updateDeprecatedReason(ctx, deprecatedReason);
      ctx.body = {
        data: await presentCollection(ctx, collection),
        policies: presentPolicies(user, [collection]),
      };
      return;
    }

    // we're making this collection have no default access, ensure that the
    // current user has an admin membership so that at least they can manage it.
    if (
      permission !== undefined &&
      permission !== CollectionPermission.ReadWrite &&
      collection.permission === CollectionPermission.ReadWrite
    ) {
      const membership = await UserMembership.findOneForUpdate(
        { collectionId: collection.id, userId: user.id },
        { transaction }
      );

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

    collection.fill({
      name: name?.trim(),
      description,
      content: data,
      icon,
      color,
      permission,
      sharing,
      sort,
      commenting,
      templateManagement,
    });

    const privacyChanged = collection.changed("permission");
    const sharingChanged = collection.changed("sharing");

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
    const {
      includeListOnly,
      query,
      statusFilter,
      filters: rawFilters,
    } = ctx.input.body;
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

    // The schema rejects callers that combine `filters` with the deprecated
    // top-level params, so at most one of the two shapes is set.
    const legacyLeaves: Filter[] = [];
    if (query) {
      legacyLeaves.push({ field: "name", operator: "contains", value: query });
    }
    if (statusFilter?.includes(CollectionStatusFilter.Archived)) {
      legacyLeaves.push({ field: "archivedAt", operator: "isNotNull" });
    }
    const filter = combineFilters(rawFilters ?? legacyLeaves);

    // Results can contain archived collections once the caller targets
    // archivedAt themselves, so hydrate the archiving user for presentation.
    const includeArchived =
      filter !== undefined && hasFieldInFilter(filter, "archivedAt");

    // Exclude archived collections unless the caller targets archivedAt.
    if (statusFilter === undefined && !includeArchived) {
      where[Op.and].push({ archivedAt: { [Op.eq]: null } });
    }

    // Admins can restore any archived collection, including private ones they
    // are not a member of, so they must be able to see them listed.
    if (!user.isAdmin || !(includeListOnly || includeArchived)) {
      where[Op.and].push({ id: collectionIds });
    } else {
      where[Op.and].push({
        ownerId: { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: user.id }] },
      });
    }

    if (filter) {
      where[Op.and].push(buildWhere<Collection>(filter));
    }

    const [collections, total] = await Promise.all([
      Collection.scope([
        // Named scopes replace the default scope, so it must be applied
        // explicitly to keep the documentStructure column out of the result.
        "defaultScope",
        { method: ["withMembership", user.id] },
        ...(includeArchived ? ["withArchivedBy"] : []),
      ]).findAll({
        where,
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
    const { id, reason } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
    });

    authorize(user, "delete", collection);

    if (reason !== undefined) {
      collection.deprecatedReason = reason || null;
    }

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
    const { id, reason } = ctx.input.body;
    const { user } = ctx.state.auth;

    const collection = await Collection.findByPk(id, {
      userId: user.id,
      transaction,
      rejectOnEmpty: true,
    });

    authorize(user, "archive", collection);

    if (reason !== undefined) {
      collection.deprecatedReason = reason || null;
    }

    await collection.archiveWithCtx(ctx);

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
        deprecatedReason: null,
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
    collection.deprecatedReason = null;
    collection.changed("deprecatedReason", true);
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
      lock: transaction.LOCK.NO_KEY_UPDATE,
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

/**
 * Authorizes the user to change links at the given location, with the same
 * rules as creating a document there, and loads the collection with its
 * structure locked for update.
 *
 * @param ctx the API context.
 * @param collectionId the id of the collection.
 * @param parentDocumentId the id of the parent document, if any.
 * @returns the collection, with its documentStructure.
 */
async function loadCollectionForLink(
  ctx: APIContext,
  collectionId: string,
  parentDocumentId: string | null | undefined
) {
  const { transaction } = ctx.state;
  const { collection } = await authorizeDocumentCreate(ctx, {
    collectionId,
    parentDocumentId,
  });

  // With a parent document, the collection is resolved from the parent.
  if (collection?.id !== collectionId) {
    throw InvalidRequestError("Parent document is not in the collection");
  }

  const locked = await Collection.findByPk(collection.id, {
    includeDocumentStructure: true,
    rejectOnEmpty: true,
    transaction,
    lock: transaction.LOCK.NO_KEY_UPDATE,
  });

  if (parentDocumentId && !locked.getDocumentTree(parentDocumentId)) {
    throw InvalidRequestError("Parent document is not in the collection");
  }

  return locked;
}

/**
 * Loads the collection that contains the given link, after authorizing the
 * user to change links at its location.
 *
 * @param ctx the API context.
 * @param collectionId the id of the collection.
 * @param linkId the id of the link.
 * @returns the collection, with its documentStructure.
 * @throws NotFoundError if the link is not in the collection.
 */
async function loadCollectionForExistingLink(
  ctx: APIContext,
  collectionId: string,
  linkId: string
) {
  const { user } = ctx.state.auth;
  const existing = await Collection.findByPk(collectionId, {
    userId: user.id,
    includeDocumentStructure: true,
    transaction: ctx.state.transaction,
  });
  authorize(user, "readDocument", existing);

  const link = existing.findLinkInStructure(linkId);
  if (!link) {
    throw NotFoundError("Link not found");
  }

  const collection = await loadCollectionForLink(
    ctx,
    existing.id,
    link.parentDocumentId
  );
  if (!collection.findLinkInStructure(linkId)) {
    throw NotFoundError("Link not found");
  }
  return collection;
}

export default router;
