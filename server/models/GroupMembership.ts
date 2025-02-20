import {
  InferAttributes,
  InferCreationAttributes,
  Op,
  type SaveOptions,
  type FindOptions,
  type DestroyOptions,
  type WhereOptions,
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
  AfterDestroy,
  BeforeDestroy,
  BeforeUpdate,
} from "sequelize-typescript";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import { ValidationError } from "@server/errors";
import { APIContext } from "@server/types";
import Collection from "./Collection";
import Document from "./Document";
import Group from "./Group";
import User from "./User";
import UserMembership from "./UserMembership";
import { type HookContext } from "./base/Model";
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
  /** The permission granted to the group. */
  @Default(CollectionPermission.ReadWrite)
  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission | DocumentPermission;

  // associations

  /** The collection that this membership grants the group access to. */
  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  /** The collection ID that this membership grants the group access to. */
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  /** The document that this membership grants the group access to. */
  @BelongsTo(() => Document, "documentId")
  document?: Document | null;

  /** The document ID that this membership grants the group access to. */
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId?: string | null;

  /** If this represents the membership on a child then this points to the membership on the root */
  @BelongsTo(() => GroupMembership, "sourceId")
  source?: GroupMembership | null;

  /** If this represents the membership on a child then this points to the membership on the root */
  @ForeignKey(() => GroupMembership)
  @Column(DataType.UUID)
  sourceId?: string | null;

  /** The group that this membership is granted to. */
  @BelongsTo(() => Group, "groupId")
  group: Group;

  /** The group ID that this membership is granted to. */
  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string;

  /** The user that created this membership. */
  @BelongsTo(() => User, "createdById")
  createdBy: User;

  /** The user ID that created this membership. */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  get modelId() {
    return this.groupId;
  }

  // static methods

  /**
   * Copy group memberships from one document to another.
   *
   * @param where The where clause to find the group memberships to copy.
   * @param document The document to copy the group memberships to.
   * @param options Additional options to pass to the query.
   */
  public static async copy(
    where: WhereOptions<GroupMembership>,
    document: Document,
    options: SaveOptions
  ) {
    const { transaction } = options;
    const groupMemberships = await this.findAll({
      where,
      transaction,
    });
    await Promise.all(
      groupMemberships.map((membership) =>
        this.create(
          {
            documentId: document.id,
            groupId: membership.groupId,
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
   * Find the root membership for a document and (optionally) group.
   *
   * @param documentId The document ID to find the membership for.
   * @param groupId The group ID to find the membership for.
   * @param options Additional options to pass to the query.
   * @returns A promise that resolves to the root memberships for the document and group, or null.
   */
  public static async findRootMembershipsForDocument(
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

  // hooks

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

  @AfterCreate
  static async publishAddGroupEventAfterCreate(
    model: GroupMembership,
    context: APIContext["context"]
  ) {
    await model.insertEvent(context, "add_group", {
      membershipId: model.id,
      isNew: true,
    });
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
            groupId: model.groupId,
            sourceId: model.id,
          },
          transaction,
        }
      );
    }
  }

  @BeforeUpdate
  static async checkLastAdminBeforeUpdate(
    model: GroupMembership,
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
    model: GroupMembership,
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
  static async publishAddGroupEventAfterUpdate(
    model: GroupMembership,
    context: APIContext["context"]
  ) {
    await model.insertEvent(context, "add_group", {
      membershipId: model.id,
      isNew: false,
    });
  }

  @AfterDestroy
  static async destroySourcedMemberships(
    model: GroupMembership,
    options: DestroyOptions<GroupMembership>
  ) {
    if (model.sourceId || !model.documentId) {
      return;
    }

    const { transaction } = options;
    await this.destroy({
      where: {
        groupId: model.groupId,
        sourceId: model.id,
      },
      transaction,
    });
  }

  @AfterDestroy
  static async publishRemoveGroupEvent(
    model: GroupMembership,
    context: APIContext["context"]
  ) {
    await model.insertEvent(context, "remove_group", {
      membershipId: model.id,
    });
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
        groupId: model.groupId,
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
          groupId: model.groupId,
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
    data: Record<string, unknown>
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
    model: GroupMembership,
    { transaction }: APIContext["context"]
  ) {
    const [userMemberships, groupMemberships] = await Promise.all([
      UserMembership.count({
        where: {
          collectionId: model.collectionId,
          permission: CollectionPermission.Admin,
        },
        transaction,
      }),
      this.count({
        where: {
          collectionId: model.collectionId,
          permission: CollectionPermission.Admin,
        },
        transaction,
      }),
    ]);

    if (userMemberships === 0 && groupMemberships === 1) {
      throw ValidationError(
        "At least one user or group must have manage permissions"
      );
    }
  }
}

export default GroupMembership;
