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
  PrimaryKey,
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

  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  @PrimaryKey
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @BelongsTo(() => Document, "documentId")
  document?: Document | null;

  @PrimaryKey
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId?: string | null;

  @BelongsTo(() => User, "userId")
  user: User;

  @PrimaryKey
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  // methods
  getId() {
    return `${this.userId}-${this.documentId}`;
  }
}

export default UserPermission;
