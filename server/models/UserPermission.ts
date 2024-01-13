import { Op } from "sequelize";
import {
  Column,
  ForeignKey,
  BelongsTo,
  Default,
  IsIn,
  Table,
  DataType,
  Scopes,
  AllowNull,
} from "sequelize-typescript";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

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
class UserPermission extends IdModel {
  @Default(CollectionPermission.ReadWrite)
  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission | DocumentPermission;

  @AllowNull
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
  @BelongsTo(() => UserPermission, "sourceId")
  source?: UserPermission | null;

  /** If this represents the permission on a child then this points to the permission on the root */
  @ForeignKey(() => UserPermission)
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
}

export default UserPermission;
