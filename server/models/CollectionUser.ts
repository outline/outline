import {
  Column,
  ForeignKey,
  BelongsTo,
  Default,
  IsIn,
  Table,
  DataType,
  Model,
} from "sequelize-typescript";
import Collection from "./Collection";
import User from "./User";
import Fix from "./decorators/Fix";

@Table({ tableName: "collection_users", modelName: "collection_user" })
@Fix
class CollectionUser extends Model {
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

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;
}

export default CollectionUser;
