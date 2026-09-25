import type {
  CreateOptions,
  DestroyOptions,
  InferAttributes,
  InferCreationAttributes,
  Transaction,
} from "sequelize";
import {
  AfterCreate,
  AfterDestroy,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import { GroupPermission } from "@shared/types";
import Document from "./Document";
import Group from "./Group";
import User from "./User";
import Model from "./base/Model";

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
class GroupUser extends Model<
  InferAttributes<GroupUser>,
  Partial<InferCreationAttributes<GroupUser>>
> {
  static eventNamespace = "groups";

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

  @Column(DataType.ENUM(...Object.values(GroupPermission)))
  permission: GroupPermission;

  get modelId() {
    return this.groupId;
  }

  // hooks

  /**
   * Updates the group timestamp and invalidates document membership IDs after a user joins.
   *
   * @param model - the new group membership.
   * @param options - the creation options, including the transaction.
   * @returns a promise that resolves when the updates are complete.
   */
  @AfterCreate
  static async handleMembershipCreated(
    model: GroupUser,
    options: CreateOptions<GroupUser>
  ) {
    await this.touchGroup(model, options.transaction);
    await Document.invalidateMembershipDocumentIds([model.userId]);
  }

  /**
   * Updates the group timestamp and invalidates document membership IDs after a user leaves.
   *
   * @param model - the removed group membership.
   * @param options - the deletion options, including the transaction.
   * @returns a promise that resolves when the updates are complete.
   */
  @AfterDestroy
  static async handleMembershipDestroyed(
    model: GroupUser,
    options: DestroyOptions<GroupUser>
  ) {
    await this.touchGroup(model, options.transaction);
    await Document.invalidateMembershipDocumentIds([model.userId]);
  }

  private static async touchGroup(
    model: GroupUser,
    transaction?: Transaction | null
  ) {
    // Sequelize skips bulk updates when updatedAt is the only value.
    await model.sequelize
      .getQueryInterface()
      .bulkUpdate(
        Group.getTableName(),
        { updatedAt: new Date() },
        { id: model.groupId },
        { transaction }
      );
  }
}

export default GroupUser;
