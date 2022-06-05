import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Table,
  DataType,
} from "sequelize-typescript";
import Collection from "./Collection";
import Group from "./Group";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "collection_groups", modelName: "collection_group" })
@Fix
class CollectionGroup extends BaseModel {
  @Default("read_write")
  @IsIn([["read", "read_write", "maintainer"]])
  @Column
  permission: string;

  // associations

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => Group, "groupId")
  group: Group;

  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;
}

export default CollectionGroup;
