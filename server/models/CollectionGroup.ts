import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Model,
  Table,
} from "sequelize-typescript";
import Collection from "./Collection";
import Group from "./Group";
import User from "./User";

@Table({ tableName: "collection_groups", modelName: "collection_group" })
class CollectionGroup extends Model {
  @Default("read_write")
  @IsIn([["read", "read_write", "maintainer"]])
  permission: string;

  // associations

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column
  collectionId: string;

  @BelongsTo(() => Group, "groupId")
  group: Group;

  @ForeignKey(() => Group)
  @Column
  groupId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;
}

export default CollectionGroup;
