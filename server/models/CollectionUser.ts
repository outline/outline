import {
  Column,
  ForeignKey,
  BelongsTo,
  Default,
  IsIn,
  Table,
} from "sequelize-typescript";
import Collection from "./Collection";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "collection_users", modelName: "collection_user" })
class CollectionUser extends BaseModel {
  @Column
  @Default("read_write")
  @IsIn([["read", "read_write", "maintainer"]])
  permission: string;

  // associations

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column
  collectionId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;
}

export default CollectionUser;
