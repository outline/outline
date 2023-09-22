import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import { CollectionPermission } from "@shared/types";
import Collection from "./Collection";
import Group from "./Group";
import User from "./User";
import Model from "./base/Model";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withGroup: {
    include: [
      {
        association: "group",
      },
    ],
  },
  withCollection: {
    include: [
      {
        model: Collection,
        as: "collection",
        where: {
          collectionId: {
            [Op.ne]: null,
          },
        },
      },
    ],
  },
}))
@Table({ tableName: "group_permissions", modelName: "group_permission" })
@Fix
class CollectionGroup extends Model {
  @Default(CollectionPermission.ReadWrite)
  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission;

  // associations

  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @BelongsTo(() => Group, "groupId")
  group: Group;

  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;
}

export default CollectionGroup;
