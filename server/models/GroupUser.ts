import {
  DefaultScope,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import Group from "./Group";
import User from "./User";
import Model from "./base/Model";
import Fix from "./decorators/Fix";

@DefaultScope(() => ({
  include: [
    {
      association: "user",
    },
  ],
}))
@Scopes(() => ({
  withGroup: {
    include: [
      {
        association: "group",
      },
    ],
  },
  withUser: {
    include: [
      {
        association: "user",
      },
    ],
  },
}))
@Table({ tableName: "group_users", modelName: "group_user", paranoid: true })
@Fix
class GroupUser extends Model {
  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Group, "groupId")
  group: Group;

  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;
}

export default GroupUser;
