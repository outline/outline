import {
  Column,
  ForeignKey,
  BelongsTo,
  Default,
  IsIn,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import { CollectionPermission } from "@shared/types";
import Collection from "./Collection";
import User from "./User";
import Model from "./base/Model";
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
    include: [
      {
        association: "collection",
      },
    ],
  },
}))
@Table({ tableName: "user_permissions", modelName: "user_permission" })
@Fix
class CollectionUser extends Model {
  @Default(CollectionPermission.ReadWrite)
  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission;

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
