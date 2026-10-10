import fractionalIndex from "fractional-index";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { Op, Sequelize, type SaveOptions, type FindOptions } from "sequelize";
import type { WhereOptions } from "sequelize";
import {
  Column,
  ForeignKey,
  BelongsTo,
  Default,
  IsIn,
  Table,
  DataType,
  Scopes,
  AfterCreate,
  AfterUpdate,
  Length,
  AfterDestroy,
  BeforeDestroy,
  BeforeUpdate,
} from "sequelize-typescript";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import { ValidationError } from "@server/errors";
import { LockHelper } from "@server/storage/LockHelper";
import type { APIContext } from "@server/types";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import Collection from "./Collection";
import Document from "./Document";
import GroupMembership from "./GroupMembership";
import User from "./User";
import IdModel from "./base/IdModel";
import type { HookContext } from "./base/Model";

/**
 * Represents a users's permission to access a collection or document.
 */
@Scopes(() => ({
  withUser: {
    include: [
      {
        association: "user",
      },
    ],
  },
  withCollection: {
    where: {
      collectionId: {
        [Op.ne]: null,
      },
    },
    include: [
      {
        association: "collection",
      },
    ],
  },
  withDocument: {
    where: {
      documentId: {
        [Op.ne]: null,
      },
    },
    include: [
      {
        association: "document",
      },
    ],
  },
}))
@Table({ tableName: "user_permissions", modelName: "user_permission" })
class UserMembership extends IdModel<
  InferAttributes<UserMembership>,
  Partial<InferCreationAttributes<UserMembership>>
> {
  /** The permission granted to the user. */
  @Default(CollectionPermission.ReadWrite)
  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission | DocumentPermission;

  /** The visible sort order in "shared with me" */
  @Length({
    max: 256,
    msg: `index must be 256 characters or less`,
  })
  @Column(DataType.STRING)
  index: string | null;

  // associations

  /** The collection that this membership grants the user access to. */
  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  /** The collection ID that this membership grants the user access to. */
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  /** The document that this membership grants the user access to. */
  @BelongsTo(() => Document, "documentId")
  document?: Document | null;

  /** The document ID that this membership grants the user access to. */
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId?: string | null;

  /** If this represents the membership on a child then this points to the membership on the root */
  @BelongsTo(() => UserMembership, "sourceId")
  source?: UserMembership | null;

  /** If this represents the membership on a child then this points to the membership on the root */
  @ForeignKey(() => UserMembership)
  @Column(DataType.UUID)
  sourceId?: string | null;

  /** The user that this membership is granted to. */
  @BelongsTo(() => User, "userId")
  user: User;

  /** The user ID that this membership is granted to. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  /** The user that created this membership. */
  @BelongsTo(() => User, "createdById")
  createdBy: User;

  /** The user ID that created this membership. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  // static methods

  /**
   * Copy user memberships from one document to another.
   *
   * @param where The where clause to find the user memberships to copy.
   * @param document The document to copy the user memberships to.
   * @param options Additional options to pass to the query.
   */
  public static async copy(
    where: WhereOptions<UserMembership>,
    document: Document,
    options: SaveOptions
  ) {
    const { transaction } = options;
    const userMemberships = await this.findAll({
      where,
      transaction,
    });
    await Promise.all(
      userMemberships.map((membership) =>
        this.create(
          {
            documentId: document.id,
            userId: membership.userId,
            sourceId: membership.sourceId ?? membership.id,
            permission: membership.permission,
            createdById: membership.createdById,
          },
          { transaction, hooks: false }
        )
      )
    );
  }

  /**
   * Find the root membership for a document and (optionally) user.
   *
   * @param documentId The document ID to find the membership for.
   * @param userId The user ID to find the membership for.
   * @param options Additional options to pass to the query.
   * @returns A promise that resolves to the root memberships for the document and user, or null.
   */
  static async findRootMembershipsForDocument(
    documentId: string,
    userId?: string,
    options?: FindOptions<UserMembership>
  ): Promise<UserMembership[]> {
    const memberships = await this.findAll({
      where: {
        documentId,
        ...(userId ? { userId } : {}),
      },
    });

    const rootMemberships = await Promise.all(
      memberships.map((membership) =>
        membership?.sourceId
          ? this.findByPk(membership.sourceId, options)
          : Promise.resolve(membership)
      )
    );

    return rootMemberships.filter(Boolean) as UserMembership[];
  }

  /**
   * Find or create the membership that orders a personal document in its
   * owner's sidebar. Access is granted by the document's personalOwnerId, so
   * this record carries sort position rather than permission – a missing one
   * sorts the document last, it does not hide it.
   *
   * @param document The personal document to create the membership for.
   * @param userId The owner of the personal space the document lives in.
   * @param ctx The hook context the document was saved with.
   * @returns A promise that resolves to the membership.
   */
  static async findOrCreateForPersonalDocument(
    document: Document,
    userId: string,
    ctx: HookContext
  ): Promise<UserMembership> {
    const { transaction } = ctx;

    const existing = await this.findOne({
      where: {
        documentId: document.id,
        userId,
        sourceId: null,
      },
      transaction,
    });

    if (existing) {
      return existing;
    }

    // Scoped to the owner's personal documents so that a new one sorts after
    // the last of those, rather than after the last document shared with them.
    const last = await this.findOne({
      where: {
        userId,
        index: {
          [Op.ne]: null,
        },
      },
      include: [
        {
          model: Document,
          as: "document",
          required: true,
          attributes: [],
          where: { personalOwnerId: userId },
        },
      ],
      attributes: ["id", "index", "updatedAt"],
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        Sequelize.literal('"user_permission"."index" collate "C" DESC'),
        ["updatedAt", "ASC"],
      ],
      transaction,
    });

    return this.create(
      {
        documentId: document.id,
        userId,
        index: fractionalIndex(last?.index ?? null, null),
        permission: DocumentPermission.Admin,
        // the record belongs to the owner's own sidebar, so they own it even
        // when somebody else's action created it
        createdById: userId,
      },
      // Only the context is carried over. The save options of the document
      // that triggered this include its own `fields`, which would restrict
      // which columns of this record are written.
      { auth: ctx.auth, ip: ctx.ip, transaction }
    );
  }

  // hooks

  @AfterCreate
  static async createSourcedMemberships(
    model: UserMembership,
    options: SaveOptions<UserMembership> & { documentId?: string }
  ) {
    if (model.sourceId || !model.documentId) {
      return;
    }

    return this.recreateSourcedMemberships(model, options);
  }

  @AfterCreate
  static async publishAddUserEventAfterCreate(
    model: UserMembership,
    context: APIContext["context"]
  ) {
    await model.insertEvent(context, "add_user", {
      isNew: true,
    });
  }

  @AfterCreate
  static async invalidateCollectionIdsAfterCreate(model: UserMembership) {
    if (model.collectionId) {
      await CacheHelper.clearData(
        RedisPrefixHelper.getUserCollectionIdsKey(model.userId)
      );
    }
  }

  @AfterCreate
  static async invalidateDocumentIdsAfterCreate(model: UserMembership) {
    if (model.documentId) {
      await Document.invalidateMembershipDocumentIds([model.userId]);
    }
  }

  @AfterUpdate
  static async updateSourcedMemberships(
    model: UserMembership,
    options: SaveOptions<UserMembership>
  ) {
    if (model.sourceId || !model.documentId) {
      return;
    }

    const { transaction } = options;

    if (model.changed("permission")) {
      await this.update(
        {
          permission: model.permission,
        },
        {
          where: {
            userId: model.userId,
            sourceId: model.id,
          },
          transaction,
        }
      );
    }
  }

  @BeforeUpdate
  static async checkLastAdminBeforeUpdate(
    model: UserMembership,
    ctx: APIContext["context"]
  ) {
    if (
      model.permission === CollectionPermission.Admin ||
      model.previous("permission") !== CollectionPermission.Admin ||
      !model.collectionId
    ) {
      return;
    }
    await this.validateLastAdminPermission(model, ctx);
  }

  @BeforeDestroy
  static async checkLastAdminBeforeDestroy(
    model: UserMembership,
    ctx: APIContext["context"]
  ) {
    // Only check for last admin permission if this permission is admin
    if (
      model.permission !== CollectionPermission.Admin ||
      !model.collectionId
    ) {
      return;
    }
    await this.validateLastAdminPermission(model, ctx);
  }

  @AfterUpdate
  static async publishAddUserEventAfterUpdate(
    model: UserMembership,
    context: APIContext["context"]
  ) {
    await model.insertEvent(context, "add_user", {
      isNew: false,
    });
  }

  @AfterDestroy
  static async publishRemoveUserEvent(
    model: UserMembership,
    context: APIContext["context"]
  ) {
    await model.insertEvent(context, "remove_user");
  }

  @AfterDestroy
  static async invalidateCollectionIdsAfterDestroy(model: UserMembership) {
    if (model.collectionId) {
      await CacheHelper.clearData(
        RedisPrefixHelper.getUserCollectionIdsKey(model.userId)
      );
    }
  }

  @AfterDestroy
  static async invalidateDocumentIdsAfterDestroy(model: UserMembership) {
    if (model.documentId) {
      await Document.invalidateMembershipDocumentIds([model.userId]);
    }
  }

  /**
   * Recreate all sourced permissions for a given permission.
   */
  static async recreateSourcedMemberships(
    model: UserMembership,
    options: SaveOptions<UserMembership> & { documentId?: string }
  ) {
    if (!model.documentId) {
      return;
    }
    const { transaction, documentId } = options;

    const document = await Document.unscoped()
      .scope("withoutState")
      .findOne({
        attributes: ["id"],
        where: {
          id: documentId ?? model.documentId,
        },
        transaction,
      });

    if (!document) {
      return;
    }

    const childDocumentIds = [
      ...(documentId ? [documentId] : []),
      ...(await document.findAllChildDocumentIds(
        {
          publishedAt: {
            [Op.ne]: null,
          },
        },
        {
          transaction,
        }
      )),
    ];

    if (childDocumentIds.length) {
      await this.destroy({
        where: {
          userId: model.userId,
          sourceId: model.id,
          documentId: {
            [Op.in]: childDocumentIds,
          },
        },
        transaction,
      });
    }

    for (const childDocumentId of childDocumentIds) {
      await this.create(
        {
          documentId: childDocumentId,
          userId: model.userId,
          permission: model.permission,
          sourceId: model.id,
          createdById: model.createdById,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
        },
        {
          transaction,
          hooks: false,
        }
      );
    }
  }

  private async insertEvent(
    ctx: APIContext["context"],
    name: string,
    data?: Record<string, unknown>
  ) {
    const hookContext = {
      ...ctx,
      event: { name, data, publish: true },
    } as HookContext;

    if (this.collectionId) {
      await Collection.insertEvent(name, this, hookContext);
    } else {
      await Document.insertEvent(name, this, hookContext);
    }
  }

  private static async validateLastAdminPermission(
    model: UserMembership,
    { transaction }: APIContext["context"]
  ) {
    // Both models guard the same invariant, so they share one lock name,
    // otherwise the last user manager and the last group manager can be
    // removed at the same time.
    await LockHelper.acquire(
      model.sequelize,
      `collectionAdmins:${model.collectionId}`,
      transaction
    );

    const [userMemberships, groupMemberships] = await Promise.all([
      this.count({
        where: {
          collectionId: model.collectionId,
          permission: CollectionPermission.Admin,
        },
        transaction,
      }),
      GroupMembership.count({
        where: {
          collectionId: model.collectionId,
          permission: CollectionPermission.Admin,
        },
        transaction,
      }),
    ]);

    if (userMemberships === 1 && groupMemberships === 0) {
      throw ValidationError(
        "At least one user or group must have manage permissions"
      );
    }
  }
}

export default UserMembership;
