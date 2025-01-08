import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DefaultScope,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  DataType,
  Scopes,
  AfterCreate,
  AfterDestroy,
} from "sequelize-typescript";
import Group from "./Group";
import User from "./User";
import Model, { type HookContext } from "./base/Model";
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
@Table({ tableName: "group_users", modelName: "group_user" })
@Fix
class GroupUser extends Model<
  InferAttributes<GroupUser>,
  Partial<InferCreationAttributes<GroupUser>>
> {
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

  get modelId() {
    return this.groupId;
  }

  // hooks

  @AfterCreate
  public static async publishAddUserEvent(
    model: GroupUser,
    context: HookContext
  ) {
    await Group.insertEvent("add_user", model, context);
  }

  @AfterDestroy
  public static async publishRemoveUserEvent(
    model: GroupUser,
    context: HookContext
  ) {
    await Group.insertEvent("remove_user", model, context);
  }
}

export default GroupUser;
