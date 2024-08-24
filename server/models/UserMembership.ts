import {
  InferAttributes,
  InferCreationAttributes,
  Op,
  type SaveOptions,
  type FindOptions,
} from "sequelize";
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
} from "sequelize-typescript";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
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

  /** The collection that this permission grants the user access to. */
  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  /** The collection ID that this permission grants the user access to. */
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  /** The document that this permission grants the user access to. */
  @BelongsTo(() => Document, "documentId")
  document?: Document | null;

  /** The document ID that this permission grants the user access to. */
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId?: string | null;

  /** If this represents the permission on a child then this points to the permission on the root */
  @BelongsTo(() => UserMembership, "sourceId")
  source?: UserMembership | null;

  /** If this represents the permission on a child then this points to the permission on the root */
  @ForeignKey(() => UserMembership)
  @Column(DataType.UUID)
  sourceId?: string | null;

  /** The user that this permission is granted to. */
  @BelongsTo(() => User, "userId")
  user: User;

  /** The user ID that this permission is granted to. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  /** The user that created this permission. */
  @BelongsTo(() => User, "createdById")
  createdBy: User;

  /** The user ID that created this permission. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

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
            sourceId: model.id,
          },
          transaction,
        }
      );
    }
  }

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
        sourceId: model.id,
      },
      transaction,
    });

    const document = await Document.unscoped().findOne({
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
        }
      );
    }
  }
}

export default UserMembership;
