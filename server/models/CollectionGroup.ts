import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Model,
  Table,
  DataType,
} from "sequelize-typescript";
import Collection from "./Collection";
import Group from "./Group";
import User from "./User";

@Table({ tableName: "collection_groups", modelName: "collection_group" })
class CollectionGroup extends Model {
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
