import {
  DefaultScope,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
} from "sequelize-typescript";
import Group from "./Group";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";

@DefaultScope(() => ({
  include: [
    {
      association: "user",
    },
  ],
}))
@Table({ tableName: "group_users", modelName: "group_user" })
class GroupUser extends ParanoidModel {
  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => Group, "groupId")
  group: Group;

  @ForeignKey(() => Group)
  @Column
  groupId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;
}

export default GroupUser;
