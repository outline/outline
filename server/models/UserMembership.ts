import {
  InferAttributes,
  InferCreationAttributes,
  Op,
  type SaveOptions,
  type FindOptions,
} from "sequelize";
import { WhereOptions } from "sequelize";
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
import { APIContext } from "@server/types";
import Collection from "./Collection";
import Document from "./Document";
import GroupMembership from "./GroupMembership";
import User from "./User";
import IdModel from "./base/IdModel";
import { HookContext } from "./base/Model";
import Fix from "./decorators/Fix";

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
@Fix
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
  @Column
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
          : membership
      )
    );

    return rootMemberships.filter(Boolean) as UserMembership[];
  }

  // hooks

  @AfterCreate
  static async createSourcedMemberships(
    model: UserMembership,
    options: SaveOptions<UserMembership>
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

  /**
   * Recreate all sourced permissions for a given permission.
   */
  static async recreateSourcedMemberships(
    model: UserMembership,
    options: SaveOptions<UserMembership>
  ) {
    if (!model.documentId) {
      return;
    }
    const { transaction } = options;

    await this.destroy({
      where: {
        userId: model.userId,
        sourceId: model.id,
      },
      transaction,
    });

    const document = await Document.unscoped()
      .scope("withoutState")
      .findOne({
        attributes: ["id"],
        where: {
          id: model.documentId,
        },
        transaction,
      });
    if (!document) {
      return;
    }

    const childDocumentIds = await document.findAllChildDocumentIds(
      {
        publishedAt: {
          [Op.ne]: null,
        },
      },
      {
        transaction,
      }
    );

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
      event: { name, data, create: true },
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
