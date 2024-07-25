import {
  InferAttributes,
  InferCreationAttributes,
  Op,
  type SaveOptions,
  type FindOptions,
} from "sequelize";
import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Table,
  DataType,
  Scopes,
  AfterCreate,
  AfterUpdate,
} from "sequelize-typescript";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import Group from "./Group";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";

/**
 * Represents a group's permission to access a collection or document.
 */
@Scopes(() => ({
  withGroup: {
    include: [
      {
        association: "group",
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
@Table({ tableName: "group_permissions", modelName: "group_permission" })
@Fix
class GroupMembership extends ParanoidModel<
  InferAttributes<GroupMembership>,
  Partial<InferCreationAttributes<GroupMembership>>
> {
  @Default(CollectionPermission.ReadWrite)
  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission | DocumentPermission;

  // associations

  /** The collection that this permission grants the group access to. */
  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  /** The collection ID that this permission grants the group access to. */
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  /** The document that this permission grants the group access to. */
  @BelongsTo(() => Document, "documentId")
  document?: Document | null;

  /** The document ID that this permission grants the group access to. */
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId?: string | null;

  /** If this represents the permission on a child then this points to the permission on the root */
  @BelongsTo(() => GroupMembership, "sourceId")
  source?: GroupMembership | null;

  /** If this represents the permission on a child then this points to the permission on the root */
  @ForeignKey(() => GroupMembership)
  @Column(DataType.UUID)
  sourceId?: string | null;

  /** The group that this permission is granted to. */
  @BelongsTo(() => Group, "groupId")
  group: Group;

  /** The group ID that this permission is granted to. */
  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string;

  /** The user that created this permission. */
  @BelongsTo(() => User, "createdById")
  createdBy: User;

  /** The user ID that created this permission. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  /**
   * Find the root membership for a document and (optionally) group.
   *
   * @param documentId The document ID to find the membership for.
   * @param groupId The group ID to find the membership for.
   * @param options Additional options to pass to the query.
   * @returns A promise that resolves to the root memberships for the document and group, or null.
   */
  static async findRootMembershipsForDocument(
    documentId: string,
    groupId?: string,
    options?: FindOptions<GroupMembership>
  ): Promise<GroupMembership[]> {
    const memberships = await this.findAll({
      where: {
        documentId,
        ...(groupId ? { groupId } : {}),
      },
    });

    const rootMemberships = await Promise.all(
      memberships.map((membership) =>
        membership?.sourceId
          ? this.findByPk(membership.sourceId, options)
          : membership
      )
    );

    return rootMemberships.filter(Boolean) as GroupMembership[];
  }

  @AfterUpdate
  static async updateSourcedMemberships(
    model: GroupMembership,
    options: SaveOptions<GroupMembership>
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
    model: GroupMembership,
    options: SaveOptions<GroupMembership>
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
    model: GroupMembership,
    options: SaveOptions<GroupMembership>
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
          groupId: model.groupId,
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

export default GroupMembership;
